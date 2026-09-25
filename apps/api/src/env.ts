import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET は16文字以上のランダムな文字列にしてください'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 12),
  AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  CORS_ORIGIN: z.string().default('*'),
  IDEMPOTENCY_TTL_HOURS: z.coerce.number().positive().default(24),
});

export type Env = z.infer<typeof EnvSchema>;

/** 起動時に一度だけ検証する。不正/欠落があれば即座に落として本番投入を防ぐ。 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`環境変数の検証に失敗しました:\n${issues}`);
  }
  if (parsed.data.AI_PROVIDER === 'openai' && !parsed.data.OPENAI_API_KEY) {
    throw new Error('AI_PROVIDER=openai の場合は OPENAI_API_KEY が必須です');
  }
  return parsed.data;
}
