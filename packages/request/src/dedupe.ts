// Helper for stable stringify
function stableStringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }

  const keys = Object.keys(obj).sort();
  const parts = keys.map((key) => `${key}:${stableStringify(obj[key])}`);
  return `{${parts.join(',')}}`;
}

export class RequestDeduper {
  private inflight = new Map<string, Promise<any>>();

  getKey(method: string, url: string, params?: any, data?: any): string {
    return `${method.toUpperCase()}:${url}:${stableStringify(params)}:${stableStringify(data)}`;
  }

  add(key: string, promise: Promise<any>): void {
    this.inflight.set(key, promise);
    promise.finally(() => {
      this.inflight.delete(key);
    });
  }

  get(key: string): Promise<any> | undefined {
    return this.inflight.get(key);
  }
}
