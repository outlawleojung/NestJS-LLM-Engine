import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  LlmCompletionParams,
  LlmCompletionResult,
  LlmProvider,
  LlmProviderName,
} from './llm-provider.interface';

@Injectable()
export class ClaudeProvider implements LlmProvider {
  readonly name: LlmProviderName = 'claude';
  private readonly logger = new Logger(ClaudeProvider.name);
  private readonly model: string;

  constructor(configService: ConfigService) {
    this.model = configService.getOrThrow<string>('CLAUDE_MODEL');
  }

  async complete(apiKey: string, params: LlmCompletionParams): Promise<LlmCompletionResult> {
    // BYOK — 요청마다 사용자 키로 클라이언트를 새로 만든다. SDK가 가벼워 큰 부담 없음.
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? 1024,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
    });

    // Claude 응답은 여러 block(tool_use 등)이 섞일 수 있으니 text만 골라 이어붙인다.
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
      provider: this.name,
    };
  }
}
