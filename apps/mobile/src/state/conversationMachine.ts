/**
 * 会話フロー(仕様書 v2.0 セクション5)の状態機械。テキストのみのフェーズなので
 * listening/transcribing/speaking_reply 等の音声系状態は未実装だが、これらを
 * 後から追加できるよう discriminated union + 純粋関数のreducerとして切り出す。
 */

export type ConversationPhase =
  | { status: 'idle' }
  | { status: 'composing_en' }
  | { status: 'awaiting_user_text' }
  | { status: 'generating_reply' }
  | { status: 'paused' }
  | { status: 'error'; message: string; retryable: boolean };

export type ConversationEvent =
  | { type: 'REQUEST_COMPOSE' }
  | { type: 'COMPOSE_SUCCEEDED' }
  | { type: 'COMPOSE_FAILED'; message: string; retryable: boolean }
  | { type: 'CANCEL_COMPOSE' }
  | { type: 'SUBMIT_TEXT' }
  | { type: 'REPLY_SUCCEEDED' }
  | { type: 'REPLY_FAILED'; message: string; retryable: boolean }
  | { type: 'RETRY' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' };

export const INITIAL_CONVERSATION_PHASE: ConversationPhase = { status: 'idle' };

export function conversationReducer(state: ConversationPhase, event: ConversationEvent): ConversationPhase {
  switch (event.type) {
    case 'REQUEST_COMPOSE':
      return { status: 'composing_en' };
    case 'COMPOSE_SUCCEEDED':
      return { status: 'awaiting_user_text' };
    case 'COMPOSE_FAILED':
      return { status: 'error', message: event.message, retryable: event.retryable };
    case 'CANCEL_COMPOSE':
      return { status: 'idle' };
    case 'SUBMIT_TEXT':
      return { status: 'generating_reply' };
    case 'REPLY_SUCCEEDED':
      return { status: 'idle' };
    case 'REPLY_FAILED':
      // 直前の入力はUI側(store)が保持したまま、editable状態に戻す。
      return { status: 'error', message: event.message, retryable: event.retryable };
    case 'RETRY':
      return { status: 'idle' };
    case 'PAUSE':
      return { status: 'paused' };
    case 'RESUME':
      return { status: 'idle' };
    case 'RESET':
      return INITIAL_CONVERSATION_PHASE;
    default:
      return state;
  }
}
