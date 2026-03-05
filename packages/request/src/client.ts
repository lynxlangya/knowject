import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { RequestDeduper } from './dedupe';
import { ApiError, type HttpClientOptions } from './types';

export const createHttpClient = (options: HttpClientOptions): AxiosInstance => {
  const {
    baseURL,
    timeout = 10000,
    getToken,
    onUnauthorized,
    dedupe = false,
  } = options;

  const deduper = dedupe ? new RequestDeduper() : null;

  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request Interceptor
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Inject Token
    if (getToken) {
      const token = getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add x-request-id
    const requestId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    if (config.headers) {
      config.headers['x-request-id'] = requestId;
    }
    // Store for error handling usage
    config._requestId = requestId;

    return config;
  });

  // Response Interceptor
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // If we used the adapter for deduplication, response might already be the result
      return response;
    },
    (error: any) => {
      const config = error.config as InternalAxiosRequestConfig | undefined;
      const response = error.response as AxiosResponse | undefined;

      const requestId = config?._requestId;
      const status = response?.status || 0;
      const message =
        response?.data?.message || error.message || 'Unknown Error';
      const code = response?.data?.code;
      const detail = response?.data?.detail || response?.data;

      // Handle 401
      if (status === 401 && onUnauthorized) {
        onUnauthorized();
      }

      throw new ApiError(message, status, code, detail, requestId);
    }
  );

  // Wrap methods to support dedupe "recording"
  if (dedupe && deduper) {
    const originalGet = instance.get.bind(instance);
    instance.get = function <T = any, R = AxiosResponse<T>>(
      url: string,
      config?: any
    ): Promise<R> {
      // We can't easily hook into the promise creation *after* the interceptor but *before* the request starts in a clean way via just wrapping `instance.get`.
      // However, since we set `adapter` in the interceptor if a request exists, we handle the "hit" case.
      // The tricky part is the "miss" case: we need to register the promise.
      // The clean way is to let axios run, and if it's a new request, we capture the promise returned by `instance.request`.

      // Re-implementation of dedupe logic using wrapper to capture the promise
      const method = 'GET';
      const params = config?.params;
      const key = deduper.getKey(method, url, params);

      const existing = deduper.get(key);
      if (existing) {
        return existing as Promise<R>;
      }

      const promise = originalGet(url, config);
      deduper.add(key, promise);
      return promise as Promise<R>;
    } as any;
  }

  return instance;
};

// Default instance for quick usage (not configured with auth, mostly for public APIs or test)
export const http = createHttpClient({});
