import { AppError } from './app-error.js';
import { getFallbackMessage } from './locale.messages.js';
import type { MessageKey, MessageParams } from './locale.messages.js';

export interface ApiErrorShape {
  statusCode: number;
  code: string;
  message: string;
  messageKey?: MessageKey;
  messageParams?: MessageParams;
  details: {
    fields: Record<string, string>;
  };
}

const REQUIRED_FIELD_MESSAGES: Record<string, string> = {
  username: '请输入用户名',
  password: '请输入密码',
  query: 'query 为必填项',
};

const REQUIRED_FIELD_MESSAGE_KEYS: Record<string, MessageKey> = {
  username: 'validation.required.username',
  password: 'validation.required.password',
  query: 'validation.required.query',
};

export const createValidationErrorShape = (
  message: string,
  fields: Record<string, string>,
  messageKey?: MessageKey,
  messageParams?: MessageParams,
): ApiErrorShape => {
  return {
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message,
    messageKey,
    messageParams,
    details: {
      fields,
    },
  };
};

export const createValidationAppError = (
  message: string,
  fields: Record<string, string>,
  messageKey?: MessageKey,
  messageParams?: MessageParams,
): AppError => {
  return new AppError(
    createValidationErrorShape(message, fields, messageKey, messageParams),
  );
};

export const createRequiredFieldError = (field: string): ApiErrorShape => {
  const messageKey = REQUIRED_FIELD_MESSAGE_KEYS[field];

  if (messageKey) {
    const message = REQUIRED_FIELD_MESSAGES[field] ?? getFallbackMessage(messageKey);

    return createValidationErrorShape(message, {
      [field]: message,
    }, messageKey);
  }

  const genericMessage = getFallbackMessage('validation.required.field', {
    field,
  });

  return createValidationErrorShape(
    genericMessage,
    {
      [field]: genericMessage,
    },
    'validation.required.field',
    {
      field,
    },
  );
};

export const readOptionalStringField = (
  body: unknown,
  field: string,
): string | undefined => {
  if (body === undefined) {
    return undefined;
  }

  if (typeof body !== 'string') {
    const message = getFallbackMessage('validation.string.field', {
      field,
    });
    throw createValidationAppError(
      message,
      {
        [field]: message,
      },
      'validation.string.field',
      {
        field,
      },
    );
  }

  return body.trim();
};
