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
    it('PENDING 상태로 저장하고 큐 잡에 sessionId를 담아 추가한다', async () => {
      const result = await service.enqueueCopy('sess-1', { productId: 'p-1' });

      expect(result.requestId).toBeDefined();
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AiRequestType.COPY_GENERATION,
          status: AiRequestStatus.PENDING,
          input: { productId: 'p-1' },
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        AiRequestType.COPY_GENERATION,
        { requestId: result.requestId, sessionId: 'sess-1' },
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });

  describe('enqueueQa', () => {
    it('question과 topK(기본 5)를 담고 sessionId를 잡에 전달한다', async () => {
      const result = await service.enqueueQa('sess-2', { question: '노캔 헤드폰 추천' });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AiRequestType.QA,
          input: { question: '노캔 헤드폰 추천', topK: 5 },
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        AiRequestType.QA,
        { requestId: result.requestId, sessionId: 'sess-2' },
        expect.any(Object),
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
