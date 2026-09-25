import type { AiProvider, ComposeParams, ReplyParams, TranscribeParams } from './types';

/**
 * ネットワーク呼び出しなしの決定論的モック。実鍵が無い環境でもcompose/replyの
 * 契約検証・冪等性・分離テストを全経路確認するために使う（本物の翻訳/対話はしない）。
 */
export class MockAiProvider implements AiProvider {
  async compose(params: ComposeParams) {
    return {
      output: {
        english: `(mock) ${params.jpIntent}`.slice(0, 300),
        alternatives: [],
        clarification: null,
        rationale_short: '開発用モック応答です（実際の翻訳ではありません）。',
      },
      usage: { units: 0, estimatedCost: 0 },
    };
  }

  async reply(params: ReplyParams) {
    const strugglesToSpeak = params.spokenText.trim().length < 3;
    return {
      output: {
        reply_text: `(mock) That's interesting — tell me more about "${params.spokenText}".`,
        follow_up: null,
        correction: null,
        moment_candidates: strugglesToSpeak
          ? [
              {
                jp_intent: params.spokenText,
                en_expression: params.selectedTranslation ?? params.spokenText,
                reason: 'could_not_say' as const,
              },
            ]
          : [],
      },
      usage: { units: 0, estimatedCost: 0 },
    };
  }

  async transcribe(params: TranscribeParams) {
    const isJapanese = params.locale.startsWith('ja');
    return {
      output: {
        transcript: isJapanese
          ? '（モック文字起こし）音声の内容は解析していません。'
          : '(mock transcript) Audio content was not actually analyzed.',
        language: isJapanese ? ('ja' as const) : ('en' as const),
        confidence: null,
      },
      usage: { units: 0, estimatedCost: 0 },
    };
  }
}
