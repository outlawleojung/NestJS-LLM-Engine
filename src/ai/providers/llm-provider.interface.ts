export type LlmProviderName = 'claude' | 'gemini';

export interface LlmCompletionParams {
  system?: string;
  prompt: string;
  maxTokens?: number;
}

export interface LlmCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: LlmProviderName;
}

export interface LlmProvider {
  readonly name: LlmProviderName;
  complete(apiKey: string, params: LlmCompletionParams): Promise<LlmCompletionResult>;
}
