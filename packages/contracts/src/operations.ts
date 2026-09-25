import { z } from 'zod';
import { EnglishMomentSchema, MessageLanguageSchema, Uuid } from './entities';

/**
 * 仕様書 v2.0 セクション8「API・AI契約」の操作契約。
 * パス・実際のAIプロバイダ/モデル名はここには含めない（実装詳細）。
 * request_id は idempotency key として使う。
 */

export const LevelSettingSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type LevelSetting = z.infer<typeof LevelSettingSchema>;

export const CoachingStyleSchema = z.enum(['conversation', 'coaching', 'intensive']);
export type CoachingStyle = z.infer<typeof CoachingStyleSchema>;

// --- transcribe ---
export const TranscribeInputSchema = z.object({
  request_id: z.string().min(1).max(200),
  locale: z.string().default('ja-JP'),
  upload_ref: z.string(),
});
export type TranscribeInput = z.infer<typeof TranscribeInputSchema>;

export const TranscribeOutputSchema = z.object({
  transcript: z.string(),
  language: MessageLanguageSchema,
  confidence: z.number().min(0).max(1).nullable(),
});
export type TranscribeOutput = z.infer<typeof TranscribeOutputSchema>;

// --- compose ---
export const ComposeInputSchema = z.object({
  request_id: z.string().min(1).max(200),
  conversation_id: Uuid,
  jp_intent: z.string().min(1).max(2000),
  level: LevelSettingSchema,
  context_summary: z.string().max(4000).optional(),
});
export type ComposeInput = z.infer<typeof ComposeInputSchema>;

/** AIプロバイダが直接返す形（source_message_idはサーバーが後から付与する）。 */
export const ComposeAiOutputSchema = z.object({
  english: z.string().min(1),
  alternatives: z.array(z.string()).default([]),
  clarification: z.string().nullable().default(null),
  rationale_short: z.string().nullable().default(null),
});
export type ComposeAiOutput = z.infer<typeof ComposeAiOutputSchema>;

export const ComposeOutputSchema = z.object({
  english: z.string().min(1),
  alternatives: z.array(z.string()).default([]),
  clarification: z.string().nullable().default(null),
  rationale_short: z.string().nullable().default(null),
  /**
   * 仕様書セクション8の契約表には無い実装拡張フィールド。
   * このcompose呼び出しで保存された日本語意図メッセージのID。reply呼び出し時に
   * source_message_id として渡すことで「提案した英語」と「本人が実際に発話した英語」を
   * サーバー側で確実に区別する（TranslationAttempt.user_spoke の根拠になる）。
   */
  source_message_id: Uuid,
});
export type ComposeOutput = z.infer<typeof ComposeOutputSchema>;

// --- reply ---
export const ReplyInputSchema = z.object({
  request_id: z.string().min(1).max(200),
  conversation_id: Uuid,
  spoken_text: z.string().min(1).max(4000),
  selected_translation: z.string().max(4000).optional(),
  /**
   * 仕様書セクション8の契約表には無い実装拡張フィールド。
   * 直前の compose 応答の source_message_id。指定された場合、対応する
   * TranslationAttempt に selected_text / user_spoke=true を記録する。
   * 指定しない場合はcomposeを経由せず直接発話したものとして扱う。
   */
  source_message_id: Uuid.optional(),
  style: CoachingStyleSchema.default('conversation'),
});
export type ReplyInput = z.infer<typeof ReplyInputSchema>;

export const MomentCandidateSchema = z.object({
  jp_intent: z.string(),
  en_expression: z.string(),
  reason: z.enum(['could_not_say', 'asked_for_help', 'repeated_error']),
});
export type MomentCandidate = z.infer<typeof MomentCandidateSchema>;

export const ReplyOutputSchema = z.object({
  reply_text: z.string().min(1),
  follow_up: z.string().nullable().default(null),
  correction: z.string().nullable().default(null),
  moment_candidates: z.array(MomentCandidateSchema).max(5).default([]),
});
export type ReplyOutput = z.infer<typeof ReplyOutputSchema>;

// --- synthesize ---
export const SynthesizeInputSchema = z.object({
  request_id: z.string().min(1).max(200),
  text: z.string().min(1).max(4000),
  voice_preference: z.string().optional(),
});
export type SynthesizeInput = z.infer<typeof SynthesizeInputSchema>;

export const SynthesizeOutputSchema = z.object({
  playable_audio_ref: z.string(),
});
export type SynthesizeOutput = z.infer<typeof SynthesizeOutputSchema>;

// --- save_moment ---
export const SaveMomentInputSchema = z.object({
  request_id: z.string().min(1).max(200),
  expression: EnglishMomentSchema.pick({ jp_intent: true, en_expression: true }),
  source_ref: Uuid.optional(),
  consent: z.boolean(),
});
export type SaveMomentInput = z.infer<typeof SaveMomentInputSchema>;

export const SaveMomentOutputSchema = z.object({
  moment_id: Uuid,
  revision: z.number().int().nonnegative(),
});
export type SaveMomentOutput = z.infer<typeof SaveMomentOutputSchema>;

// --- review ---
export const ReviewInputSchema = z.object({
  moment_id: Uuid,
  prompt_context: z.string(),
  answer: z.string(),
  assistance: z.enum(['none', 'hint', 'shown_answer']),
});
export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export const ReviewOutputSchema = z.object({
  feedback: z.string(),
  next_review_at: z.string().datetime({ offset: true }),
  state: z.enum(['unknown', 'recognized', 'produced_with_help', 'produced_independently', 'retained']),
});
export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;

// --- daily_lesson ---
export const DailyLessonInputSchema = z.object({
  request_id: z.string().min(1).max(200),
  duration_target_sec: z.number().int().min(60).max(180),
  source_conversation_ids: z.array(Uuid),
  level: LevelSettingSchema,
});
export type DailyLessonInput = z.infer<typeof DailyLessonInputSchema>;

export const DailyLessonOutputSchema = z.object({
  lesson_id: Uuid,
  text: z.string(),
  checks: z.object({
    factRetained: z.boolean(),
    levelAppropriate: z.boolean(),
  }),
});
export type DailyLessonOutput = z.infer<typeof DailyLessonOutputSchema>;

// --- 共通エラー形状 ---
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
