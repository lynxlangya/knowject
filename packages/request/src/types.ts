import type { ApiEnvelope } from "./contracts";

export interface HttpClientOptions {
  baseURL?: string;
  timeout?: number;
  getToken?: () => string | null;
  getLocale?: () => string | null;
  onUnauthorized?: () => void;
  dedupe?: boolean;
}

export type { ApiEnvelope, ApiMeta } from "./contracts";

export interface ApiErrorResponseBody {
  code?: string;
  message?: string;
  data?: unknown;
  meta?: {
    requestId?: string;
    timestamp?: string;
    details?: unknown;
  };
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
  detail?: unknown;
}

export interface ApiErrorPayload {
  message: string;
  code?: string;
  detail?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  detail?: unknown;
  requestId?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    detail?: unknown,
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.requestId = requestId;
  }
}

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

export const unwrapApiData = <T>(envelope: ApiEnvelope<T>): T => {
  return envelope.data;
};

export const extractApiErrorPayload = (
  body: unknown,
  fallback: {
    message: string;
    requestId?: string;
  },
): ApiErrorPayload => {
  if (typeof body === "string" && body.trim()) {
    return {
      message: body,
      requestId: fallback.requestId,
    };
  }

  const responseBody =
    body && typeof body === "object"
      ? (body as ApiErrorResponseBody)
      : undefined;

  return {
    message:
      responseBody?.message || responseBody?.error?.message || fallback.message,
    code: responseBody?.code || responseBody?.error?.code,
    detail:
      responseBody?.meta?.details ??
      responseBody?.error?.details ??
      responseBody?.detail ??
      responseBody,
    requestId: responseBody?.meta?.requestId || fallback.requestId,
  };
};

// Extend AxiosRequestConfig to include our custom property
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _requestId?: string;
  }
}
