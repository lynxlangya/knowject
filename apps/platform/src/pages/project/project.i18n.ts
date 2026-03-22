import i18n from '../../i18n';

export const tp = (
  key: string,
  options?: Record<string, unknown>,
): string => {
  return i18n.t(key, {
    ns: 'project',
    ...options,
  });
};
