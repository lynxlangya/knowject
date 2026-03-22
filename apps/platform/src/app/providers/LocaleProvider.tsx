import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAuthSession, getAuthUser, setAuthSession } from '@app/auth/user';
import i18n from '@/i18n';
import {
  normalizeLocale,
  readGuestLocale,
  writeGuestLocale,
  type SupportedLocale,
} from './locale.storage';

export type LocaleSource = 'guest' | 'account';

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (
    locale: SupportedLocale,
    source?: LocaleSource,
  ) => Promise<void>;
}

interface LocaleProviderProps {
  children: ReactNode;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const resolveInitialLocale = (): SupportedLocale => {
  return getAuthUser()?.locale ?? readGuestLocale();
};

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(resolveInitialLocale);

  useEffect(() => {
    writeGuestLocale(locale);
    void i18n.changeLanguage(locale);
  }, [locale]);

  const setLocale = useCallback<LocaleContextValue['setLocale']>(
    async (nextLocale, source = 'guest') => {
      const normalized = normalizeLocale(nextLocale);

      if (source === 'account') {
        const authSession = getAuthSession();
        if (authSession) {
          setAuthSession({
            ...authSession,
            user: {
              ...authSession.user,
              locale: normalized,
            },
          });
        }
      }

      setLocaleState(normalized);
      await i18n.changeLanguage(normalized);
    },
    [],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = (): LocaleContextValue => {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }

  return context;
};
