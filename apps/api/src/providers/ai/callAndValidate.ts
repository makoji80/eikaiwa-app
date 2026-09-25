import type { ZodType } from 'zod';
import type { AiResult, AiUsage } from './types';
import { assertValidResponse } from '../../middleware/validate';

/**
 * AIプロバイダ呼び出し→スキーマ検証。不正な出力は1回だけ再試行し、それでも
 * 直らなければ InvalidAiOutputError を投げる（呼び出し元のerrorHandlerが502に変換）。
 * 使用量(usage)は実際に採用された呼び出しの値を返す。
 */
export async function callAiAndValidate<T>(
  call: () => Promise<AiResult<unknown>>,
  schema: ZodType<T, any, any>,
  context: string,
): Promise<{ output: T; usage: AiUsage }> {
  const first = await call();
  const firstParsed = schema.safeParse(first.output);
  if (firstParsed.success) {
    return { output: firstParsed.data, usage: first.usage };
  }
  const second = await call();
  const output = assertValidResponse(schema, second.output, context);
  return { output, usage: second.usage };
}
