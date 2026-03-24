import { createContext, useContext } from 'react';
import type { SupportedLocale } from './locale.storage';

export type LocaleSource = 'guest' | 'account';

export interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (
    locale: SupportedLocale,
    source?: LocaleSource,
  ) => Promise<void>;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export const useLocale = (): LocaleContextValue => {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }

  return context;
};
