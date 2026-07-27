import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Anthropic이 임베딩 API를 제공하지 않아 Voyage를 별도로 사용.
// 공식 SDK가 안정 릴리스 전이라 REST 직접 호출로 붙임.
@Injectable()
export class VoyageProvider {
  private readonly logger = new Logger(VoyageProvider.name);
  private readonly endpoint = 'https://api.voyageai.com/v1/embeddings';
  private readonly model: string;

  constructor(configService: ConfigService) {
    this.model = configService.getOrThrow<string>('VOYAGE_MODEL');
  }

  async embed(
    apiKey: string,
    input: string | string[],
    inputType: 'document' | 'query' = 'document',
  ): Promise<number[][]> {
    const inputs = Array.isArray(input) ? input : [input];

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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

    // Voyage 응답의 순서가 요청 순서와 다를 수 있어 index로 정렬 후 반환.
    const json = (await response.json()) as {
      data: { embedding: number[]; index: number }[];
    };
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  async embedOne(
    apiKey: string,
    input: string,
    inputType: 'document' | 'query' = 'document',
  ): Promise<number[]> {
    const [vector] = await this.embed(apiKey, input, inputType);
    return vector;
  }
}
