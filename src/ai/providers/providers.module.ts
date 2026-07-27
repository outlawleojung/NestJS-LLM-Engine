import { Module } from '@nestjs/common';

import { ClaudeProvider } from './claude.provider';
import { GeminiProvider } from './gemini.provider';
import { LlmProviderFactory } from './llm-provider.factory';
import { VoyageProvider } from './voyage.provider';

@Module({
  providers: [ClaudeProvider, GeminiProvider, LlmProviderFactory, VoyageProvider],
  exports: [ClaudeProvider, GeminiProvider, LlmProviderFactory, VoyageProvider],
})
export class AiProvidersModule {}
