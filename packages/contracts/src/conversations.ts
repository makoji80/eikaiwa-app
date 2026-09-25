import { z } from 'zod';
import { ConversationSchema, MessageSchema, Uuid } from './entities';

/** 会話の作成・一覧・詳細取得（本フェーズはテキスト会話ループの土台として使用） */

export const CreateConversationInputSchema = z.object({
  topic: z.string().max(200).optional(),
});
export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>;

export const CreateConversationOutputSchema = z.object({
  conversation: ConversationSchema,
});
export type CreateConversationOutput = z.infer<typeof CreateConversationOutputSchema>;

export const ConversationDetailOutputSchema = z.object({
  conversation: ConversationSchema,
  messages: z.array(MessageSchema),
});
export type ConversationDetailOutput = z.infer<typeof ConversationDetailOutputSchema>;

export const ConversationIdParamSchema = z.object({
  conversationId: Uuid,
});
export type ConversationIdParam = z.infer<typeof ConversationIdParamSchema>;
