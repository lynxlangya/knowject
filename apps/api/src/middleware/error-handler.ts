import type { ErrorRequestHandler } from 'express';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import { resolveLocalizedAppErrorMessage } from '@lib/app-error-message.js';
import { createErrorEnvelope } from '@lib/api-response.js';
import type { SupportedLocale } from '@lib/locale.js';
import { DEFAULT_LOCALE } from '@lib/locale.js';
import { getFallbackMessage, getMessage } from '@lib/locale.messages.js';

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

const INVALID_JSON_MESSAGE_KEY = 'api.validation.invalidJson';
const INTERNAL_ERROR_MESSAGE_KEY = 'api.internalError';

const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  // `express.json()` 在进入路由前就会失败，但责任仍然属于客户端请求体。
  if (isJsonParseError(error)) {
    const message = getFallbackMessage(INVALID_JSON_MESSAGE_KEY);

    return new AppError({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message,
      messageKey: INVALID_JSON_MESSAGE_KEY,
      details: {
        body: message,
      },
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new AppError({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: getFallbackMessage(INTERNAL_ERROR_MESSAGE_KEY),
      messageKey: INTERNAL_ERROR_MESSAGE_KEY,
      cause: error,
    });
  }

  return new AppError({
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: getFallbackMessage(INTERNAL_ERROR_MESSAGE_KEY),
    messageKey: INTERNAL_ERROR_MESSAGE_KEY,
  });
};

const resolveErrorMessage = (error: AppError, locale: SupportedLocale): string => {
  return resolveLocalizedAppErrorMessage(error, locale);
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

  if (error.messageKey === 'api.validation.invalidJson') {
    if (!error.details || typeof error.details !== 'object') {
      return error.details;
    }

    return {
      ...(error.details as Record<string, unknown>),
      body: message,
    };
  }

  if (!error.details || typeof error.details !== 'object') {
    return error.details;
  }

  const details = error.details as {
    fields?: Record<string, string>;
  } & Record<string, unknown>;

  if (!error.messageKey || !details.fields || typeof details.fields !== 'object') {
    return error.details;
  }

  const localizedMessage = getMessage(
    error.messageKey,
    locale,
    error.messageParams,
  );

  if (!localizedMessage) {
    return error.details;
  }

  const fallbackMessage = getMessage(
    error.messageKey,
    DEFAULT_LOCALE,
    error.messageParams,
  );
  const fallbackZhMessage = getMessage(
    error.messageKey,
    'zh-CN',
    error.messageParams,
  );
  const localizedFields: Record<string, string> = {};

  for (const [field, fieldValue] of Object.entries(details.fields)) {
    if (
      fieldValue === error.message ||
      fieldValue === fallbackMessage ||
      fieldValue === fallbackZhMessage
    ) {
      localizedFields[field] = localizedMessage;
      continue;
    }

    localizedFields[field] = fieldValue;
  }

  return {
    ...details,
    fields: localizedFields,
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
