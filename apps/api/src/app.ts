import express from 'express';
import cors from 'cors';
import type { PrismaClient } from '@prisma/client';
import type { Env } from './env';
import type { AiProvider } from './providers/ai/types';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { conversationsRouter } from './routes/conversations';
import { composeRouter } from './routes/compose';
import { replyRouter } from './routes/reply';
import { errorHandler } from './middleware/errorHandler';

/** テスト（supertest）と本番起動(index.ts)の両方から使う、依存を注入済みのExpressアプリを組み立てる。 */
export function createApp(prisma: PrismaClient, aiProvider: AiProvider, env: Env) {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  app.use(healthRouter());
  app.use('/api/auth', authRouter(prisma, env));
  app.use('/api/conversations', conversationsRouter(prisma, env));
  app.use('/api/compose', composeRouter(prisma, aiProvider, env));
  app.use('/api/reply', replyRouter(prisma, aiProvider, env));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Not Found', retryable: false } });
  });

  app.use(errorHandler);

  return app;
}
