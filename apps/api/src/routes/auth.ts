import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { SignupInputSchema, LoginInputSchema, type AuthTokenOutput } from '@eikaiwa/contracts';
import { validateBody } from '../middleware/validate';
import { asyncRoute } from '../middleware/errorHandler';
import { authRateLimiter } from '../middleware/rateLimit';
import { hashPassword, verifyPassword } from '../auth/password';
import { signAccessToken } from '../auth/jwt';
import type { Env } from '../env';

/**
 * 開発用の自前認証（email+password+JWT）。
 * マネージド認証基盤（Supabase Auth / Auth0 / Clerk 等）への置き換えは未決事項
 * （docs/OPEN-QUESTIONS.md）。本番公開前に必ず見直すこと。
 */
export function authRouter(prisma: PrismaClient, env: Pick<Env, 'JWT_SECRET' | 'JWT_EXPIRES_IN_SECONDS'>): Router {
  const router = Router();
  router.use(authRateLimiter);

  router.post(
    '/signup',
    validateBody(SignupInputSchema),
    asyncRoute(async (req, res) => {
      const { email, password } = req.body as { email: string; password: string };

      const existing = await prisma.devCredential.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({
          error: { code: 'email_taken', message: 'このメールアドレスは既に登録されています', retryable: false },
        });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.userProfile.create({
        data: {
          consentFlags: JSON.stringify({
            storeAudio: false,
            storeConversationHistory: true,
            useForModelImprovement: false,
          }),
        },
      });
      await prisma.devCredential.create({ data: { userId: user.id, email, passwordHash } });

      const { token, expiresAt } = signAccessToken(user.id, env);
      const output: AuthTokenOutput = { access_token: token, user_id: user.id, expires_at: expiresAt.toISOString() };
      res.status(201).json(output);
    }),
  );

  router.post(
    '/login',
    validateBody(LoginInputSchema),
    asyncRoute(async (req, res) => {
      const { email, password } = req.body as { email: string; password: string };

      const credential = await prisma.devCredential.findUnique({ where: { email } });
      const validPassword = credential ? await verifyPassword(password, credential.passwordHash) : false;
      if (!credential || !validPassword) {
        res
          .status(401)
          .json({ error: { code: 'invalid_credentials', message: 'メールアドレスまたはパスワードが違います', retryable: false } });
        return;
      }

      const { token, expiresAt } = signAccessToken(credential.userId, env);
      const output: AuthTokenOutput = {
        access_token: token,
        user_id: credential.userId,
        expires_at: expiresAt.toISOString(),
      };
      res.status(200).json(output);
    }),
  );

  return router;
}
