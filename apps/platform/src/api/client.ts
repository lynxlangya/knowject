import { createHttpClient } from '@knowject/request';
import { clearToken, getToken } from '../app/auth/token';

export const client = createHttpClient({
  baseURL: '/api',
  timeout: 10000,
  dedupe: true,
  getToken,
  onUnauthorized: () => {
    clearToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  },
});
