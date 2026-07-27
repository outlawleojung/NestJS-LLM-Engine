import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';

import { ProductsService } from '../products/products.service';
import { SessionKeys } from '../session/session.decorator';
import { SessionGuard } from '../session/session.guard';
import { UserKeys } from '../session/session.service';
import { SAMPLE_PRODUCTS } from './sample-products';

@Controller('seed')
export class SeedController {
  constructor(private readonly productsService: ProductsService) {}

  // 데모 상품 10개를 한 번에 넣는다.
  // 임베딩은 Voyage 배치 호출 1회로 끝나 초기 로딩 시간이 짧다.
  @Post('products')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  async seedProducts(@SessionKeys() keys: UserKeys) {
    const existing = await this.productsService.count();
    if (existing >= SAMPLE_PRODUCTS.length) {
      return {
        skipped: true,
        message: `이미 상품이 ${existing}개 있습니다. 시드를 건너뜁니다.`,
        totalProducts: existing,
      };
    }

    try {
      const created = await this.productsService.createMany(keys.voyageApiKey, SAMPLE_PRODUCTS);
      return {
        skipped: false,
        createdCount: created.length,
        failedCount: 0,
        created: created.map((p) => ({ id: p.id, name: p.name })),
        totalProducts: await this.productsService.count(),
      };
    } catch (error) {
      return {
        skipped: false,
        createdCount: 0,
        failedCount: SAMPLE_PRODUCTS.length,
        error: error instanceof Error ? error.message : String(error),
        totalProducts: existing,
      };
    }
  }
}
