import type { Env } from '../../env';
import type { AiProvider } from './types';
import { MockAiProvider } from './mockProvider';
import { OpenAiProvider } from './openaiProvider';

export * from './types';

export function createAiProvider(env: Pick<Env, 'AI_PROVIDER' | 'OPENAI_API_KEY' | 'OPENAI_MODEL'>): AiProvider {
  if (env.AI_PROVIDER === 'openai') {
    if (!env.OPENAI_API_KEY) {
      throw new Error('AI_PROVIDER=openai の場合は OPENAI_API_KEY が必須です');
    }
    return new OpenAiProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
  }
  return new MockAiProvider();
}
