import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';

import { ProductsService } from '../../products/products.service';
import { SessionService } from '../../session/session.service';
import {
  AiRequest,
  AiRequestStatus,
  AiRequestType,
} from '../entities/ai-request.entity';
import { LlmProviderFactory } from '../providers/llm-provider.factory';
import { VoyageProvider } from '../providers/voyage.provider';
import { AiRequestProcessor } from './ai-request.processor';

type JobStub = Job<{ requestId: string; sessionId: string }>;

function makeJob(requestId: string, attemptsMade = 0): JobStub {
  return {
    data: { requestId, sessionId: 'sess-x' },
    attemptsMade,
    opts: { attempts: 3 },
  } as unknown as JobStub;
}

const KEYS = { provider: 'gemini' as const, llmApiKey: 'AIza-x', voyageApiKey: 'pa-x' };

describe('AiRequestProcessor', () => {
  let processor: AiRequestProcessor;
  let repository: { findOne: jest.Mock; update: jest.Mock };
  let productsService: { findOne: jest.Mock; searchSimilar: jest.Mock };
  let llm: { complete: jest.Mock };
  let llmFactory: { get: jest.Mock };
  let voyage: { embedOne: jest.Mock };
  let sessionService: { get: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    productsService = { findOne: jest.fn(), searchSimilar: jest.fn() };
    llm = { complete: jest.fn() };
    llmFactory = { get: jest.fn().mockReturnValue(llm) };
    voyage = { embedOne: jest.fn() };
    sessionService = { get: jest.fn().mockResolvedValue(KEYS) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiRequestProcessor,
        { provide: getRepositoryToken(AiRequest), useValue: repository },
        { provide: ProductsService, useValue: productsService },
        { provide: LlmProviderFactory, useValue: llmFactory },
        { provide: VoyageProvider, useValue: voyage },
        { provide: SessionService, useValue: sessionService },
      ],
    }).compile();

    processor = module.get(AiRequestProcessor);
  });

  describe('process — COPY_GENERATION', () => {
    it('세션에 저장된 provider의 LLM을 팩토리로 골라 호출한다', async () => {
      repository.findOne.mockResolvedValueOnce({
        id: 'r1',
        requestId: 'req-1',
        type: AiRequestType.COPY_GENERATION,
        input: { productId: 'prod-1' },
      });
      productsService.findOne.mockResolvedValueOnce({
        id: 'prod-1',
        name: '헤드폰',
        category: '오디오',
        features: '노캔',
      });
      llm.complete.mockResolvedValueOnce({
        text: '# 카피',
        inputTokens: 200,
        outputTokens: 400,
        model: 'gemini-1.5-flash',
        provider: 'gemini',
      });

      await processor.process(makeJob('req-1'));

      expect(sessionService.get).toHaveBeenCalledWith('sess-x');
      expect(llmFactory.get).toHaveBeenCalledWith('gemini');
      expect(llm.complete).toHaveBeenCalledWith(KEYS.llmApiKey, expect.any(Object));
      const finalUpdate = repository.update.mock.calls.at(-1)?.[1];
      expect(finalUpdate).toMatchObject({
        status: AiRequestStatus.COMPLETED,
        output: '# 카피',
        inputTokens: 200,
        outputTokens: 400,
      });
    });
  });

  describe('process — QA', () => {
    it('Voyage로 질문을 임베딩하고 유사 상품 검색 후 LLM 답변을 생성한다', async () => {
      repository.findOne.mockResolvedValueOnce({
        id: 'r2',
        requestId: 'req-2',
        type: AiRequestType.QA,
        input: { question: '노캔 헤드폰 추천', topK: 3 },
      });
      voyage.embedOne.mockResolvedValueOnce([0.1, 0.2]);
      productsService.searchSimilar.mockResolvedValueOnce([
        { id: 'p1', name: 'A', category: 'audio', features: '노캔' },
      ]);
      llm.complete.mockResolvedValueOnce({
        text: '추천: A',
        inputTokens: 300,
        outputTokens: 100,
        model: 'gemini-1.5-flash',
        provider: 'gemini',
      });

      await processor.process(makeJob('req-2'));

      expect(voyage.embedOne).toHaveBeenCalledWith(KEYS.voyageApiKey, '노캔 헤드폰 추천', 'query');
      expect(productsService.searchSimilar).toHaveBeenCalledWith([0.1, 0.2], 3);
      expect(llm.complete).toHaveBeenCalledWith(KEYS.llmApiKey, expect.any(Object));
    });
  });

  describe('process — 에러 처리', () => {
    it('LLM 호출 실패 시 errorMessage를 기록하고 예외를 다시 던진다', async () => {
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
      llm.complete.mockRejectedValueOnce(new Error('rate limit'));

      await expect(processor.process(makeJob('req-3', 1))).rejects.toThrow('rate limit');

      const errorUpdate = repository.update.mock.calls.find((c) => c[1].errorMessage);
      expect(errorUpdate?.[1]).toMatchObject({ errorMessage: 'rate limit', retryCount: 1 });
    });
  });

  describe('onFailed', () => {
    it('최종 실패 시 FAILED로 전이한다', async () => {
      await processor.onFailed(makeJob('req-4', 3));
      expect(repository.update).toHaveBeenCalledWith(
        { requestId: 'req-4' },
        { status: AiRequestStatus.FAILED },
      );
    });

    it('재시도가 남아있으면 상태를 바꾸지 않는다', async () => {
      await processor.onFailed(makeJob('req-4', 1));
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
