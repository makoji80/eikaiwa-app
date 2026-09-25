import { PrismaClient } from '@prisma/client';

/** テスト等で複数インスタンスが必要な場合に備え、シングルトンをファクトリ経由で提供する。 */
export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

let sharedClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!sharedClient) {
    sharedClient = createPrismaClient();
  }
  return sharedClient;
}
