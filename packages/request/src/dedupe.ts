// Helper for stable stringify
function stableStringify(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }

  const normalized = obj as Record<string, unknown>;
  const keys = Object.keys(normalized).sort();
  const parts = keys.map((key) => `${key}:${stableStringify(normalized[key])}`);
  return `{${parts.join(',')}}`;
}

export class RequestDeduper {
  private inflight = new Map<string, Promise<unknown>>();

  getKey(
    method: string,
    url: string,
    params?: unknown,
    data?: unknown,
    context?: unknown,
  ): string {
    return `${method.toUpperCase()}:${url}:${stableStringify(params)}:${stableStringify(data)}:${stableStringify(context)}`;
  }

  add(key: string, promise: Promise<unknown>): void {
    this.inflight.set(key, promise);
    promise.finally(() => {
      this.inflight.delete(key);
    });
  }

  get(key: string): Promise<unknown> | undefined {
    return this.inflight.get(key);
  }
}
