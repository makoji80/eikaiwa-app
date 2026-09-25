import { describe, expect, it } from 'vitest';
import {
  ComposeOutputSchema,
  ReplyOutputSchema,
  ComposeInputSchema,
  ReplyInputSchema,
} from './operations';

describe('ComposeOutputSchema', () => {
  it('accepts a minimal valid compose response', () => {
    const parsed = ComposeOutputSchema.parse({
      english: 'We want to build a stronger partnership.',
      source_message_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(parsed.alternatives).toEqual([]);
    expect(parsed.clarification).toBeNull();
  });

  it('rejects a response missing source_message_id (suggested/spoken linkage)', () => {
    const result = ComposeOutputSchema.safeParse({ english: 'Hello' });
    expect(result.success).toBe(false);
  });

  it('rejects a response missing the required english field', () => {
    const result = ComposeOutputSchema.safeParse({
      alternatives: [],
      source_message_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(result.success).toBe(false);
  });
});

describe('ReplyOutputSchema', () => {
  it('caps moment_candidates at 5 entries', () => {
    const tooMany = Array.from({ length: 6 }, (_, i) => ({
      jp_intent: `意図${i}`,
      en_expression: `expression ${i}`,
      reason: 'could_not_say' as const,
    }));
    const result = ReplyOutputSchema.safeParse({
      reply_text: 'Nice to hear that!',
      moment_candidates: tooMany,
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero moment candidates', () => {
    const parsed = ReplyOutputSchema.parse({ reply_text: 'Got it.' });
    expect(parsed.moment_candidates).toEqual([]);
  });
});

describe('ComposeInputSchema / ReplyInputSchema', () => {
  it('requires request_id for idempotency', () => {
    const result = ComposeInputSchema.safeParse({
      conversation_id: '00000000-0000-0000-0000-000000000000',
      jp_intent: 'マイクロソフトと連携を強めたい',
      level: 'intermediate',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed reply input', () => {
    const result = ReplyInputSchema.safeParse({
      request_id: 'req-1',
      conversation_id: '00000000-0000-0000-0000-000000000000',
      spoken_text: 'We want to build a stronger partnership.',
    });
    expect(result.success).toBe(true);
  });
});
