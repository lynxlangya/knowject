import type { Request } from 'express';

export type SupportedLocale = 'en' | 'zh-CN';

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const LOCALE_HEADER = 'accept-language';

const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'zh-CN'];

const normalizeLocaleTag = (value: string): SupportedLocale | undefined => {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized === 'zh' || normalized === 'zh-cn' || normalized.startsWith('zh-')) {
    return 'zh-CN';
  }

  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }

  if (SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }

  return undefined;
};

export const normalizeLocale = (value: string | undefined | null): SupportedLocale | undefined => {
  if (!value) {
    return undefined;
  }

  const tokens = value.split(',');

  for (const token of tokens) {
    const [rawTag] = token.trim().split(';');
    const resolved = normalizeLocaleTag(rawTag ?? '');
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
};

export const resolveRequestLocale = (request: Request): SupportedLocale => {
  const header = request.header(LOCALE_HEADER);
  return normalizeLocale(header) ?? DEFAULT_LOCALE;
};
