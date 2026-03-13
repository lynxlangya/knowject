import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export interface AgentsCommandContext {
  actor: AuthenticatedRequestUser;
}

export interface AgentsListResponse {
  total: number;
  items: Array<Record<string, never>>;
  meta: {
    module: 'agents';
    stage: 'GA-02';
    placeholder: true;
    actorId: string;
    nextTask: 'GA-10';
    boundaries: {
      businessRuntime: 'node-express';
      primaryDataStore: 'mongodb';
      knowledgeAccess: 'service-layer-only';
      skillBinding: 'registered-skills-only';
    };
  };
}
