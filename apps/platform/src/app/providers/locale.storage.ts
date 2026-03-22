export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const GUEST_LOCALE_STORAGE_KEY = 'knowject_locale_guest';

export const normalizeLocale = (
  value: string | null | undefined,
): SupportedLocale => {
  const normalized = value?.trim().toLowerCase() ?? '';

  if (normalized.startsWith('zh')) {
    return 'zh-CN';
  }

  if (normalized.startsWith('en')) {
    return 'en';
  }

  return DEFAULT_LOCALE;
};

export const readGuestLocale = (
  rawLocale?: string | null,
): SupportedLocale => {
  if (rawLocale !== undefined) {
    return normalizeLocale(rawLocale);
  }

  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  return normalizeLocale(localStorage.getItem(GUEST_LOCALE_STORAGE_KEY));
};

export const writeGuestLocale = (
  locale: string | null | undefined,
): SupportedLocale => {
  const normalized = normalizeLocale(locale);

  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_LOCALE_STORAGE_KEY, normalized);
  }

  return normalized;
};

export const clearGuestLocale = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(GUEST_LOCALE_STORAGE_KEY);
};
