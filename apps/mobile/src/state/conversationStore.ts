import { create } from 'zustand';
import type { Message, MomentCandidate, LevelSetting, CoachingStyle } from '@eikaiwa/contracts';
import * as api from '../lib/apiClient';
import { ApiError } from '../lib/apiClient';
import { generateRequestId } from '../lib/requestId';
import { conversationReducer, INITIAL_CONVERSATION_PHASE, type ConversationPhase } from './conversationMachine';

/** 個人設定・レベル推定(Phase 3以降)が入るまでの暫定デフォルト。 */
const DEFAULT_LEVEL: LevelSetting = 'intermediate';
const DEFAULT_STYLE: CoachingStyle = 'conversation';

interface PendingSuggestion {
  jpIntent: string;
  englishText: string;
  sourceMessageId: string;
}

interface ConversationState {
  conversationId: string | null;
  topic: string | null;
  messages: Message[];
  phase: ConversationPhase;
  pendingSuggestion: PendingSuggestion | null;
  momentCandidates: MomentCandidate[];
  draftText: string;

  setDraftText: (text: string) => void;
  startConversation: (token: string, topic?: string) => Promise<string>;
  loadConversation: (token: string, conversationId: string) => Promise<void>;
  requestCompose: (token: string, jpIntent: string) => Promise<void>;
  cancelCompose: () => void;
  sendReply: (token: string) => Promise<void>;
  reset: () => void;
}

function errorMessage(err: unknown): { message: string; retryable: boolean } {
  if (err instanceof ApiError) return { message: err.message, retryable: err.retryable };
  return { message: err instanceof Error ? err.message : '不明なエラーが発生しました', retryable: true };
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversationId: null,
  topic: null,
  messages: [],
  phase: INITIAL_CONVERSATION_PHASE,
  pendingSuggestion: null,
  momentCandidates: [],
  draftText: '',

  setDraftText: (text) => set({ draftText: text }),

  startConversation: async (token, topic) => {
    const { conversation } = await api.createConversation(token, { topic });
    set({
      conversationId: conversation.id,
      topic: conversation.topic,
      messages: [],
      phase: INITIAL_CONVERSATION_PHASE,
      pendingSuggestion: null,
      momentCandidates: [],
      draftText: '',
    });
    return conversation.id;
  },

  loadConversation: async (token, conversationId) => {
    const detail = await api.getConversation(token, conversationId);
    set({
      conversationId: detail.conversation.id,
      topic: detail.conversation.topic,
      messages: detail.messages,
      phase: INITIAL_CONVERSATION_PHASE,
    });
  },

  requestCompose: async (token, jpIntent) => {
    const { conversationId } = get();
    if (!conversationId) return;
    set((s) => ({ phase: conversationReducer(s.phase, { type: 'REQUEST_COMPOSE' }) }));
    try {
      const result = await api.compose(token, {
        request_id: generateRequestId('compose'),
        conversation_id: conversationId,
        jp_intent: jpIntent,
        level: DEFAULT_LEVEL,
      });
      set((s) => ({
        phase: conversationReducer(s.phase, { type: 'COMPOSE_SUCCEEDED' }),
        pendingSuggestion: {
          jpIntent,
          englishText: result.english,
          sourceMessageId: result.source_message_id,
        },
        messages: [
          ...s.messages,
          {
            id: result.source_message_id,
            conversation_id: conversationId,
            role: 'user',
            language: 'ja',
            text: jpIntent,
            source_type: 'text',
            request_id: null,
            created_at: new Date().toISOString(),
          },
        ],
      }));
    } catch (err) {
      const { message, retryable } = errorMessage(err);
      set((s) => ({ phase: conversationReducer(s.phase, { type: 'COMPOSE_FAILED', message, retryable }) }));
    }
  },

  cancelCompose: () => {
    set((s) => ({
      phase: conversationReducer(s.phase, { type: 'CANCEL_COMPOSE' }),
      pendingSuggestion: null,
    }));
  },

  sendReply: async (token) => {
    const { conversationId, draftText, pendingSuggestion } = get();
    if (!conversationId || !draftText.trim()) return;
    const spokenText = draftText.trim();
    set((s) => ({ phase: conversationReducer(s.phase, { type: 'SUBMIT_TEXT' }) }));
    try {
      const result = await api.reply(token, {
        request_id: generateRequestId('reply'),
        conversation_id: conversationId,
        spoken_text: spokenText,
        selected_translation: pendingSuggestion?.englishText,
        source_message_id: pendingSuggestion?.sourceMessageId,
        style: DEFAULT_STYLE,
      });
      const now = new Date().toISOString();
      set((s) => ({
        phase: conversationReducer(s.phase, { type: 'REPLY_SUCCEEDED' }),
        draftText: '',
        pendingSuggestion: null,
        momentCandidates: [...s.momentCandidates, ...result.moment_candidates],
        messages: [
          ...s.messages,
          {
            id: generateRequestId('local-user-msg'),
            conversation_id: conversationId,
            role: 'user',
            language: 'en',
            text: spokenText,
            source_type: 'text',
            request_id: null,
            created_at: now,
          },
          {
            id: generateRequestId('local-assistant-msg'),
            conversation_id: conversationId,
            role: 'assistant',
            language: 'en',
            text: result.reply_text,
            source_type: 'text',
            request_id: null,
            created_at: now,
          },
        ],
      }));
    } catch (err) {
      // 失敗しても入力(draftText)は保持し、再試行できるようにする。
      const { message, retryable } = errorMessage(err);
      set((s) => ({ phase: conversationReducer(s.phase, { type: 'REPLY_FAILED', message, retryable }) }));
    }
  },

  reset: () =>
    set({
      conversationId: null,
      topic: null,
      messages: [],
      phase: INITIAL_CONVERSATION_PHASE,
      pendingSuggestion: null,
      momentCandidates: [],
      draftText: '',
    }),
}));
