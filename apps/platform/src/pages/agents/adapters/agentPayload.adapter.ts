import type { AgentResponse } from '@api/agents';
import type { AgentFormValues } from '../types/agentsManagement.types';

export const createAgentPayload = (
  source: Pick<
    AgentResponse | AgentFormValues,
    | 'name'
    | 'description'
    | 'systemPrompt'
    | 'boundKnowledgeIds'
    | 'boundSkillIds'
    | 'status'
  >,
) => {
  return {
    name: source.name.trim(),
    description: source.description.trim(),
    systemPrompt: source.systemPrompt.trim(),
    boundKnowledgeIds: source.boundKnowledgeIds ?? [],
    boundSkillIds: source.boundSkillIds ?? [],
    status: source.status,
  };
};
