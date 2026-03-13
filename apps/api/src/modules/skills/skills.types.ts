import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export interface SkillsCommandContext {
  actor: AuthenticatedRequestUser;
}

export interface SkillsListResponse {
  total: number;
  items: Array<Record<string, never>>;
  meta: {
    module: 'skills';
    stage: 'GA-02';
    placeholder: true;
    actorId: string;
    nextTask: 'GA-08';
    boundaries: {
      businessRuntime: 'node-express';
      primaryDataStore: 'mongodb';
      knowledgeAccess: 'service-layer-only';
    };
  };
}
