import type { RequestHandler } from 'express';
import { AppError } from '@lib/app-error.js';
import { getFallbackMessage } from '@lib/locale.messages.js';
import type { AuthService } from './auth.service.js';

const getTokenFromHeader = (authorization: string | undefined): string | null => {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
};

export const createRequireAuth = (authService: AuthService): RequestHandler => {
  return async (req, _res, next) => {
    const token = getTokenFromHeader(req.header('authorization'));

    if (!token) {
      next(
        new AppError({
          statusCode: 401,
          code: 'AUTH_TOKEN_INVALID',
          message: getFallbackMessage('auth.token.invalid'),
          messageKey: 'auth.token.invalid',
        }),
      );
      return;
    }

    try {
      req.authUser = await authService.verifyAccessToken(token);
      next();
    } catch (error) {
      next(
        new AppError({
          statusCode: 401,
          code: 'AUTH_TOKEN_INVALID',
          message: getFallbackMessage('auth.token.invalid'),
          messageKey: 'auth.token.invalid',
          cause: error,
        }),
      );
    }
  };
};
