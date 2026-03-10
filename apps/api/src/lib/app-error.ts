interface AppErrorOptions {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;

  constructor({ statusCode, code, message, details = null, cause }: AppErrorOptions) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
