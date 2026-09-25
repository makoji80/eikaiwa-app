export interface AiUsage {
  units: number;
  estimatedCost: number;
}

export interface ComposeParams {
  jpIntent: string;
  level: string;
  contextSummary?: string;
}

export interface ReplyParams {
  spokenText: string;
  selectedTranslation?: string;
  recentHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  style: string;
}

/** ComposeOutputSchema / ReplyOutputSchema と同じ形になるはずの生出力（呼び出し側でZod検証する）。 */
export interface AiResult<TOutput> {
  output: TOutput;
  usage: AiUsage;
}

export interface AiProvider {
  compose(params: ComposeParams): Promise<AiResult<unknown>>;
  reply(params: ReplyParams): Promise<AiResult<unknown>>;
}
