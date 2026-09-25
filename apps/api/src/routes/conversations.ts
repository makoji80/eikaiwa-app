import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import {
  CreateConversationInputSchema,
  type CreateConversationOutput,
  type ConversationDetailOutput,
  type Conversation,
  type Message,
} from '@eikaiwa/contracts';
import { validateBody } from '../middleware/validate';
import { asyncRoute } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { requireOwnedConversation, NotFoundError } from '../middleware/ownership';
import type { Env } from '../env';

function toConversationDto(row: {
  id: string;
  userId: string;
  topic: string | null;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
}): Conversation {
  return {
    id: row.id,
    user_id: row.userId,
    topic: row.topic,
    status: row.status as Conversation['status'],
    started_at: row.startedAt.toISOString(),
    ended_at: row.endedAt ? row.endedAt.toISOString() : null,
  };
}

function toMessageDto(row: {
  id: string;
  conversationId: string;
  role: string;
  language: string;
  text: string;
  sourceType: string;
  requestId: string | null;
  createdAt: Date;
}): Message {
  return {
    id: row.id,
    conversation_id: row.conversationId,
    role: row.role as Message['role'],
    language: row.language as Message['language'],
    text: row.text,
    source_type: row.sourceType as Message['source_type'],
    request_id: row.requestId,
    created_at: row.createdAt.toISOString(),
  };
}

export function conversationsRouter(prisma: PrismaClient, env: Pick<Env, 'JWT_SECRET'>): Router {
  const router = Router();
  router.use(requireAuth(env.JWT_SECRET));

  router.post(
    '/',
    validateBody(CreateConversationInputSchema),
    asyncRoute(async (req, res) => {
      const { topic } = req.body as { topic?: string };
      const conversation = await prisma.conversation.create({
        data: { userId: req.userId!, topic: topic ?? null },
      });
      const output: CreateConversationOutput = { conversation: toConversationDto(conversation) };
      res.status(201).json(output);
    }),
  );

  router.get(
    '/:conversationId',
    asyncRoute(async (req, res) => {
      const conversationId = req.params.conversationId;
      if (!conversationId) {
        throw new NotFoundError('conversation');
      }
      const conversation = await requireOwnedConversation(prisma, req.userId!, conversationId);
      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
      });
      const output: ConversationDetailOutput = {
        conversation: toConversationDto(conversation),
        messages: messages.map(toMessageDto),
      };
      res.status(200).json(output);
    }),
  );

  return router;
}
