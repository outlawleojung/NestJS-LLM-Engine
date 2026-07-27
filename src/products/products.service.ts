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

  async create(voyageApiKey: string, dto: CreateProductDto): Promise<Product> {
    const embedding = await this.voyageProvider.embedOne(
      voyageApiKey,
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

  // 대량 등록용 — 임베딩을 한 번의 Voyage 호출로 처리한다 (N회 → 1회).
  async createMany(voyageApiKey: string, dtos: CreateProductDto[]): Promise<Product[]> {
    if (dtos.length === 0) return [];

    const texts = dtos.map((d) => this.buildEmbeddingText(d.name, d.category, d.features));
    const embeddings = await this.voyageProvider.embed(voyageApiKey, texts, 'document');

    const entities = dtos.map((dto, i) =>
      this.productRepository.create({
        name: dto.name,
        category: dto.category,
        features: dto.features,
        embedding: embeddings[i],
      }),
    );
    return this.productRepository.save(entities);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      order: { createdAt: 'DESC' },
      select: ['id', 'name', 'category', 'features', 'createdAt', 'updatedAt'],
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      select: ['id', 'name', 'category', 'features', 'createdAt', 'updatedAt'],
    });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async count(): Promise<number> {
    return this.productRepository.count();
  }

  // pgvector 코사인 거리(<=>)로 상위 K개 조회.
  // 벡터는 문자열 리터럴('[0.1,0.2,...]') 형태로 넘겨야 파서가 인식한다.
  async searchSimilar(queryEmbedding: number[], limit = 5): Promise<Product[]> {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;
    return this.productRepository
      .createQueryBuilder('p')
      .orderBy(`p.embedding <=> :vec`, 'ASC')
      .setParameter('vec', vectorLiteral)
      .limit(limit)
      .getMany();
  }

  // 상품명·카테고리·특징을 한 문장으로 합쳐 임베딩용 텍스트로 만든다.
  // 별개로 임베딩하면 상품 하나가 여러 벡터가 되어 검색이 복잡해지므로 하나로 합침.

  private buildEmbeddingText(name: string, category: string, features: string): string {
    return `상품명: ${name}\n카테고리: ${category}\n특징: ${features}`;
  }
}
