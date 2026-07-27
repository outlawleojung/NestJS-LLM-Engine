import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';

import { ProductsService } from '../../products/products.service';
import {
  AiRequest,
  AiRequestStatus,
  AiRequestType,
} from '../entities/ai-request.entity';
import { ClaudeProvider } from '../providers/claude.provider';
import { VoyageProvider } from '../providers/voyage.provider';
import { AiRequestProcessor } from './ai-request.processor';

type JobStub = Job<{ requestId: string }>;

function makeJob(requestId: string, attemptsMade = 0): JobStub {
  return {
    data: { requestId },
    attemptsMade,
    opts: { attempts: 3 },
  } as unknown as JobStub;
}

describe('AiRequestProcessor', () => {
  let processor: AiRequestProcessor;
  let repository: {
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let productsService: { findOne: jest.Mock; searchSimilar: jest.Mock };
  let claude: { complete: jest.Mock };
  let voyage: { embedOne: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    productsService = {
      findOne: jest.fn(),
      searchSimilar: jest.fn(),
    };
    claude = { complete: jest.fn() };
    voyage = { embedOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiRequestProcessor,
        { provide: getRepositoryToken(AiRequest), useValue: repository },
        { provide: ProductsService, useValue: productsService },
        { provide: ClaudeProvider, useValue: claude },
        { provide: VoyageProvider, useValue: voyage },
      ],
    }).compile();

    processor = module.get(AiRequestProcessor);
  });

  describe('process — COPY_GENERATION', () => {
    it('상품을 조회해 Claude를 호출하고 결과·토큰·비용을 저장한다', async () => {
      const request = {
        id: 'r1',
        requestId: 'req-1',
        type: AiRequestType.COPY_GENERATION,
        input: { productId: 'prod-1' },
      };
      repository.findOne.mockResolvedValueOnce(request);
      productsService.findOne.mockResolvedValueOnce({
        id: 'prod-1',
        name: '헤드폰',
        category: '오디오',
        features: '노캔, 30시간',
      });
      claude.complete.mockResolvedValueOnce({
        text: '# 최고의 사운드\n...',
        inputTokens: 200,
        outputTokens: 400,
        model: 'claude-haiku-4-5-20251001',
      });

      await processor.process(makeJob('req-1'));

      expect(claude.complete).toHaveBeenCalled();
      const finalUpdate = repository.update.mock.calls.at(-1)?.[1];
      expect(finalUpdate).toMatchObject({
        status: AiRequestStatus.COMPLETED,
        output: expect.stringContaining('최고의 사운드'),
        inputTokens: 200,
        outputTokens: 400,
      });
      expect(finalUpdate.cost).toBeDefined();
      expect(finalUpdate.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('process — QA', () => {
    it('질문을 임베딩해 유사 상품을 검색한 뒤 Claude 답변을 생성한다', async () => {
      const request = {
        id: 'r2',
        requestId: 'req-2',
        type: AiRequestType.QA,
        input: { question: '노캔 헤드폰 추천', topK: 3 },
      };
      repository.findOne.mockResolvedValueOnce(request);
      voyage.embedOne.mockResolvedValueOnce([0.1, 0.2]);
      productsService.searchSimilar.mockResolvedValueOnce([
        { id: 'p1', name: 'A', category: 'audio', features: '노캔' },
      ]);
      claude.complete.mockResolvedValueOnce({
        text: '추천: A',
        inputTokens: 300,
        outputTokens: 100,
        model: 'claude-haiku-4-5-20251001',
      });

      await processor.process(makeJob('req-2'));

      expect(voyage.embedOne).toHaveBeenCalledWith('노캔 헤드폰 추천', 'query');
      expect(productsService.searchSimilar).toHaveBeenCalledWith([0.1, 0.2], 3);
      const finalUpdate = repository.update.mock.calls.at(-1)?.[1];
      expect(finalUpdate.status).toBe(AiRequestStatus.COMPLETED);
      expect(finalUpdate.output).toBe('추천: A');
    });
  });

  describe('process — 에러 처리', () => {
    it('Claude 호출 실패 시 errorMessage를 기록하고 예외를 다시 던진다 (재시도용)', async () => {
      repository.findOne.mockResolvedValueOnce({
        id: 'r3',
        requestId: 'req-3',
        type: AiRequestType.COPY_GENERATION,
        input: { productId: 'prod-1' },
      });
      productsService.findOne.mockResolvedValueOnce({
        id: 'prod-1',
        name: 'X',
        category: 'C',
        features: 'F',
      });
      claude.complete.mockRejectedValueOnce(new Error('rate limit'));

      await expect(processor.process(makeJob('req-3', 1))).rejects.toThrow('rate limit');

      const errorUpdate = repository.update.mock.calls.find((c) => c[1].errorMessage);
      expect(errorUpdate?.[1]).toMatchObject({
        errorMessage: 'rate limit',
        retryCount: 1,
      });
    });
  });

  describe('onFailed', () => {
    it('최종 실패(attempts 소진) 시 FAILED로 상태를 전이한다', async () => {
      await processor.onFailed(makeJob('req-4', 3));
      expect(repository.update).toHaveBeenCalledWith(
        { requestId: 'req-4' },
        { status: AiRequestStatus.FAILED },
      );
    });

    it('아직 재시도가 남아있으면 상태를 바꾸지 않는다', async () => {
      await processor.onFailed(makeJob('req-4', 1));
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
