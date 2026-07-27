export interface ModelPricing {
  input: number; // USD per 1M input tokens
  output: number; // USD per 1M output tokens
}

/**
 * 모델별 단가.
 * - Claude: 공식 pricing 페이지 기준
 * - Gemini: 무료 티어 사용 시 실질 비용 0 (일 1500회 한도 내)
 */
const PRICING_TABLE: Record<string, ModelPricing> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-opus-5': { input: 15.0, output: 75.0 },
  'gemini-1.5-flash': { input: 0, output: 0 },
  'gemini-1.5-flash-8b': { input: 0, output: 0 },
  'gemini-1.5-pro': { input: 0, output: 0 },
  'gemini-2.0-flash': { input: 0, output: 0 },
  'gemini-2.0-flash-lite': { input: 0, output: 0 },
  'gemini-2.5-flash': { input: 0, output: 0 },
  'gemini-2.5-flash-lite': { input: 0, output: 0 },
  'gemini-2.5-pro': { input: 0, output: 0 },
};

// 단가표에 없는 모델은 Haiku 4.5 수준으로 가정 — 실제 비용보다 과대 추정될 수 있으니 알림용 지표로만.
const FALLBACK_PRICING: ModelPricing = { input: 1.0, output: 5.0 };

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_TABLE[model] ?? FALLBACK_PRICING;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}
