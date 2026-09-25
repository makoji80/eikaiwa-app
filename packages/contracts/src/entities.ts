import { z } from 'zod';

/**
 * ドメインエンティティの Zod スキーマ。
 * フィールド名は仕様書 v2.0 セクション7の論理モデルに合わせている。
 * enum値は仕様書が明示していないものは実装上の初期案であり、変更の余地がある。
 */

export const IsoDateTime = z.string().datetime({ offset: true });
export const Uuid = z.string().uuid();

export const ConsentFlagsSchema = z.object({
  storeAudio: z.boolean().default(false),
  storeConversationHistory: z.boolean().default(true),
  useForModelImprovement: z.boolean().default(false),
});
export type ConsentFlags = z.infer<typeof ConsentFlagsSchema>;

export const CoachingModeSchema = z.enum(['conversation', 'coaching', 'intensive']);
export type CoachingMode = z.infer<typeof CoachingModeSchema>;

export const UserProfileSchema = z.object({
  id: Uuid,
  locale: z.string().default('ja-JP'),
  level_setting: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  consent_flags: ConsentFlagsSchema,
  coaching_mode: CoachingModeSchema.default('conversation'),
  created_at: IsoDateTime,
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const ConversationStatusSchema = z.enum(['active', 'paused', 'ended']);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

export const ConversationSchema = z.object({
  id: Uuid,
  user_id: Uuid,
  topic: z.string().max(200).nullable(),
  status: ConversationStatusSchema,
  started_at: IsoDateTime,
  ended_at: IsoDateTime.nullable(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const MessageRoleSchema = z.enum(['user', 'assistant']);
export const MessageLanguageSchema = z.enum(['ja', 'en']);
export const MessageSourceTypeSchema = z.enum(['text', 'voice']);

export const MessageSchema = z.object({
  id: Uuid,
  conversation_id: Uuid,
  role: MessageRoleSchema,
  language: MessageLanguageSchema,
  text: z.string().min(1),
  source_type: MessageSourceTypeSchema,
  request_id: z.string().min(1).max(200).nullable(),
  created_at: IsoDateTime,
});
export type Message = z.infer<typeof MessageSchema>;

export const SpeechAssetSchema = z.object({
  id: Uuid,
  message_id: Uuid,
  storage_ref: z.string(),
  duration_ms: z.number().int().nonnegative(),
  retention_until: IsoDateTime.nullable(),
});
export type SpeechAsset = z.infer<typeof SpeechAssetSchema>;

/**
 * user_spoke: 本人が実際にこの英語を発話/入力して送信した場合のみ true。
 * compose の候補を表示しただけでは true にしない（仕様書 5. / 10.2）。
 */
export const TranslationAttemptSchema = z.object({
  id: Uuid,
  source_message_id: Uuid,
  source_text: z.string(),
  suggested_text: z.string(),
  selected_text: z.string().nullable(),
  user_spoke: z.boolean(),
  matches_suggestion: z.boolean(),
  confidence: z.number().min(0).max(1).nullable(),
});
export type TranslationAttempt = z.infer<typeof TranslationAttemptSchema>;

export const EnglishMomentStateSchema = z.enum([
  'unknown',
  'recognized',
  'produced_with_help',
  'produced_independently',
  'retained',
]);
export type EnglishMomentState = z.infer<typeof EnglishMomentStateSchema>;

export const EnglishMomentSchema = z.object({
  id: Uuid,
  user_id: Uuid,
  source_message_id: Uuid,
  jp_intent: z.string(),
  en_expression: z.string(),
  state: EnglishMomentStateSchema,
  next_review_at: IsoDateTime.nullable(),
  archived_at: IsoDateTime.nullable(),
});
export type EnglishMoment = z.infer<typeof EnglishMomentSchema>;

export const AssistanceLevelSchema = z.enum(['none', 'hint', 'shown_answer']);
export const ReviewOutcomeSchema = z.enum(['correct', 'partial', 'incorrect', 'skipped']);

export const ReviewAttemptSchema = z.object({
  id: Uuid,
  moment_id: Uuid,
  prompt: z.string(),
  answer: z.string(),
  assistance_level: AssistanceLevelSchema,
  outcome: ReviewOutcomeSchema,
  reviewed_at: IsoDateTime,
});
export type ReviewAttempt = z.infer<typeof ReviewAttemptSchema>;

export const LearningProfileSchema = z.object({
  user_id: Uuid,
  topics: z.array(z.string()),
  preferences: z.record(z.string(), z.unknown()),
  observed_patterns: z.record(z.string(), z.unknown()),
  updated_at: IsoDateTime,
});
export type LearningProfile = z.infer<typeof LearningProfileSchema>;

export const DailyLessonStatusSchema = z.enum(['draft', 'ready', 'archived']);

export const DailyLessonSchema = z.object({
  id: Uuid,
  user_id: Uuid,
  source_conversation_ids: z.array(Uuid),
  text: z.string(),
  status: DailyLessonStatusSchema,
  created_at: IsoDateTime,
});
export type DailyLesson = z.infer<typeof DailyLessonSchema>;

export const AssessmentSchema = z.object({
  id: Uuid,
  user_id: Uuid,
  dimension: z.string(),
  evidence_refs: z.array(z.string()),
  estimate: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  assessed_at: IsoDateTime,
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const UsageEventSchema = z.object({
  id: Uuid,
  user_id: Uuid,
  feature: z.string(),
  units: z.number().nonnegative(),
  estimated_cost: z.number().nonnegative(),
  occurred_at: IsoDateTime,
});
export type UsageEvent = z.infer<typeof UsageEventSchema>;
