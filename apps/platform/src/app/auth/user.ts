export interface AuthUser {
  id: string;
  username: string;
  name: string;
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
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthUser = (): void => {
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
};
