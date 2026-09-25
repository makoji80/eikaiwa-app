import type { NextFunction, Request, Response } from 'express';
import { IdempotencyConflictError, IdempotencyPayloadMismatchError } from './idempotency';
import { InvalidAiOutputError } from './validate';
import { NotFoundError } from './ownership';

/** 全ルート共通のエラー整形。スタックトレースやDB接続文字列等をクライアントへ漏らさない。 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { code: 'not_found', message: err.message, retryable: false } });
    return;
  }
  if (err instanceof IdempotencyConflictError) {
    res.status(409).json({ error: { code: 'processing', message: err.message, retryable: true } });
    return;
  }
  if (err instanceof IdempotencyPayloadMismatchError) {
    res.status(400).json({ error: { code: 'idempotency_key_reused', message: err.message, retryable: false } });
    return;
  }
  if (err instanceof InvalidAiOutputError) {
    res.status(502).json({
      error: { code: 'ai_output_invalid', message: '応答の生成に失敗しました。もう一度お試しください', retryable: true },
    });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[unhandled_error]', err instanceof Error ? err.stack : err);
  res.status(500).json({
    error: { code: 'internal_error', message: '予期しないエラーが発生しました', retryable: true },
  });
}

/** async route handler をラップし、rejectされた例外を errorHandler に渡す。 */
export function asyncRoute(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
