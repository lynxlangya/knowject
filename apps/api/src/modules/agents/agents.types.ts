import type { ObjectId } from 'mongodb';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export interface AgentsCommandContext {
  actor: AuthenticatedRequestUser;
}

export const AGENT_STATUSES = ['active', 'disabled'] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const DEFAULT_AGENT_MODEL = 'server-default';

export interface AgentDocument {
  _id?: ObjectId;
  name: string;
  description: string;
  systemPrompt: string;
  boundSkillIds: string[];
  boundKnowledgeIds: string[];
  model: string;
  status: AgentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentInput {
  name?: unknown;
  description?: unknown;
  systemPrompt?: unknown;
  boundSkillIds?: unknown;
  boundKnowledgeIds?: unknown;
  status?: unknown;
}

export interface UpdateAgentInput {
  name?: unknown;
  description?: unknown;
  systemPrompt?: unknown;
  boundSkillIds?: unknown;
  boundKnowledgeIds?: unknown;
  status?: unknown;
}

export interface AgentResponse {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  boundSkillIds: string[];
  boundKnowledgeIds: string[];
  model: string;
  status: AgentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentsListResponse {
  total: number;
  items: AgentResponse[];
}

export interface AgentDetailEnvelope {
  agent: AgentResponse;
}

export interface AgentMutationResponse {
  agent: AgentResponse;
}
