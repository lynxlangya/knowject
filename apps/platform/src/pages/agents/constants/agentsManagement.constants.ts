import type { AgentStatus } from '@api/agents';
import type { AgentFormValues } from '../types/agentsManagement.types';

export const AGENT_STATUS_META: Record<
  AgentStatus,
  { label: string; tagColor: string }
> = {
  active: {
    label: '启用中',
    tagColor: 'green',
  },
  disabled: {
    label: '已停用',
    tagColor: 'default',
  },
};

export const AGENTS_PAGE_SUBTITLE = '复用角色与流程，项目内绑定执行';

export const AGENT_FORM_INITIAL_VALUES: AgentFormValues = {
  name: '',
  description: '',
  systemPrompt: '',
  boundKnowledgeIds: [],
  boundSkillIds: [],
  status: 'active',
};
