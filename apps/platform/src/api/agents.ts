import {
  unwrapApiData,
  type ApiEnvelope,
} from '@knowject/request';
import { client } from './client';

export type AgentStatus = 'active' | 'disabled';

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

export interface CreateAgentRequest {
  name: string;
  description?: string;
  systemPrompt: string;
  boundSkillIds?: string[];
  boundKnowledgeIds?: string[];
  status?: AgentStatus;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  systemPrompt?: string;
  boundSkillIds?: string[];
  boundKnowledgeIds?: string[];
  status?: AgentStatus;
}

export const listAgents = async (): Promise<AgentsListResponse> => {
  const response = await client.get<ApiEnvelope<AgentsListResponse>>('/agents');
  return unwrapApiData(response.data);
};

export const getAgentDetail = async (
  agentId: string,
): Promise<AgentDetailEnvelope> => {
  const response = await client.get<ApiEnvelope<AgentDetailEnvelope>>(
    `/agents/${encodeURIComponent(agentId)}`,
  );

  return unwrapApiData(response.data);
};

export const createAgent = async (
  payload: CreateAgentRequest,
): Promise<AgentMutationResponse> => {
  const response = await client.post<ApiEnvelope<AgentMutationResponse>>(
    '/agents',
    payload,
  );

  return unwrapApiData(response.data);
};

export const updateAgent = async (
  agentId: string,
  payload: UpdateAgentRequest,
): Promise<AgentMutationResponse> => {
  const response = await client.patch<ApiEnvelope<AgentMutationResponse>>(
    `/agents/${encodeURIComponent(agentId)}`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const deleteAgent = async (agentId: string): Promise<void> => {
  const response = await client.delete<ApiEnvelope<null>>(
    `/agents/${encodeURIComponent(agentId)}`,
  );

  unwrapApiData(response.data);
};
