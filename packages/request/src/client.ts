import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { RequestDeduper } from "./dedupe";
import { LOCALE_HEADER, normalizeLocale } from "./locale";
import {
  ApiError,
  extractApiErrorPayload,
  type HttpClientOptions,
} from "./types";

const readHeaderValue = (
  headers: InternalAxiosRequestConfig["headers"] | AxiosRequestConfig["headers"],
  name: string,
): string | null => {
  if (!headers) {
    return null;
  }

  if (typeof headers.get === "function") {
    const value = headers.get(name);
    return typeof value === "string" && value.trim() ? value : null;
  }

  const rawHeaders = headers as Record<string, unknown>;
  const value = rawHeaders[name] ?? rawHeaders[name.toLowerCase()];

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(",");
  }

  return null;
};

const resolveRequestLocale = (
  config: AxiosRequestConfig | InternalAxiosRequestConfig | undefined,
  getLocale: HttpClientOptions["getLocale"],
): string | null => {
  const headerLocale = readHeaderValue(config?.headers, LOCALE_HEADER);
  if (headerLocale) {
    return normalizeLocale(headerLocale);
  }

  return getLocale ? normalizeLocale(getLocale()) : null;
};

export const createHttpClient = (options: HttpClientOptions): AxiosInstance => {
  const {
    baseURL,
    timeout = 10000,
    getToken,
    getLocale,
    onUnauthorized,
    dedupe = false,
  } = options;

  const deduper = dedupe ? new RequestDeduper() : null;

  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      "Content-Type": "application/json",
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

      const requestLocale = resolveRequestLocale(config, getLocale);
      if (requestLocale && config.headers && !readHeaderValue(config.headers, LOCALE_HEADER)) {
        config.headers[LOCALE_HEADER] = requestLocale;
      }

      // Add x-request-id
      const requestId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    if (config.headers) {
      config.headers["x-request-id"] = requestId;
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
    (error: unknown) => {
      const axiosError = error as {
        config?: InternalAxiosRequestConfig;
        response?: AxiosResponse<unknown>;
        message?: string;
      };
      const config = axiosError.config as
        | InternalAxiosRequestConfig
        | undefined;
      const response = axiosError.response as
        | AxiosResponse<unknown>
        | undefined;

      const status = response?.status || 0;
      const { message, code, detail, requestId } = extractApiErrorPayload(
        response?.data,
        {
          message: axiosError.message || "Unknown Error",
          requestId: config?._requestId,
        },
      );

      // Handle 401
      if (status === 401 && onUnauthorized) {
        onUnauthorized();
      }

      throw new ApiError(message, status, code, detail, requestId);
    },
  );

  // Wrap methods to support dedupe "recording"
  if (dedupe && deduper) {
    const originalGet = instance.get.bind(instance) as AxiosInstance["get"];
    instance.get = (<T = unknown, R = AxiosResponse<T>, D = unknown>(
      url: string,
      config?: AxiosRequestConfig<D>,
    ): Promise<R> => {
      // We can't easily hook into the promise creation *after* the interceptor but *before* the request starts in a clean way via just wrapping `instance.get`.
      // However, since we set `adapter` in the interceptor if a request exists, we handle the "hit" case.
      // The tricky part is the "miss" case: we need to register the promise.
      // The clean way is to let axios run, and if it's a new request, we capture the promise returned by `instance.request`.

      // Re-implementation of dedupe logic using wrapper to capture the promise
      const method = "GET";
      const params = config?.params;
      const locale = resolveRequestLocale(config, getLocale);
      const key = deduper.getKey(method, url, params, undefined, {
        locale,
      });

      const existing = deduper.get(key);
      if (existing) {
        return existing as Promise<R>;
      }

      const promise = originalGet<T, R, D>(url, config);
      deduper.add(key, promise as Promise<unknown>);
      return promise;
    }) as AxiosInstance["get"];
  }

  return instance;
};

// Default instance for quick usage (not configured with auth, mostly for public APIs or test)
export const http = createHttpClient({});
