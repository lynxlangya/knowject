export interface HttpClientOptions {
  baseURL?: string;
  timeout?: number;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  dedupe?: boolean;
}

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

export class ApiError extends Error {
  status: number;
  code?: string;
  detail?: unknown;
  requestId?: string;

  constructor(message: string, status: number, code?: string, detail?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiError';
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

// Extend AxiosRequestConfig to include our custom property
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _requestId?: string;
  }
}
