import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, signup as apiSignup, ApiError } from '../lib/apiClient';

/**
 * JWTは expo-secure-store に保存する（AsyncStorageへの平文保存はしない）。
 * 開発用の自前認証(email+password)。マネージド認証基盤への置き換えは未決事項。
 */
const TOKEN_KEY = 'eikaiwa.access_token';
const USER_ID_KEY = 'eikaiwa.user_id';

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  token: string | null;
  userId: string | null;
  error: string | null;
  hydrate: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  token: null,
  userId: null,
  error: null,

  hydrate: async () => {
    const [token, userId] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_ID_KEY),
    ]);
    if (token && userId) {
      set({ status: 'signedIn', token, userId, error: null });
    } else {
      set({ status: 'signedOut', token: null, userId: null });
    }
  },

  signUp: async (email, password) => {
    try {
      const result = await apiSignup(email, password);
      await SecureStore.setItemAsync(TOKEN_KEY, result.access_token);
      await SecureStore.setItemAsync(USER_ID_KEY, result.user_id);
      set({ status: 'signedIn', token: result.access_token, userId: result.user_id, error: null });
    } catch (err) {
      set({ error: messageFor(err, '登録に失敗しました') });
      throw err;
    }
  },

  signIn: async (email, password) => {
    try {
      const result = await apiLogin(email, password);
      await SecureStore.setItemAsync(TOKEN_KEY, result.access_token);
      await SecureStore.setItemAsync(USER_ID_KEY, result.user_id);
      set({ status: 'signedIn', token: result.access_token, userId: result.user_id, error: null });
    } catch (err) {
      set({ error: messageFor(err, 'ログインに失敗しました') });
      throw err;
    }
  },

  signOut: async () => {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_ID_KEY)]);
    set({ status: 'signedOut', token: null, userId: null, error: null });
  },
}));
