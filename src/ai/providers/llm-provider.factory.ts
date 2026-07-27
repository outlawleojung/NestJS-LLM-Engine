import { Injectable } from '@nestjs/common';

import { ClaudeProvider } from './claude.provider';
import { GeminiProvider } from './gemini.provider';
import { LlmProvider, LlmProviderName } from './llm-provider.interface';

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
