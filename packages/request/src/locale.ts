export const LOCALE_HEADER = "Accept-Language";
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const normalizeLocale = (
  value: string | null | undefined,
): SupportedLocale => {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
};
