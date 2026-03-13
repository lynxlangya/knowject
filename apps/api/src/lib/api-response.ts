import type { Request, Response } from 'express';

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  code: string;
  message: string;
  data: T;
  meta: ApiMeta;
}

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
}

const createApiMeta = ({
  requestId,
  timestamp = new Date().toISOString(),
  details,
}: Omit<CreateApiEnvelopeOptions<unknown>, 'code' | 'message' | 'data'>): ApiMeta => {
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
  return statusCode === 201 ? 'CREATED' : 'SUCCESS';
};

const getSuccessMessage = (statusCode: number): string => {
  return statusCode === 201 ? '创建成功' : '请求成功';
};

export const sendSuccess = <T>(
  response: Response,
  data: T,
  options: SendSuccessOptions = {},
): Response<ApiEnvelope<T>> => {
  const statusCode = options.statusCode ?? 200;

  return response.status(statusCode).json(
    createApiEnvelope({
      code: options.code ?? getSuccessCode(statusCode),
      message: options.message ?? getSuccessMessage(statusCode),
      data,
      requestId: response.req.requestId,
    }),
  );
};

export const sendCreated = <T>(
  response: Response,
  data: T,
  options: Omit<SendSuccessOptions, 'statusCode'> = {},
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
