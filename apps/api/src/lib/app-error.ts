import type { MessageKey } from './locale.messages.js';

interface AppErrorOptions {
  statusCode: number;
  code: string;
  message: string;
  messageKey?: MessageKey;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;
  readonly messageKey?: MessageKey;

  constructor({ statusCode, code, message, messageKey, details = null, cause }: AppErrorOptions) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.messageKey = messageKey;

    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
