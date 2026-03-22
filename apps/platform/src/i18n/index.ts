import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { normalizeLocale } from '../app/providers/locale.storage';
import { localeNamespaces, resources } from './resources';

const defaultLocale = normalizeLocale(null);

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    defaultNS: 'common',
    ns: localeNamespaces,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
