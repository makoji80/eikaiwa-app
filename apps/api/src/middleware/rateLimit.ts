import rateLimit from 'express-rate-limit';

/**
 * 簡易的な濫用対策。本格的なレート制限・不正利用検知は未実装
 * （docs/OPEN-QUESTIONS.md に既知のギャップとして記録）。
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'しばらくしてから再試行してください', retryable: true } },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'しばらくしてから再試行してください', retryable: true } },
});
