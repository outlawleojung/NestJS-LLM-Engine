import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Voyage AI 임베딩 프로바이더.
 * voyageai npm 패키지가 안정 릴리스 전이라 REST 직접 호출로 구현.
 */
@Injectable()
export class VoyageProvider {
  private readonly logger = new Logger(VoyageProvider.name);
  private readonly endpoint = 'https://api.voyageai.com/v1/embeddings';
  private readonly apiKey: string;
  private readonly model: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.getOrThrow<string>('VOYAGE_API_KEY');
    this.model = configService.getOrThrow<string>('VOYAGE_MODEL');
  }

  async embed(input: string | string[], inputType: 'document' | 'query' = 'document'): Promise<number[][]> {
    const inputs = Array.isArray(input) ? input : [input];

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: inputs,
        input_type: inputType,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Voyage embed failed: ${response.status} ${body}`);
      throw new Error(`Voyage embed failed: ${response.status}`);
    }

    const json = (await response.json()) as {
      data: { embedding: number[]; index: number }[];
    };
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  async embedOne(input: string, inputType: 'document' | 'query' = 'document'): Promise<number[]> {
    const [vector] = await this.embed(input, inputType);
    return vector;
  }
}
