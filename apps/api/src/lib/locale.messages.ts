import type { SupportedLocale } from './locale.js';
import { DEFAULT_LOCALE } from './locale.js';

export type MessageKey =
  | 'api.success'
  | 'api.created'
  | 'api.validation.invalidJson'
  | 'api.validation.failed'
  | 'api.internalError'
  | 'api.notFound'
  | 'validation.required.username'
  | 'validation.required.password'
  | 'validation.required.query'
  | 'validation.required.generic'
  | 'validation.string';

const MESSAGES: Record<SupportedLocale, Partial<Record<MessageKey, string>>> = {
  en: {
    'api.success': 'Request succeeded',
    'api.created': 'Created successfully',
    'api.validation.invalidJson': 'Request body must be valid JSON',
    'api.validation.failed': 'Validation failed',
    'api.internalError': 'Service temporarily unavailable',
    'api.notFound': 'Requested endpoint does not exist',
    'validation.required.username': 'Username is required',
    'validation.required.password': 'Password is required',
    'validation.required.query': 'Query is required',
    'validation.required.generic': 'Field is required',
    'validation.string': 'Must be a string',
  },
  'zh-CN': {
    'api.success': '请求成功',
    'api.created': '创建成功',
    'api.validation.invalidJson': '请求体不是合法 JSON',
    'api.validation.failed': '字段校验失败',
    'api.internalError': '服务暂时不可用',
    'api.notFound': '请求的接口不存在',
    'validation.required.username': '请输入用户名',
    'validation.required.password': '请输入密码',
    'validation.required.query': 'query 为必填项',
    'validation.required.generic': '字段为必填项',
    'validation.string': '必须为字符串',
  },
};

export const getMessage = (
  key: MessageKey | undefined,
  locale: SupportedLocale,
): string | undefined => {
  if (!key) {
    return undefined;
  }

  return MESSAGES[locale]?.[key] ?? MESSAGES[DEFAULT_LOCALE]?.[key];
};
