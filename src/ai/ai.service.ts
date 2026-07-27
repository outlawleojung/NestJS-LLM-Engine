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

  async enqueueCopy(dto: CreateCopyDto): Promise<{ requestId: string }> {
    return this.enqueue(AiRequestType.COPY_GENERATION, { productId: dto.productId });
  }

  async enqueueQa(dto: CreateQaDto): Promise<{ requestId: string }> {
    return this.enqueue(AiRequestType.QA, {
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

  private async enqueue(
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
      { requestId },
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
