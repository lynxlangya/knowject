import type { Request, Response } from "express";
import type { ApiEnvelope, ApiMeta } from "@knowject/request-contracts";
import type { SupportedLocale } from "./locale.js";
import { DEFAULT_LOCALE } from "./locale.js";
import type { MessageKey } from "./locale.messages.js";
import { getMessage } from "./locale.messages.js";

export type { ApiEnvelope, ApiMeta } from "@knowject/request-contracts";

interface CreateApiEnvelopeOptions<T> {
  code: string;
  message: string;
  data: T;
  requestId: string;
  timestamp?: string;
  details?: unknown;
}

interface SendSuccessOptions {
  statusCode?: number;
  code?: string;
  message?: string;
  messageKey?: MessageKey;
}

const createApiMeta = ({
  requestId,
  timestamp = new Date().toISOString(),
  details,
}: Omit<
  CreateApiEnvelopeOptions<unknown>,
  "code" | "message" | "data"
>): ApiMeta => {
  if (details === undefined) {
    return {
      requestId,
      timestamp,
    };
  }

  return {
    requestId,
    timestamp,
    details,
  };
};

export const createApiEnvelope = <T>({
  code,
  message,
  data,
  requestId,
  timestamp,
  details,
}: CreateApiEnvelopeOptions<T>): ApiEnvelope<T> => {
  return {
    code,
    message,
    data,
    meta: createApiMeta({
      requestId,
      timestamp,
      details,
    }),
  };
};

const getSuccessCode = (statusCode: number): string => {
  return statusCode === 201 ? "CREATED" : "SUCCESS";
};

const getSuccessMessageKey = (statusCode: number): MessageKey => {
  return statusCode === 201 ? "api.created" : "api.success";
};

const resolveSuccessMessage = (
  statusCode: number,
  locale: SupportedLocale | undefined,
  options: SendSuccessOptions,
): string => {
  if (options.message) {
    return options.message;
  }

  const resolvedLocale = locale ?? DEFAULT_LOCALE;
  const messageKey = options.messageKey ?? getSuccessMessageKey(statusCode);

  return (
    getMessage(messageKey, resolvedLocale) ??
    getMessage(getSuccessMessageKey(statusCode), DEFAULT_LOCALE) ??
    ""
  );
};

export const sendSuccess = <T>(
  response: Response,
  data: T,
  options: SendSuccessOptions = {},
): Response<ApiEnvelope<T>> => {
  const statusCode = options.statusCode ?? 200;
  const locale = response.req.locale;

  return response.status(statusCode).json(
    createApiEnvelope({
      code: options.code ?? getSuccessCode(statusCode),
      message: resolveSuccessMessage(statusCode, locale, options),
      data,
      requestId: response.req.requestId,
    }),
  );
};

export const sendCreated = <T>(
  response: Response,
  data: T,
  options: Omit<SendSuccessOptions, "statusCode"> = {},
): Response<ApiEnvelope<T>> => {
  return sendSuccess(response, data, {
    ...options,
    statusCode: 201,
  });
};

export const createErrorEnvelope = ({
  request,
  code,
  message,
  details,
}: {
  request: Request;
  code: string;
  message: string;
  details?: unknown;
}): ApiEnvelope<null> => {
  return createApiEnvelope({
    code,
    message,
    data: null,
    requestId: request.requestId,
    details,
  });
};
