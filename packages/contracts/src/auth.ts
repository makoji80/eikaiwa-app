import { z } from 'zod';

/**
 * 開発用の自前認証（email+password+JWT）の契約。
 * 本番ではマネージド認証基盤への置き換えを想定（docs/OPEN-QUESTIONS.md参照）。
 */

export const SignupInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type SignupInput = z.infer<typeof SignupInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const AuthTokenOutputSchema = z.object({
  access_token: z.string(),
  user_id: z.string().uuid(),
  expires_at: z.string().datetime({ offset: true }),
});
export type AuthTokenOutput = z.infer<typeof AuthTokenOutputSchema>;
