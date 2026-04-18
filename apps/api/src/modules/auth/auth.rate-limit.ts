import type { RequestHandler } from 'express';
import { AppError } from '@lib/app-error.js';
import { getFallbackMessage } from '@lib/locale.messages.js';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 10;

interface AuthRateLimitState {
  count: number;
  resetAt: number;
}

const authRateLimitStore = new Map<string, AuthRateLimitState>();

export const resetAuthAttemptRateLimitStore = (): void => {
  authRateLimitStore.clear();
};

const getClientKey = (routeKey: string, remoteAddress: string | undefined): string => {
  const normalizedAddress = remoteAddress?.trim() || 'unknown';
  return `${routeKey}:${normalizedAddress}`;
};

const consumeAttempt = ({
  key,
  now,
  maxAttempts,
  windowMs,
}: {
  key: string;
  now: number;
  maxAttempts: number;
  windowMs: number;
}): boolean => {
  const current = authRateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    authRateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (current.count >= maxAttempts) {
    return false;
  }

  current.count += 1;
  authRateLimitStore.set(key, current);
  return true;
};

export const createAuthAttemptRateLimit = ({
  routeKey,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  windowMs = DEFAULT_WINDOW_MS,
}: {
  routeKey: 'login' | 'register';
  maxAttempts?: number;
  windowMs?: number;
}): RequestHandler => {
  return (req, _res, next) => {
    const now = Date.now();
    const key = getClientKey(routeKey, req.ip || req.socket.remoteAddress);

    if (
      consumeAttempt({
        key,
        now,
        maxAttempts,
        windowMs,
      })
    ) {
      next();
      return;
    }

    next(
      new AppError({
        statusCode: 429,
        code: 'AUTH_RATE_LIMITED',
        message: getFallbackMessage('auth.rateLimited'),
        messageKey: 'auth.rateLimited',
      }),
    );
  };
};
