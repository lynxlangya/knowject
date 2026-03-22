import {
  normalizeLocale,
  type SupportedLocale,
} from '@app/providers/locale.storage';
import { clearToken, getToken, setToken } from './token';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  locale: SupportedLocale;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

const AUTH_USER_STORAGE_KEY = 'knowject_auth_user';

const normalizeAuthUser = (value: unknown): AuthUser | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.username !== 'string' ||
    typeof candidate.name !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    username: candidate.username,
    name: candidate.name,
    locale: normalizeLocale(
      typeof candidate.locale === 'string'
        ? candidate.locale
        : null,
    ),
  };
};

export const getAuthUser = (): AuthUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeAuthUser(JSON.parse(raw));
  } catch (error) {
    console.error('解析当前登录用户失败', error);
    return null;
  }
};

export const setAuthUser = (user: AuthUser): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthUser = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
};

// 当前产品壳依赖 token 和 user snapshot 同时存在，因此把它们视为同一个 session 单元。
export const getAuthSession = (): AuthSession | null => {
  const token = getToken();
  const user = getAuthUser();

  if (!token || !user) {
    return null;
  }

  return {
    token,
    user,
  };
};

export const setAuthSession = (session: AuthSession): void => {
  setToken(session.token);
  setAuthUser(session.user);
};

export const clearAuthSession = (): void => {
  clearToken();
  clearAuthUser();
};
