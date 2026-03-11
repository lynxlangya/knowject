import type { AppEnv } from '@config/env.js';

export type ChromaHealthStatus = 'up' | 'down' | 'disabled';

export interface ChromaHealthSnapshot {
  status: ChromaHealthStatus;
  url: string | null;
  host: string | null;
  checkedAt: string;
  latencyMs: number | null;
  httpStatus: number | null;
  lastError: string | null;
}

const HEALTH_TIMEOUT_MS = 3000;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

const buildHeartbeatUrl = (env: AppEnv): string | null => {
  if (!env.chroma.url) {
    return null;
  }

  return new URL(env.chroma.heartbeatPath, env.chroma.url).toString();
};

export const getChromaHealthSnapshot = async (env: AppEnv): Promise<ChromaHealthSnapshot> => {
  const heartbeatUrl = buildHeartbeatUrl(env);

  if (!heartbeatUrl) {
    return {
      status: 'disabled',
      url: null,
      host: null,
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      httpStatus: null,
      lastError: null,
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(heartbeatUrl, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
      },
    });
    const latencyMs = Date.now() - startedAt;

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        status: 'down',
        url: env.chroma.url,
        host: env.chroma.host,
        checkedAt: new Date().toISOString(),
        latencyMs,
        httpStatus: response.status,
        lastError: `Heartbeat returned HTTP ${response.status}`,
      };
    }

    return {
      status: 'up',
      url: env.chroma.url,
      host: env.chroma.host,
      checkedAt: new Date().toISOString(),
      latencyMs,
      httpStatus: response.status,
      lastError: null,
    };
  } catch (error: unknown) {
    clearTimeout(timeout);

    return {
      status: 'down',
      url: env.chroma.url,
      host: env.chroma.host,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      httpStatus: null,
      lastError: getErrorMessage(error),
    };
  }
};
