import { Injectable } from '@nestjs/common';

import { ClaudeProvider } from './claude.provider';
import { GeminiProvider } from './gemini.provider';
import { LlmProvider, LlmProviderName } from './llm-provider.interface';

// 세션에 저장된 provider 값으로 실제 구현체를 골라 반환.
// switch를 두는 이유는 새 provider 추가 시 타입 체크(never)로 누락을 잡아주기 때문.
@Injectable()
export class LlmProviderFactory {
  constructor(
    private readonly claude: ClaudeProvider,
    private readonly gemini: GeminiProvider,
  ) {}

  get(name: LlmProviderName): LlmProvider {
    switch (name) {
      case 'claude':
        return this.claude;
      case 'gemini':
        return this.gemini;
      default: {
        const exhaustive: never = name;
        throw new Error(`Unknown LLM provider: ${exhaustive}`);
      }
    }
  }
}
