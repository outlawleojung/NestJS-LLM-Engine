import { ConfigService } from '@nestjs/config';

import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  const config = {
    getOrThrow: () => 'test-secret-that-is-sufficiently-long-for-tests-1234',
  } as unknown as ConfigService;
  const svc = new CryptoService(config);

  it('encrypt/decrypt 왕복이 원문과 일치한다', () => {
    const plaintext = 'sk-ant-api03-abcdef1234567890';
    const encrypted = svc.encrypt(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(svc.decrypt(encrypted)).toBe(plaintext);
  });

  it('같은 평문이라도 매번 다른 암호문을 생성한다 (랜덤 IV)', () => {
    const a = svc.encrypt('hello');
    const b = svc.encrypt('hello');
    expect(a).not.toBe(b);
  });

  it('변조된 암호문은 복호화에 실패한다', () => {
    const encrypted = svc.encrypt('hello');
    const tampered = encrypted.slice(0, -4) + 'AAAA';
    expect(() => svc.decrypt(tampered)).toThrow();
  });
});
