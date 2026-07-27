import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { VoyageProvider } from '../ai/providers/voyage.provider';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly voyageProvider: VoyageProvider,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const embedding = await this.voyageProvider.embedOne(
      this.buildEmbeddingText(dto.name, dto.category, dto.features),
      'document',
    );

    const product = this.productRepository.create({
      name: dto.name,
      category: dto.category,
      features: dto.features,
      embedding,
    });
    return this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  /**
   * 질문 임베딩과 유사한 상품을 코사인 거리 기준 top-K 조회.
   */
  async searchSimilar(queryEmbedding: number[], limit = 5): Promise<Product[]> {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;
    return this.productRepository
      .createQueryBuilder('p')
      .orderBy(`p.embedding <=> :vec`, 'ASC')
      .setParameter('vec', vectorLiteral)
      .limit(limit)
      .getMany();
  }

  private buildEmbeddingText(name: string, category: string, features: string): string {
    return `상품명: ${name}\n카테고리: ${category}\n특징: ${features}`;
  }
}
