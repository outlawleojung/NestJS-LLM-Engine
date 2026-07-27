import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

import { LlmProviderName } from '../ai/providers/llm-provider.interface';
import { CryptoService } from '../common/crypto/crypto.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';

export interface UserKeys {
  provider: LlmProviderName;
  llmApiKey: string;
  voyageApiKey: string;
}

@Injectable()
export class SessionService {
  private static readonly TTL_SECONDS = 60 * 60;
  private static readonly PREFIX = 'session:';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly crypto: CryptoService,
  ) {}

  async create(keys: UserKeys): Promise<string> {
    const sessionId = randomUUID();
    const encrypted = this.crypto.encrypt(JSON.stringify(keys));
    await this.redis.set(this.key(sessionId), encrypted, 'EX', SessionService.TTL_SECONDS);
    return sessionId;
  }

  async get(sessionId: string): Promise<UserKeys> {
    const encrypted = await this.redis.get(this.key(sessionId));
    if (!encrypted) {
      throw new NotFoundException('Session expired or not found');
    }
    await this.redis.expire(this.key(sessionId), SessionService.TTL_SECONDS);
    return JSON.parse(this.crypto.decrypt(encrypted)) as UserKeys;
  }

  async destroy(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }

  private key(sessionId: string): string {
    return `${SessionService.PREFIX}${sessionId}`;
  }
}
