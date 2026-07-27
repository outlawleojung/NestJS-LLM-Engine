/**
 * Claude 모델별 단가 (USD, 1M 토큰 기준).
 * 공식 pricing 페이지 기준으로 갱신할 것.
 */
export interface ModelPricing {
  input: number;
  output: number;
}

const PRICING_TABLE: Record<string, ModelPricing> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-opus-5': { input: 15.0, output: 75.0 },
};

const FALLBACK_PRICING: ModelPricing = { input: 1.0, output: 5.0 };

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_TABLE[model] ?? FALLBACK_PRICING;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}
