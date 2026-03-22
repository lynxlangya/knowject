import i18n from '@/i18n';

export const tp = (
  key: string,
  options?: Record<string, string | number | null | undefined>,
): string => {
  return i18n.t(`pages:skills.${key}`, options);
};
