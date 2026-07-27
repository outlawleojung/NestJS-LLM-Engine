import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM 기반 대칭 암호화.
 * 사용자 API 키를 Redis에 저장할 때 평문 노출을 막기 위해 사용.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;

  constructor(configService: ConfigService) {
    const secret = configService.getOrThrow<string>('SESSION_SECRET');
    // SESSION_SECRET을 SHA-256으로 해싱하여 32바이트 키로 파생
    this.key = createHash('sha256').update(secret).digest();
  }

  // 저장 포맷: base64(iv || auth_tag || ciphertext)
  // iv/tag를 함께 저장하는 이유는 복호화 시 이 정보가 있어야 하고, 키만 서버 시크릿으로 격리하면 되기 때문.
  encrypt(plaintext: string): string {
    const iv = randomBytes(CryptoService.IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, CryptoService.IV_LENGTH);
    const tag = buf.subarray(CryptoService.IV_LENGTH, CryptoService.IV_LENGTH + CryptoService.TAG_LENGTH);
    const ciphertext = buf.subarray(CryptoService.IV_LENGTH + CryptoService.TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
