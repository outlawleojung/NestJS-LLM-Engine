import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsModule } from '../products/products.module';
import { AiController } from './ai.controller';
import { AI_REQUEST_QUEUE } from './ai.queue';
import { AiService } from './ai.service';
import { AiRequest } from './entities/ai-request.entity';
import { AiRequestProcessor } from './processors/ai-request.processor';
import { AiProvidersModule } from './providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiRequest]),
    BullModule.registerQueue({ name: AI_REQUEST_QUEUE }),
    AiProvidersModule,
    ProductsModule,
  ],
  controllers: [AiController],
  providers: [AiService, AiRequestProcessor],
})
export class AiModule {}
