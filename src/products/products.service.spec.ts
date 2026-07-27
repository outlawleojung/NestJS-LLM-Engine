import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { VoyageProvider } from '../ai/providers/voyage.provider';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let voyage: { embedOne: jest.Mock };

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({ id: 'p-1', ...v })),
      createQueryBuilder: jest.fn(),
    };
    voyage = { embedOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repository },
        { provide: VoyageProvider, useValue: voyage },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('create', () => {
    it('임베딩을 생성한 뒤 상품을 저장한다', async () => {
      voyage.embedOne.mockResolvedValueOnce([0.1, 0.2, 0.3]);

      const result = await service.create({
        name: '헤드폰',
        category: '오디오',
        features: '노캔',
      });

      expect(voyage.embedOne).toHaveBeenCalledWith(expect.stringContaining('헤드폰'), 'document');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '헤드폰',
          embedding: [0.1, 0.2, 0.3],
        }),
      );
      expect(result.id).toBe('p-1');
    });
  });

  describe('findOne', () => {
    it('없으면 NotFoundException을 던진다', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('searchSimilar', () => {
    it('코사인 거리로 정렬된 QueryBuilder를 생성한다', async () => {
      const qb = {
        orderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'p-1' }]),
      };
      repository.createQueryBuilder.mockReturnValueOnce(qb);

      const products = await service.searchSimilar([0.1, 0.2], 3);

      expect(qb.orderBy).toHaveBeenCalledWith(expect.stringContaining('<=>'), 'ASC');
      expect(qb.setParameter).toHaveBeenCalledWith('vec', '[0.1,0.2]');
      expect(qb.limit).toHaveBeenCalledWith(3);
      expect(products).toEqual([{ id: 'p-1' }]);
    });
  });
});
