import type { AgentStatus } from '@api/agents';
import { tp } from '../agents.i18n';
import type { AgentFormValues } from '../types/agentsManagement.types';

const createAgentStatusMeta = (tagColor: string, labelKey: string) => ({
  tagColor,
  get label(): string {
    return tp(labelKey);
  },
});

export const AGENT_STATUS_META: Record<
  AgentStatus,
  { label: string; tagColor: string }
> = {
  active: createAgentStatusMeta('green', 'status.active'),
  disabled: createAgentStatusMeta('default', 'status.disabled'),
};

export const AGENTS_PAGE_SUBTITLE = tp('subtitle');

export const AGENT_FORM_INITIAL_VALUES: AgentFormValues = {
  name: '',
  description: '',
  systemPrompt: '',
  boundKnowledgeIds: [],
  boundSkillIds: [],
  status: 'active',
};
