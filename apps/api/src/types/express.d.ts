// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {} from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
