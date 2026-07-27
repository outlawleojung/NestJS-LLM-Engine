import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ClaudeCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

@Injectable()
export class ClaudeProvider {
  private readonly logger = new Logger(ClaudeProvider.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: configService.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
    this.model = configService.getOrThrow<string>('CLAUDE_MODEL');
  }

  async complete(params: {
    system?: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<ClaudeCompletionResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? 1024,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    };
  }
}
