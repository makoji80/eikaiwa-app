import type {
  AuthTokenOutput,
  ComposeInput,
  ComposeOutput,
  ReplyInput,
  ReplyOutput,
  CreateConversationInput,
  CreateConversationOutput,
  ConversationDetailOutput,
  TranscribeInput,
  TranscribeOutput,
} from '@eikaiwa/contracts';

/**
 * EXPO_PUBLIC_ プレフィックスの環境変数はビルド時にクライアントへ埋め込まれる。
 * ここに秘密値（AIプロバイダの鍵、DB接続情報等）を絶対に置かない — サーバーだけが保持する。
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
}

interface ErrorBody {
  error?: { code: string; message: string; retryable: boolean };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network_error', 'サーバーに接続できませんでした。通信状況をご確認ください', true);
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const errBody = json as ErrorBody | null;
    throw new ApiError(
      res.status,
      errBody?.error?.code ?? 'unknown_error',
      errBody?.error?.message ?? 'サーバーエラーが発生しました',
      errBody?.error?.retryable ?? true,
    );
  }
  return json as T;
}

export function signup(email: string, password: string): Promise<AuthTokenOutput> {
  return request('/api/auth/signup', { method: 'POST', body: { email, password } });
}

export function login(email: string, password: string): Promise<AuthTokenOutput> {
  return request('/api/auth/login', { method: 'POST', body: { email, password } });
}

export function createConversation(
  token: string,
  input: CreateConversationInput,
): Promise<CreateConversationOutput> {
  return request('/api/conversations', { method: 'POST', token, body: input });
}

export function getConversation(token: string, conversationId: string): Promise<ConversationDetailOutput> {
  return request(`/api/conversations/${conversationId}`, { token });
}

export function compose(token: string, input: ComposeInput): Promise<ComposeOutput> {
  return request('/api/compose', { method: 'POST', token, body: input });
}

export function reply(token: string, input: ReplyInput): Promise<ReplyOutput> {
  return request('/api/reply', { method: 'POST', token, body: input });
}

export function transcribe(token: string, input: TranscribeInput): Promise<TranscribeOutput> {
  return request('/api/transcribe', { method: 'POST', token, body: input });
}
