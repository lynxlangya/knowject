import type { ErrorRequestHandler } from 'express';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';

interface JsonParseError extends SyntaxError {
  status?: number;
  statusCode?: number;
  type?: string;
}

const isJsonParseError = (error: unknown): error is JsonParseError => {
  if (!(error instanceof SyntaxError)) {
    return false;
  }

  const candidate = error as JsonParseError;

  return (
    (candidate.status === 400 || candidate.statusCode === 400) &&
    candidate.type === 'entity.parse.failed'
  );
};

const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  // `express.json()` 在进入路由前就会失败，但责任仍然属于客户端请求体。
  if (isJsonParseError(error)) {
    return new AppError({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: '请求体不是合法 JSON',
      details: {
        body: '请求体不是合法 JSON',
      },
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new AppError({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '服务暂时不可用',
      cause: error,
    });
  }

  return new AppError({
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: '服务暂时不可用',
  });
};

export const createErrorHandler = (env: AppEnv): ErrorRequestHandler => {
  return (error, req, res, _next) => {
    void _next;
    const normalizedError = normalizeError(error);
    const timestamp = new Date().toISOString();

    if (normalizedError.statusCode >= 500) {
      if (env.apiErrors.includeStack && normalizedError.stack) {
        console.error(`[${req.requestId}] ${normalizedError.message}\n${normalizedError.stack}`);
      } else {
        console.error(`[${req.requestId}] ${normalizedError.message}`);
      }
    }

    res.status(normalizedError.statusCode).json({
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        details: env.apiErrors.exposeDetails ? normalizedError.details : null,
      },
      meta: {
        requestId: req.requestId,
        timestamp,
      },
    });
  };
};
