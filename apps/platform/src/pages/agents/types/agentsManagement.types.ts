import type { AgentStatus } from '@api/agents';

export type ModalMode = 'create' | 'edit' | null;

export type AgentSidebarFilter = 'all' | 'recent' | 'active' | 'disabled';

export interface AgentFormValues {
  name: string;
  description: string;
  systemPrompt: string;
  boundKnowledgeIds: string[];
  boundSkillIds: string[];
  status: AgentStatus;
}

export interface AgentSelectOption {
  value: string;
  label: string;
}
