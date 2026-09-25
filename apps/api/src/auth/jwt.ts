import jwt from 'jsonwebtoken';
import type { Env } from '../env';

export interface AccessTokenPayload {
  sub: string; // userId
}

export function signAccessToken(userId: string, env: Pick<Env, 'JWT_SECRET' | 'JWT_EXPIRES_IN_SECONDS'>): {
  token: string;
  expiresAt: Date;
} {
  const expiresAt = new Date(Date.now() + env.JWT_EXPIRES_IN_SECONDS * 1000);
  const token = jwt.sign({ sub: userId } satisfies AccessTokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
  });
  return { token, expiresAt };
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('invalid token payload');
  }
  return { sub: decoded.sub };
}
