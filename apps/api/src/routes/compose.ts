import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { ComposeInputSchema, ComposeAiOutputSchema, ComposeOutputSchema, type ComposeOutput } from '@eikaiwa/contracts';
import { validateBody, assertValidResponse } from '../middleware/validate';
import { asyncRoute } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { requireOwnedConversation } from '../middleware/ownership';
import { runIdempotent } from '../middleware/idempotency';
import { aiRateLimiter } from '../middleware/rateLimit';
import { callAiAndValidate } from '../providers/ai/callAndValidate';
import type { AiProvider } from '../providers/ai/types';
import type { Env } from '../env';

export function composeRouter(
  prisma: PrismaClient,
  aiProvider: AiProvider,
  env: Pick<Env, 'JWT_SECRET' | 'IDEMPOTENCY_TTL_HOURS'>,
): Router {
  const router = Router();
  router.use(requireAuth(env.JWT_SECRET), aiRateLimiter);

  router.post(
    '/',
    validateBody(ComposeInputSchema),
    asyncRoute(async (req, res) => {
      const userId = req.userId!;
      const body = req.body as {
        request_id: string;
        conversation_id: string;
        jp_intent: string;
        level: string;
        context_summary?: string;
      };

      await requireOwnedConversation(prisma, userId, body.conversation_id);

      const { result } = await runIdempotent<ComposeOutput>(
        prisma,
        {
          userId,
          route: 'compose',
          requestId: body.request_id,
          requestBody: body,
          staleAfterMs: env.IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000,
        },
        async () => {
          const { output: aiOutput, usage } = await callAiAndValidate(
            () =>
              aiProvider.compose({
                jpIntent: body.jp_intent,
                level: body.level,
                contextSummary: body.context_summary,
              }),
            ComposeAiOutputSchema,
            'compose',
          );

          // 日本語意図メッセージとして永続化する（本人が実際に発話した英語のメッセージとは別レコード）。
          const jpMessage = await prisma.message.create({
            data: {
              conversationId: body.conversation_id,
              role: 'user',
              language: 'ja',
              text: body.jp_intent,
              sourceType: 'text',
              requestId: body.request_id,
            },
          });

          await prisma.translationAttempt.create({
            data: {
              sourceMessageId: jpMessage.id,
              sourceText: body.jp_intent,
              suggestedText: aiOutput.english,
              selectedText: null,
              userSpoke: false,
              matchesSuggestion: false,
              confidence: null,
            },
          });

          await prisma.usageEvent.create({
            data: { userId, feature: 'compose', units: usage.units, estimatedCost: usage.estimatedCost },
          });

          return assertValidResponse(
            ComposeOutputSchema,
            { ...aiOutput, source_message_id: jpMessage.id },
            'compose-final',
          );
        },
      );

      res.status(200).json(result);
    }),
  );

  return router;
}
