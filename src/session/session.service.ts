import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

import { CryptoService } from '../common/crypto/crypto.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';

export interface UserKeys {
  anthropicApiKey: string;
  voyageApiKey: string;
}

@Injectable()
export class SessionService {
  private static readonly TTL_SECONDS = 60 * 60; // 1 hour
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
    // 접근 시마다 TTL 갱신 (슬라이딩 만료)
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
