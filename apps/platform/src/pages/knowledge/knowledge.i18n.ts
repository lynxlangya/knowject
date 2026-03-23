import i18n from '../../i18n';

export const tp = (
  key: string,
  options?: Record<string, string | number | null | undefined>,
): string => {
  return i18n.t(`pages:knowledge.${key}`, options);
};

export const tpAsset = (
  key: string,
  options?: Record<string, string | number | null | undefined>,
): string => {
  return i18n.t(`pages:assets.${key}`, options);
};
