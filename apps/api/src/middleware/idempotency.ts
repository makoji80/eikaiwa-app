import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

/**
 * request_id による冪等性制御。
 *
 * - 同一 (userId, route, requestId) が既に completed なら、AIを再度呼ばずに保存済みレスポンスを返す。
 * - 同一キーで別payloadが来たら拒否する（キー使い回しのバグを検知するため）。
 * - 処理中に同じキーが来たら 409 として拒否する（同時リクエストの二重処理を防ぐ）。
 * - 既知の制約: ハンドラ実行中にプロセスが落ちた場合、processing状態のレコードは
 *   staleAfterMs 経過後に再試行で再利用可能になる（完全な exactly-once ではない）。
 */

export class IdempotencyConflictError extends Error {
  constructor(message = '同じリクエストを処理中です。しばらくして再試行してください') {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotencyPayloadMismatchError extends Error {
  constructor(requestId: string) {
    super(`request_id "${requestId}" は既に別内容のリクエストで使用されています`);
    this.name = 'IdempotencyPayloadMismatchError';
  }
}

function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');
}

export interface RunIdempotentParams {
  userId: string;
  route: string;
  requestId: string;
  requestBody: unknown;
  /** processing状態のレコードをこの経過時間(ms)後に再試行可能とみなす（クラッシュ復旧用）。 */
  staleAfterMs?: number;
}

export async function runIdempotent<T>(
  prisma: PrismaClient,
  params: RunIdempotentParams,
  handler: () => Promise<T>,
): Promise<{ result: T; replayed: boolean }> {
  const staleAfterMs = params.staleAfterMs ?? 30_000;
  const requestHash = hashBody(params.requestBody);
  const key = { userId: params.userId, route: params.route, requestId: params.requestId };

  const existing = await prisma.idempotencyRecord.findUnique({
    where: { userId_route_requestId: key },
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new IdempotencyPayloadMismatchError(params.requestId);
    }
    if (existing.status === 'completed' && existing.responseJson) {
      return { result: JSON.parse(existing.responseJson) as T, replayed: true };
    }
    const staleMs = Date.now() - existing.updatedAt.getTime();
    if (existing.status === 'processing' && staleMs < staleAfterMs) {
      throw new IdempotencyConflictError();
    }
    // 失効したprocessingレコードを再利用する（クラッシュ復旧）。
    await prisma.idempotencyRecord.update({
      where: { id: existing.id },
      data: { status: 'processing', responseJson: null },
    });
  } else {
    try {
      await prisma.idempotencyRecord.create({
        data: { ...key, requestHash, status: 'processing' },
      });
    } catch {
      // findUnique と create の間に別リクエストが割り込んだ（同時実行の競合）。
      throw new IdempotencyConflictError();
    }
  }

  const result = await handler();
  await prisma.idempotencyRecord.update({
    where: { userId_route_requestId: key },
    data: { status: 'completed', responseJson: JSON.stringify(result) },
  });
  return { result, replayed: false };
}
