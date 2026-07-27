// 컨트롤러/프로세서가 provider를 몰라도 되게 하기 위한 공용 형태.
// 새 LLM 추가 시 여기 리터럴만 늘리고 팩토리에 등록하면 된다.
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
