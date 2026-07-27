import { estimateCost } from './pricing';

describe('estimateCost', () => {
  it('claude-haiku-4-5 단가로 비용을 계산한다', () => {
    // 1M input @ $1, 1M output @ $5 → $6
    const cost = estimateCost('claude-haiku-4-5-20251001', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(6.0, 6);
  });

  it('claude-sonnet-5 단가로 비용을 계산한다', () => {
    // 500k input @ $3/1M, 500k output @ $15/1M → 1.5 + 7.5 = 9
    const cost = estimateCost('claude-sonnet-5', 500_000, 500_000);
    expect(cost).toBeCloseTo(9.0, 6);
  });

  it('단가표에 없는 모델은 fallback을 사용한다', () => {
    const known = estimateCost('claude-haiku-4-5-20251001', 100, 100);
    const unknown = estimateCost('some-unknown-model', 100, 100);
    expect(unknown).toBe(known);
  });

  it('0 토큰이면 0을 반환한다', () => {
    expect(estimateCost('claude-haiku-4-5-20251001', 0, 0)).toBe(0);
  });
});
