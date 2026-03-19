import type { AgentResponse } from '@api/agents';
import type { AgentSidebarFilter } from '../types/agentsManagement.types';

export const sortAgentsByUpdatedAt = (items: AgentResponse[]): AgentResponse[] =>
  [...items].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

export const filterAgents = (
  items: AgentResponse[],
  filter: AgentSidebarFilter,
): AgentResponse[] => {
  if (filter === 'recent') {
    return items.slice(0, 5);
  }

  if (filter === 'active') {
    return items.filter((item) => item.status === 'active');
  }

  if (filter === 'disabled') {
    return items.filter((item) => item.status === 'disabled');
  }

  return items;
};
