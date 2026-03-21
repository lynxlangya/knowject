import { AppError } from './app-error.js';
import type { MessageKey } from './locale.messages.js';

export interface ApiErrorShape {
  statusCode: number;
  code: string;
  message: string;
  messageKey?: MessageKey;
  details: {
    fields: Record<string, string>;
  };
}

const REQUIRED_FIELD_MESSAGES: Record<string, string> = {
  username: '请输入用户名',
  password: '请输入密码',
  query: 'query 为必填项',
};

export const createValidationErrorShape = (
  message: string,
  fields: Record<string, string>,
  messageKey?: MessageKey,
): ApiErrorShape => {
  return {
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message,
    messageKey,
    details: {
      fields,
    },
  };
};

export const createValidationAppError = (
  message: string,
  fields: Record<string, string>,
  messageKey?: MessageKey,
): AppError => {
  return new AppError(createValidationErrorShape(message, fields, messageKey));
};

export const createRequiredFieldError = (field: string): ApiErrorShape => {
  const message = REQUIRED_FIELD_MESSAGES[field] ?? `${field} 为必填项`;

  return createValidationErrorShape(message, {
    [field]: message,
  }, 'validation.required');
};

export const readOptionalStringField = (
  body: unknown,
  field: string,
): string | undefined => {
  if (body === undefined) {
    return undefined;
  }

  if (typeof body !== 'string') {
    throw createValidationAppError(`${field} 必须为字符串`, {
      [field]: `${field} 必须为字符串`,
    }, 'validation.string');
  }

  return body.trim();
};
