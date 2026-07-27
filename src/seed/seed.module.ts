import { Module } from '@nestjs/common';

import { ProductsModule } from '../products/products.module';
import { SessionModule } from '../session/session.module';
import { SeedController } from './seed.controller';

@Module({
  imports: [ProductsModule, SessionModule],
  controllers: [SeedController],
})
export class SeedModule {}
