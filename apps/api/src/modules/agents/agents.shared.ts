import type { WithId } from 'mongodb';
import type { AgentDocument, AgentResponse } from './agents.types.js';

export const AGENTS_COLLECTION_NAME = 'agents';

export const toAgentResponse = (
  agent: WithId<AgentDocument>,
): AgentResponse => {
  return {
    id: agent._id.toHexString(),
    name: agent.name,
    description: agent.description,
    systemPrompt: agent.systemPrompt,
    boundSkillIds: agent.boundSkillIds,
    boundKnowledgeIds: agent.boundKnowledgeIds,
    model: agent.model,
    status: agent.status,
    createdBy: agent.createdBy,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
};
