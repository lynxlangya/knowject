import type { RequestHandler } from 'express';
import { AppError } from '@lib/app-error.js';
import { getFallbackMessage } from '@lib/locale.messages.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  const messageKey = 'api.notFound';

  next(
    new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: getFallbackMessage(messageKey),
      messageKey,
      details: {
        method: req.method,
        path: req.originalUrl,
      },
    }),
  );
};
