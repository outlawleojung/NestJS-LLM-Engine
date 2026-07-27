import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModule } from './ai/ai.module';
import { validateEnv } from './common/config/env.validation';
import { CryptoModule } from './common/crypto/crypto.module';
import { RedisModule } from './common/redis/redis.module';
import { ProductsModule } from './products/products.module';
import { SessionModule } from './session/session.module';
import { ViewsModule } from './views/views.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity.{ts,js}'],
        migrationsRun: false,
        synchronize: false,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: Number(config.getOrThrow<string>('REDIS_PORT')),
        },
      }),
    }),
    CryptoModule,
    RedisModule,
    SessionModule,
    ProductsModule,
    AiModule,
    ViewsModule,
  ],
})
export class AppModule {}
