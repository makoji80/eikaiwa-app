/**
 * request_id は冪等性キーとして使われるだけで、サーバー側のZodスキーマは
 * 単なる文字列(1〜200文字)として検証する（UUID形式である必要はない）。
 */
export function generateRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
