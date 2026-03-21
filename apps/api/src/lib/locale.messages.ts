import type { SupportedLocale } from './locale.js';
import { DEFAULT_LOCALE } from './locale.js';

export type MessageKey =
  | 'api.success'
  | 'api.created'
  | 'api.validation.invalidJson'
  | 'api.validation.failed'
  | 'api.notFound'
  | 'validation.required'
  | 'validation.string';

const MESSAGES: Record<SupportedLocale, Partial<Record<MessageKey, string>>> = {
  en: {
    'api.success': 'Request succeeded',
    'api.created': 'Created successfully',
    'api.validation.invalidJson': 'Request body must be valid JSON',
    'api.validation.failed': 'Validation failed',
    'api.notFound': 'Requested endpoint does not exist',
  },
  'zh-CN': {
    'api.success': '请求成功',
    'api.created': '创建成功',
    'api.validation.invalidJson': '请求体不是合法 JSON',
    'api.validation.failed': '字段校验失败',
    'api.notFound': '请求的接口不存在',
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
