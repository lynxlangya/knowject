import { createHttpClient, type HttpClientOptions } from '@knowject/request';
import { getToken } from '@app/auth/token';
import { clearAuthSession } from '@app/auth/user';

const baseClientOptions = {
  baseURL: '/api',
  timeout: 10000,
  dedupe: true,
} satisfies HttpClientOptions;

export const handleUnauthorized = (): void => {
  clearAuthSession();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// 登录 / 注册属于公共端点，不应该触发全局 401 回跳逻辑。
export const publicClient = createHttpClient(baseClientOptions);

export const client = createHttpClient({
  ...baseClientOptions,
  getToken,
  onUnauthorized: handleUnauthorized,
});
