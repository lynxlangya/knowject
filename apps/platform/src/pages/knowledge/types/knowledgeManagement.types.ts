import type { KnowledgeSourceType } from '@api/knowledge';

export interface KnowledgeFormValues {
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
}

export type KnowledgeModalMode = 'create' | 'edit' | null;
