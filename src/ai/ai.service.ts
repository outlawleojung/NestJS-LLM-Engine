import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { Between, Repository } from 'typeorm';

import { AI_REQUEST_QUEUE } from './ai.queue';
import { CreateCopyDto } from './dto/create-copy.dto';
import { CreateQaDto } from './dto/create-qa.dto';
import { UsageQueryDto } from './dto/usage-query.dto';
import {
  AiRequest,
  AiRequestStatus,
  AiRequestType,
} from './entities/ai-request.entity';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(AiRequest)
    private readonly aiRequestRepository: Repository<AiRequest>,
    @InjectQueue(AI_REQUEST_QUEUE)
    private readonly aiRequestQueue: Queue,
  ) {}

  async enqueueCopy(sessionId: string, dto: CreateCopyDto): Promise<{ requestId: string }> {
    return this.enqueue(sessionId, AiRequestType.COPY_GENERATION, { productId: dto.productId });
  }

  async enqueueQa(sessionId: string, dto: CreateQaDto): Promise<{ requestId: string }> {
    return this.enqueue(sessionId, AiRequestType.QA, {
      question: dto.question,
      topK: dto.topK ?? 5,
    });
  }

  async findByRequestId(requestId: string): Promise<AiRequest> {
    const request = await this.aiRequestRepository.findOne({ where: { requestId } });
    if (!request) {
      throw new NotFoundException(`AI request ${requestId} not found`);
    }
    return request;
  }

  // FAILED 요청은 토큰이 실제로 소모되지 않았을 가능성이 있어 (또는 부분 소모) COMPLETED만 집계.
  async getUsage(query: UsageQueryDto) {
    const start = query.startDate ?? new Date(0);
    const end = query.endDate ?? new Date();

    const requests = await this.aiRequestRepository.find({
      where: {
        status: AiRequestStatus.COMPLETED,
        completedAt: Between(start, end),
      },
    });

    const totalInputTokens = requests.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0);
    const totalOutputTokens = requests.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0);
    const totalCost = requests.reduce(
      (sum, r) => sum + (r.cost ? Number(r.cost) : 0),
      0,
    );

    return {
      period: { start, end },
      requestCount: requests.length,
      totalInputTokens,
      totalOutputTokens,
      totalCost: Number(totalCost.toFixed(6)),
    };
  }

  // 요청을 DB에 PENDING으로 남기고 큐에 던진 뒤 requestId를 바로 반환한다.
  // 실제 LLM 호출은 워커가 담당하므로 컨트롤러는 짧게 끝난다.
  // 잡 페이로드에 원본 키가 아닌 sessionId만 넣는 이유: Redis 잡 스토리지에 평문 키가 남는 것을 피하기 위해.
  private async enqueue(
    sessionId: string,
    type: AiRequestType,
    input: Record<string, unknown>,
  ): Promise<{ requestId: string }> {
    const requestId = randomUUID();
    await this.aiRequestRepository.save(
      this.aiRequestRepository.create({
        requestId,
        type,
        status: AiRequestStatus.PENDING,
        input,
      }),
    );
    await this.aiRequestQueue.add(
      type,
      { requestId, sessionId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
    return { requestId };
  }
}
