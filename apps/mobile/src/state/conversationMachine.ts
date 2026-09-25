/**
 * 会話フロー(仕様書 v2.0 セクション5)の状態機械。
 * `idle → listening → transcribing → composing_en → awaiting_user_text
 *   → generating_reply → speaking_reply → idle` の音声込みのループを表す。
 * テキスト入力時は listening/transcribing を経由せず直接 composing_en / generating_reply へ進む。
 *
 * pendingSuggestion（AI提案の英語）はこのstateではなくstore側の別フィールドで保持する。
 * 録音の起点(JP意図の録音 / 実際の英語発話の録音)によらず、転記後は常に idle に戻り、
 * ユーザーが明示的に次の操作（英語にする／送信）を行うまで自動遷移しない
 * （押して話す方式のみ・自動聞き取り再開はしない）。
 */

export type ConversationPhase =
  | { status: 'idle' }
  | { status: 'listening' }
  | { status: 'transcribing' }
  | { status: 'composing_en' }
  | { status: 'awaiting_user_text' }
  | { status: 'generating_reply' }
  | { status: 'speaking_reply' }
  | { status: 'paused' }
  | { status: 'error'; message: string; retryable: boolean };

export type ConversationEvent =
  | { type: 'START_RECORDING' }
  | { type: 'RECORDING_FAILED'; message: string; retryable: boolean }
  | { type: 'STOP_RECORDING' }
  | { type: 'TRANSCRIBE_SUCCEEDED' }
  | { type: 'TRANSCRIBE_FAILED'; message: string; retryable: boolean }
  | { type: 'REQUEST_COMPOSE' }
  | { type: 'COMPOSE_SUCCEEDED' }
  | { type: 'COMPOSE_FAILED'; message: string; retryable: boolean }
  | { type: 'CANCEL_COMPOSE' }
  | { type: 'SUBMIT_TEXT' }
  | { type: 'REPLY_SUCCEEDED' }
  | { type: 'REPLY_FAILED'; message: string; retryable: boolean }
  | { type: 'SPEECH_DONE' }
  | { type: 'RETRY' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' };

export const INITIAL_CONVERSATION_PHASE: ConversationPhase = { status: 'idle' };

export function conversationReducer(state: ConversationPhase, event: ConversationEvent): ConversationPhase {
  switch (event.type) {
    case 'START_RECORDING':
      return { status: 'listening' };
    case 'RECORDING_FAILED':
      return { status: 'error', message: event.message, retryable: event.retryable };
    case 'STOP_RECORDING':
      return { status: 'transcribing' };
    case 'TRANSCRIBE_SUCCEEDED':
      // 転記結果はJP意図欄/英語入力欄のどちらかに反映され、本人の確認・編集を待つ。
      return { status: 'idle' };
    case 'TRANSCRIBE_FAILED':
      return { status: 'error', message: event.message, retryable: event.retryable };
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
      return { status: 'speaking_reply' };
    case 'REPLY_FAILED':
      // 直前の入力はUI側(store)が保持したまま、editable状態に戻す。
      return { status: 'error', message: event.message, retryable: event.retryable };
    case 'SPEECH_DONE':
      return { status: 'idle' };
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
