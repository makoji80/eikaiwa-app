import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/** リクエストボディをZodスキーマで検証する。不正なら400（安全に再試行可能）。 */
export function validateBody<T>(schema: ZodType<T, any, any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'invalid_request',
          message: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
          retryable: true,
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * AIプロバイダ等が返した値をレスポンススキーマで検証する。
 * 呼び出し側で1回リトライしても直らない不正な出力は、ここで安全なエラーに変換する。
 */
export function assertValidResponse<T>(schema: ZodType<T, any, any>, value: unknown, context: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new InvalidAiOutputError(context, result.error.issues.map((i) => i.message).join('; '));
  }
  return result.data;
}

export class InvalidAiOutputError extends Error {
  constructor(
    public readonly context: string,
    reason: string,
  ) {
    super(`AI出力がスキーマに一致しません (${context}): ${reason}`);
    this.name = 'InvalidAiOutputError';
  }
}
