import { AppError } from './app-error.js';

export interface ApiErrorShape {
  statusCode: number;
  code: string;
  message: string;
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
): ApiErrorShape => {
  return {
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message,
    details: {
      fields,
    },
  };
};

export const createValidationAppError = (
  message: string,
  fields: Record<string, string>,
): AppError => {
  return new AppError(createValidationErrorShape(message, fields));
};

export const createRequiredFieldError = (field: string): ApiErrorShape => {
  const message = REQUIRED_FIELD_MESSAGES[field] ?? `${field} 为必填项`;

  return createValidationErrorShape(message, {
    [field]: message,
  });
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
    });
  }

  return body.trim();
};
