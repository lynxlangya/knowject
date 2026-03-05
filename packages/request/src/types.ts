export interface HttpClientOptions {
  baseURL?: string;
  timeout?: number;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  dedupe?: boolean;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  detail?: any;
  requestId?: string;

  constructor(message: string, status: number, code?: string, detail?: any, requestId?: string) {
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

// Extend AxiosRequestConfig to include our custom property
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _requestId?: string;
  }
}
