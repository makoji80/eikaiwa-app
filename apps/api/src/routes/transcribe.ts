import express, { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { TranscribeInputSchema, TranscribeOutputSchema, type TranscribeOutput } from '@eikaiwa/contracts';
import { validateBody } from '../middleware/validate';
import { asyncRoute } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { runIdempotent } from '../middleware/idempotency';
import { aiRateLimiter } from '../middleware/rateLimit';
import { callAiAndValidate } from '../providers/ai/callAndValidate';
import type { AiProvider } from '../providers/ai/types';
import type { Env } from '../env';

/** 短すぎる録音(無音・タップミス等)をAI呼び出し前に弾く簡易ヒューリスティック。 */
const MIN_AUDIO_BYTES = 2000;

export function transcribeRouter(
  prisma: PrismaClient,
  aiProvider: AiProvider,
  env: Pick<Env, 'JWT_SECRET' | 'IDEMPOTENCY_TTL_HOURS'>,
): Router {
  const router = Router();
  // 音声のbase64は数百KB〜数MBになりうるため、このルートだけ上限を広げる。
  router.use(express.json({ limit: '15mb' }));
  router.use(requireAuth(env.JWT_SECRET), aiRateLimiter);

  router.post(
    '/',
    validateBody(TranscribeInputSchema),
    asyncRoute(async (req, res) => {
      const userId = req.userId!;
      const body = req.body as {
        request_id: string;
        locale: 'ja-JP' | 'en-US';
        audio_base64: string;
        mime_type: string;
      };

      // 音声データはここで一度だけデコードし、AIプロバイダに渡した後は保持しない
      // （ディスク書き込み・DB保存を一切行わない）。
      const audioBuffer = Buffer.from(body.audio_base64, 'base64');

      if (audioBuffer.byteLength < MIN_AUDIO_BYTES) {
        res.status(422).json({
          error: {
            code: 'audio_too_short',
            message: '録音が短すぎるか無音の可能性があります。もう一度録音してください',
            retryable: true,
          },
        });
        return;
      }

      const { result } = await runIdempotent<TranscribeOutput>(
        prisma,
        {
          userId,
          route: 'transcribe',
          // audio_base64本体はハッシュ化されて冪等性キーの一部になるだけで、テーブルには残らない。
          requestId: body.request_id,
          requestBody: body,
          staleAfterMs: env.IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000,
        },
        async () => {
          const { output, usage } = await callAiAndValidate(
            () => aiProvider.transcribe({ audioBuffer, mimeType: body.mime_type, locale: body.locale }),
            TranscribeOutputSchema,
            'transcribe',
          );

          await prisma.usageEvent.create({
            data: { userId, feature: 'transcribe', units: usage.units, estimatedCost: usage.estimatedCost },
          });

          return output;
        },
      );

      res.status(200).json(result);
    }),
  );

  return router;
}
