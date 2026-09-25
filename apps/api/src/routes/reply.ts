import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { ReplyInputSchema, ReplyOutputSchema, type ReplyOutput } from '@eikaiwa/contracts';
import { validateBody } from '../middleware/validate';
import { asyncRoute } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { requireOwnedConversation } from '../middleware/ownership';
import { runIdempotent } from '../middleware/idempotency';
import { aiRateLimiter } from '../middleware/rateLimit';
import { callAiAndValidate } from '../providers/ai/callAndValidate';
import type { AiProvider } from '../providers/ai/types';
import type { Env } from '../env';

const HISTORY_LIMIT = 10;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function replyRouter(
  prisma: PrismaClient,
  aiProvider: AiProvider,
  env: Pick<Env, 'JWT_SECRET' | 'IDEMPOTENCY_TTL_HOURS'>,
): Router {
  const router = Router();
  router.use(requireAuth(env.JWT_SECRET), aiRateLimiter);

  router.post(
    '/',
    validateBody(ReplyInputSchema),
    asyncRoute(async (req, res) => {
      const userId = req.userId!;
      const body = req.body as {
        request_id: string;
        conversation_id: string;
        spoken_text: string;
        selected_translation?: string;
        source_message_id?: string;
        style: 'conversation' | 'coaching' | 'intensive';
      };

      await requireOwnedConversation(prisma, userId, body.conversation_id);

      const { result } = await runIdempotent<ReplyOutput>(
        prisma,
        {
          userId,
          route: 'reply',
          requestId: body.request_id,
          requestBody: body,
          staleAfterMs: env.IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000,
        },
        async () => {
          const priorMessages = await prisma.message.findMany({
            where: { conversationId: body.conversation_id },
            orderBy: { createdAt: 'desc' },
            take: HISTORY_LIMIT,
          });
          const recentHistory = priorMessages
            .reverse()
            .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.text }));

          const { output: aiOutput, usage } = await callAiAndValidate(
            () =>
              aiProvider.reply({
                spokenText: body.spoken_text,
                selectedTranslation: body.selected_translation,
                recentHistory,
                style: body.style,
              }),
            ReplyOutputSchema,
            'reply',
          );

          // 本人が実際に発話/入力した英語。これだけが「自力で言えた」記録の根拠になる。
          await prisma.message.create({
            data: {
              conversationId: body.conversation_id,
              role: 'user',
              language: 'en',
              text: body.spoken_text,
              sourceType: 'text',
              requestId: body.request_id,
            },
          });

          await prisma.message.create({
            data: {
              conversationId: body.conversation_id,
              role: 'assistant',
              language: 'en',
              text: aiOutput.reply_text,
              sourceType: 'text',
              requestId: null,
            },
          });

          if (body.source_message_id) {
            const attempt = await prisma.translationAttempt.findUnique({
              where: { sourceMessageId: body.source_message_id },
              include: { sourceMessage: true },
            });
            if (attempt && attempt.sourceMessage.conversationId === body.conversation_id) {
              await prisma.translationAttempt.update({
                where: { sourceMessageId: body.source_message_id },
                data: {
                  selectedText: body.spoken_text,
                  userSpoke: true,
                  matchesSuggestion: normalize(body.spoken_text) === normalize(attempt.suggestedText),
                },
              });
            }
          }

          await prisma.usageEvent.create({
            data: { userId, feature: 'reply', units: usage.units, estimatedCost: usage.estimatedCost },
          });

          return aiOutput;
        },
      );

      res.status(200).json(result);
    }),
  );

  return router;
}
