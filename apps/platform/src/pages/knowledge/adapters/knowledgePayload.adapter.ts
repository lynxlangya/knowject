import type {
  CreateKnowledgeRequest,
  UpdateKnowledgeRequest,
} from '@api/knowledge';
import type { KnowledgeFormValues } from '../types/knowledgeManagement.types';

export function toKnowledgePayload(
  values: KnowledgeFormValues,
  mode: 'create',
): CreateKnowledgeRequest;
export function toKnowledgePayload(
  values: KnowledgeFormValues,
  mode: 'edit',
): UpdateKnowledgeRequest;
export function toKnowledgePayload(
  values: KnowledgeFormValues,
  mode: 'create' | 'edit',
): CreateKnowledgeRequest | UpdateKnowledgeRequest {
  const payload = {
    name: values.name.trim(),
    description: values.description?.trim() ?? '',
  };

  if (mode === 'create') {
    return {
      ...payload,
      sourceType: values.sourceType,
    };
  }

  return payload;
}
