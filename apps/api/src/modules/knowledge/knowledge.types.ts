import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export interface KnowledgeCommandContext {
  actor: AuthenticatedRequestUser;
}

export interface KnowledgeListResponse {
  total: number;
  items: Array<Record<string, never>>;
  meta: {
    module: 'knowledge';
    stage: 'GA-02';
    placeholder: true;
    actorId: string;
    nextTask: 'GA-03';
    boundaries: {
      businessRuntime: 'node-express';
      primaryDataStore: 'mongodb';
      indexRuntime: 'python-http';
      indexStore: 'chroma';
    };
  };
}
