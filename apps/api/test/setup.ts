import { spawnSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const API_ROOT = path.join(__dirname, '..');
const TEST_DB_PATH = path.join(API_ROOT, 'prisma', 'test.db');
export const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

/** テスト用SQLiteファイルを作り直し、現在のPrismaスキーマを反映する。 */
export function resetTestDatabase(): void {
  for (const suffix of ['', '-journal']) {
    const file = `${TEST_DB_PATH}${suffix}`;
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
  const result = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
    cwd: API_ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('テスト用DBスキーマの反映(prisma db push)に失敗しました');
  }
}
