import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  LlmCompletionParams,
  LlmCompletionResult,
  LlmProvider,
  LlmProviderName,
} from './llm-provider.interface';

@Injectable()
export class GeminiProvider implements LlmProvider {
  readonly name: LlmProviderName = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly modelName: string;

  constructor(configService: ConfigService) {
    this.modelName = configService.getOrThrow<string>('GEMINI_MODEL');
  }

  async complete(apiKey: string, params: LlmCompletionParams): Promise<LlmCompletionResult> {
    // Gemini는 system 프롬프트가 generationConfig가 아니라 모델 인스턴스 옵션으로 들어감.
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: params.system,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? 1024,
      },
    });

    const text = result.response.text();
    const usage = result.response.usageMetadata;

    return {
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      model: this.modelName,
      provider: this.name,
    };
  }
}
