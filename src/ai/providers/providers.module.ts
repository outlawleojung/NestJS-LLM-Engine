import { Module } from '@nestjs/common';

import { ClaudeProvider } from './claude.provider';
import { VoyageProvider } from './voyage.provider';

@Module({
  providers: [ClaudeProvider, VoyageProvider],
  exports: [ClaudeProvider, VoyageProvider],
})
export class AiProvidersModule {}
