import { ClaudeProvider } from './claude.provider';
import { GeminiProvider } from './gemini.provider';
import { LlmProviderFactory } from './llm-provider.factory';

describe('LlmProviderFactory', () => {
  const claude = { name: 'claude' } as unknown as ClaudeProvider;
  const gemini = { name: 'gemini' } as unknown as GeminiProvider;
  const factory = new LlmProviderFactory(claude, gemini);

  it('claude 이름으로 요청하면 ClaudeProvider를 반환한다', () => {
    expect(factory.get('claude')).toBe(claude);
  });

  it('gemini 이름으로 요청하면 GeminiProvider를 반환한다', () => {
    expect(factory.get('gemini')).toBe(gemini);
  });
});
