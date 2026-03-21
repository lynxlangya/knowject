import type { ErrorRequestHandler } from 'express';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import { createErrorEnvelope } from '@lib/api-response.js';
import type { SupportedLocale } from '@lib/locale.js';
import { DEFAULT_LOCALE } from '@lib/locale.js';
import { getMessage } from '@lib/locale.messages.js';

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
      messageKey: 'api.validation.invalidJson',
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
      messageKey: 'api.internalError',
      cause: error,
    });
  }

  return new AppError({
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: '服务暂时不可用',
    messageKey: 'api.internalError',
  });
};

const resolveErrorMessage = (error: AppError, locale: SupportedLocale): string => {
  if (error.preserveMessage) {
    return error.message;
  }

  return getMessage(error.messageKey, locale) ?? error.message;
};

const resolveErrorDetails = (
  error: AppError,
  message: string,
  locale: SupportedLocale,
  exposeDetails: boolean,
): unknown => {
  if (!exposeDetails) {
    return undefined;
  }

  if (error.messageKey !== 'api.validation.invalidJson') {
    if (!error.messageKey?.startsWith('validation.')) {
      return error.details;
    }

    if (locale === 'zh-CN') {
      return error.details;
    }

    if (!error.details || typeof error.details !== 'object') {
      return error.details;
    }

    const details = error.details as { fields?: Record<string, string> };

    if (!details.fields || typeof details.fields !== 'object') {
      return error.details;
    }

    const localizedMessage = getMessage(error.messageKey, locale);

    if (!localizedMessage) {
      return error.details;
    }

    const localizedFields: Record<string, string> = {};

    for (const field of Object.keys(details.fields)) {
      localizedFields[field] = localizedMessage;
    }

    return {
      ...details,
      fields: localizedFields,
    };
  }

  if (!error.details || typeof error.details !== 'object') {
    return error.details;
  }

  return {
    ...(error.details as Record<string, unknown>),
    body: message,
  };
};

export const createErrorHandler = (env: AppEnv): ErrorRequestHandler => {
  return (error, req, res, _next) => {
    void _next;
    const normalizedError = normalizeError(error);
    const locale = req.locale ?? DEFAULT_LOCALE;
    const responseMessage = resolveErrorMessage(normalizedError, locale);
    if (normalizedError.statusCode >= 500) {
      if (env.apiErrors.includeStack && normalizedError.stack) {
        console.error(`[${req.requestId}] ${normalizedError.message}\n${normalizedError.stack}`);
      } else {
        console.error(`[${req.requestId}] ${normalizedError.message}`);
      }
    }

    res.status(normalizedError.statusCode).json(
      createErrorEnvelope({
        request: req,
        code: normalizedError.code,
        message: responseMessage,
        details: resolveErrorDetails(
          normalizedError,
          responseMessage,
          locale,
          env.apiErrors.exposeDetails,
        ),
      }),
    );
  };
};
