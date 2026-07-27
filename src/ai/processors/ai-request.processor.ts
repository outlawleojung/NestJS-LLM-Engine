import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';

import { ProductsService } from '../../products/products.service';
import { SessionService, UserKeys } from '../../session/session.service';
import { AI_REQUEST_QUEUE, AiRequestJobData } from '../ai.queue';
import { estimateCost } from '../cost/pricing';
import {
  AiRequest,
  AiRequestStatus,
  AiRequestType,
} from '../entities/ai-request.entity';
import { buildCopyPrompt, buildQaPrompt } from '../prompts';
import { LlmProviderFactory } from '../providers/llm-provider.factory';
import { VoyageProvider } from '../providers/voyage.provider';

// 큐 잡을 소비해 실제 LLM 호출을 수행하는 워커.
// 실패하면 BullMQ가 지수 백오프로 최대 3회 재시도 → 그래도 실패 시 onFailed에서 FAILED로 마감.
@Processor(AI_REQUEST_QUEUE)
export class AiRequestProcessor extends WorkerHost {
  private readonly logger = new Logger(AiRequestProcessor.name);

  constructor(
    @InjectRepository(AiRequest)
    private readonly aiRequestRepository: Repository<AiRequest>,
    private readonly productsService: ProductsService,
    private readonly llmFactory: LlmProviderFactory,
    private readonly voyageProvider: VoyageProvider,
    private readonly sessionService: SessionService,
  ) {
    super();
  }

  async process(job: Job<AiRequestJobData>): Promise<void> {
    const { requestId, sessionId } = job.data;
    const request = await this.aiRequestRepository.findOne({ where: { requestId } });
    if (!request) {
      this.logger.warn(`AiRequest not found for job: ${requestId}`);
      return;
    }

    await this.aiRequestRepository.update(
      { id: request.id },
      {
        status: AiRequestStatus.PROCESSING,
        retryCount: job.attemptsMade,
      },
    );

    try {
      // 세션 조회는 매 attempt마다 새로 — 재시도 사이에 만료되면 자연스럽게 실패로 이어짐.
      const keys = await this.sessionService.get(sessionId);
      if (request.type === AiRequestType.COPY_GENERATION) {
        await this.processCopyGeneration(request, keys);
      } else if (request.type === AiRequestType.QA) {
        await this.processQa(request, keys);
      } else {
        throw new Error(`Unknown AI request type: ${request.type}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`AiRequest ${requestId} failed on attempt ${job.attemptsMade}: ${message}`);
      await this.aiRequestRepository.update(
        { id: request.id },
        {
          errorMessage: message,
          retryCount: job.attemptsMade,
        },
      );
      throw error;
    }
  }

  // BullMQ는 재시도 예정인 실패에 대해서도 'failed' 이벤트를 쏘므로
  // attempts 소진된 최종 실패만 걸러 FAILED로 마감한다.
  @OnWorkerEvent('failed')
  async onFailed(job: Job<AiRequestJobData>): Promise<void> {
    if (job.attemptsMade < (job.opts.attempts ?? 1)) {
      return;
    }
    await this.aiRequestRepository.update(
      { requestId: job.data.requestId },
      { status: AiRequestStatus.FAILED },
    );
  }

  private async processCopyGeneration(request: AiRequest, keys: UserKeys): Promise<void> {
    const productId = (request.input as { productId: string }).productId;
    const product = await this.productsService.findOne(productId);
    const { system, prompt } = buildCopyPrompt(product);

    const llm = this.llmFactory.get(keys.provider);
    const result = await llm.complete(keys.llmApiKey, {
      system,
      prompt,
      maxTokens: 1024,
    });
    await this.finalize(request, result.text, result.inputTokens, result.outputTokens, result.model);
  }

  private async processQa(request: AiRequest, keys: UserKeys): Promise<void> {
    const input = request.input as { question: string; topK: number };
    // RAG 3단계 중 Retrieval — 질문을 임베딩해 pgvector로 유사 상품을 뽑는다.
    // input_type='query'는 Voyage의 asymmetric embedding 힌트 (문서와 질의를 다르게 임베딩).
    const questionEmbedding = await this.voyageProvider.embedOne(
      keys.voyageApiKey,
      input.question,
      'query',
    );
    const products = await this.productsService.searchSimilar(questionEmbedding, input.topK);

    const { system, prompt } = buildQaPrompt(input.question, products);
    const llm = this.llmFactory.get(keys.provider);
    const result = await llm.complete(keys.llmApiKey, {
      system,
      prompt,
      maxTokens: 1024,
    });
    await this.finalize(request, result.text, result.inputTokens, result.outputTokens, result.model);
  }

  private async finalize(
    request: AiRequest,
    output: string,
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): Promise<void> {
    const cost = estimateCost(model, inputTokens, outputTokens);
    await this.aiRequestRepository.update(
      { id: request.id },
      {
        status: AiRequestStatus.COMPLETED,
        output,
        inputTokens,
        outputTokens,
        cost: cost.toString(),
        completedAt: new Date(),
      },
    );
  }
}
