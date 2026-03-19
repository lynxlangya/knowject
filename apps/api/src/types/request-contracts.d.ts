declare module "@knowject/request-contracts" {
  export interface ApiMeta {
    requestId: string;
    timestamp: string;
    details?: unknown;
  }

  export interface ApiEnvelope<T> {
    code: string;
    message: string;
    data: T;
    meta: ApiMeta;
  }
}
