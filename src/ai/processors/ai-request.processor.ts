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
import { ClaudeProvider } from '../providers/claude.provider';
import { VoyageProvider } from '../providers/voyage.provider';

@Processor(AI_REQUEST_QUEUE)
export class AiRequestProcessor extends WorkerHost {
  private readonly logger = new Logger(AiRequestProcessor.name);

  constructor(
    @InjectRepository(AiRequest)
    private readonly aiRequestRepository: Repository<AiRequest>,
    private readonly productsService: ProductsService,
    private readonly claudeProvider: ClaudeProvider,
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

    const result = await this.claudeProvider.complete(keys.anthropicApiKey, {
      system,
      prompt,
      maxTokens: 1024,
    });
    await this.finalize(request, result.text, result.inputTokens, result.outputTokens, result.model);
  }

  private async processQa(request: AiRequest, keys: UserKeys): Promise<void> {
    const input = request.input as { question: string; topK: number };
    const questionEmbedding = await this.voyageProvider.embedOne(
      keys.voyageApiKey,
      input.question,
      'query',
    );
    const products = await this.productsService.searchSimilar(questionEmbedding, input.topK);

    const { system, prompt } = buildQaPrompt(input.question, products);
    const result = await this.claudeProvider.complete(keys.anthropicApiKey, {
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
