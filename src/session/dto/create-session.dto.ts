import { IsIn, IsNotEmpty, IsString } from 'class-validator';

import { LlmProviderName } from '../../ai/providers/llm-provider.interface';

const PROVIDERS: LlmProviderName[] = ['claude', 'gemini'];

export class CreateSessionDto {
  @IsIn(PROVIDERS)
  provider!: LlmProviderName;

  @IsString()
  @IsNotEmpty()
  llmApiKey!: string;

  @IsString()
  @IsNotEmpty()
  voyageApiKey!: string;
}
