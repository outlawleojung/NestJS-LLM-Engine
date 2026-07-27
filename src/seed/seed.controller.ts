import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';

import { ProductsService } from '../products/products.service';
import { SessionKeys } from '../session/session.decorator';
import { SessionGuard } from '../session/session.guard';
import { UserKeys } from '../session/session.service';
import { SAMPLE_PRODUCTS } from './sample-products';

@Controller('seed')
export class SeedController {
  constructor(private readonly productsService: ProductsService) {}

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

    const created = [];
    const failed: { name: string; error: string }[] = [];
    for (const dto of SAMPLE_PRODUCTS) {
      try {
        const product = await this.productsService.create(keys.voyageApiKey, dto);
        created.push({ id: product.id, name: product.name });
      } catch (error) {
        failed.push({
          name: dto.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      skipped: false,
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
      totalProducts: await this.productsService.count(),
    };
  }
}
