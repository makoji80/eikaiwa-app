import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../auth/jwt';

/** Authorization: Bearer <token> を検証し、req.userId を設定する。クライアント指定のuserIdは一切信用しない。 */
export function requireAuth(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: { code: 'unauthorized', message: '認証が必要です', retryable: false } });
      return;
    }
    const token = header.slice('Bearer '.length);
    try {
      const payload = verifyAccessToken(token, jwtSecret);
      req.userId = payload.sub;
      next();
    } catch {
      res
        .status(401)
        .json({ error: { code: 'invalid_token', message: 'トークンが無効または期限切れです', retryable: false } });
    }
  };
}
