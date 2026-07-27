import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AiService } from './ai.service';
import { AI_REQUEST_QUEUE } from './ai.queue';
import { AiRequest, AiRequestStatus, AiRequestType } from './entities/ai-request.entity';

describe('AiService', () => {
  let service: AiService;
  let repository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => v),
    };
    queue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(AiRequest), useValue: repository },
        { provide: getQueueToken(AI_REQUEST_QUEUE), useValue: queue },
      ],
    }).compile();

    service = module.get(AiService);
  });

  describe('enqueueCopy', () => {
    it('PENDING 상태로 AiRequest를 저장하고 큐에 작업을 추가한 뒤 requestId를 반환한다', async () => {
      const result = await service.enqueueCopy({ productId: 'p-1' });

      expect(result.requestId).toBeDefined();
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AiRequestType.COPY_GENERATION,
          status: AiRequestStatus.PENDING,
          input: { productId: 'p-1' },
          requestId: result.requestId,
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        AiRequestType.COPY_GENERATION,
        { requestId: result.requestId },
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });

  describe('enqueueQa', () => {
    it('question과 topK(기본값 5)를 input에 담아 저장한다', async () => {
      await service.enqueueQa({ question: '노캔 헤드폰 추천' });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AiRequestType.QA,
          input: { question: '노캔 헤드폰 추천', topK: 5 },
        }),
      );
    });
  });

  describe('findByRequestId', () => {
    it('없으면 NotFoundException을 던진다', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      await expect(service.findByRequestId('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getUsage', () => {
    it('COMPLETED 요청의 토큰과 비용을 합산한다', async () => {
      repository.find.mockResolvedValueOnce([
        { inputTokens: 100, outputTokens: 200, cost: '0.001' },
        { inputTokens: 50, outputTokens: 25, cost: '0.0005' },
        { inputTokens: null, outputTokens: null, cost: null },
      ]);

      const usage = await service.getUsage({});

      expect(usage.requestCount).toBe(3);
      expect(usage.totalInputTokens).toBe(150);
      expect(usage.totalOutputTokens).toBe(225);
      expect(usage.totalCost).toBeCloseTo(0.0015, 6);
    });
  });
});
