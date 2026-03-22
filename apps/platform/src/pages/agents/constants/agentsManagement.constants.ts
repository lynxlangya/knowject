import type { AgentStatus } from '@api/agents';
import { tp } from '../agents.i18n';
import type { AgentFormValues } from '../types/agentsManagement.types';

export const AGENT_STATUS_META: Record<
  AgentStatus,
  { label: string; tagColor: string }
> = {
  active: {
    label: tp('status.active'),
    tagColor: 'green',
  },
  disabled: {
    label: tp('status.disabled'),
    tagColor: 'default',
  },
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
