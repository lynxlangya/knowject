import type { RequestHandler } from 'express';
import { AppError } from '@lib/app-error.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: '请求的接口不存在',
      messageKey: 'api.notFound',
      details: {
        method: req.method,
        path: req.originalUrl,
      },
    }),
  );
};
