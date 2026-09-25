import type { PrismaClient } from '@prisma/client';

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} が見つかりません`);
    this.name = 'NotFoundError';
  }
}

/**
 * 会話が指定ユーザーの所有物であることを確認する。他ユーザーの会話には
 * 403ではなく404を返し、存在の有無自体を漏らさない。
 * すべての会話スコープのルートはこの1関数を経由させる（分離漏れの温床を作らない）。
 */
export async function requireOwnedConversation(prisma: PrismaClient, userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) {
    throw new NotFoundError('conversation');
  }
  return conversation;
}
