import { Typography } from 'antd';
import type { AgentResponse } from '@api/agents';
import {
  GlobalAssetSidebar,
  GlobalAssetSidebarFilterItem,
  GlobalAssetSidebarItem,
  GlobalAssetSidebarSection,
} from '@pages/assets/components/GlobalAssetLayout';
import { formatGlobalAssetUpdatedAt } from '@pages/assets/components/globalAsset.shared';
import { AGENT_STATUS_META } from '../constants/agentsManagement.constants';
import type { AgentSidebarFilter } from '../types/agentsManagement.types';

interface AgentFilterItem {
  key: AgentSidebarFilter;
  label: string;
  count: number;
}

interface AgentsSidebarProps {
  agentFilters: AgentFilterItem[];
  filteredAgents: AgentResponse[];
  itemsCount: number;
  onFilterChange: (filter: AgentSidebarFilter) => void;
  onSelectAgent: (agentId: string) => void;
  selectedAgentId: string | null;
  selectedFilter: AgentSidebarFilter;
}

export const AgentsSidebar = ({
  agentFilters,
  filteredAgents,
  itemsCount,
  onFilterChange,
  onSelectAgent,
  selectedAgentId,
  selectedFilter,
}: AgentsSidebarProps) => {
  return (
    <GlobalAssetSidebar
      header={
        <div className="flex items-end justify-between gap-3">
          <Typography.Title level={5} className="mb-0! text-slate-800!">
            分组与定位
          </Typography.Title>
          <Typography.Text className="text-xs text-slate-400">
            共 {itemsCount} 个
          </Typography.Text>
        </div>
      }
    >
      <GlobalAssetSidebarSection title="分组浏览">
        {agentFilters.map((filter) => (
          <GlobalAssetSidebarFilterItem
            key={filter.key}
            active={selectedFilter === filter.key}
            label={filter.label}
            count={filter.count}
            onClick={() => {
              onFilterChange(filter.key);
            }}
          />
        ))}
      </GlobalAssetSidebarSection>

      <GlobalAssetSidebarSection title="智能体列表">
        {filteredAgents.length === 0 ? (
          <div className="px-2 py-4">
            <Typography.Text className="text-sm text-slate-400">
              当前分组下暂无智能体。
            </Typography.Text>
          </div>
        ) : (
          filteredAgents.map((agent) => {
            const statusMeta = AGENT_STATUS_META[agent.status];

            return (
              <GlobalAssetSidebarItem
                key={agent.id}
                active={selectedAgentId === agent.id}
                onClick={() => {
                  onSelectAgent(agent.id);
                }}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Typography.Text
                      className={`truncate text-sm font-medium ${
                        selectedAgentId === agent.id
                          ? 'text-slate-900!'
                          : 'text-slate-700!'
                      }`}
                    >
                      {agent.name}
                    </Typography.Text>
                    <Typography.Text className="text-caption text-slate-400">
                      {statusMeta.label}
                    </Typography.Text>
                  </div>
                  <Typography.Text className="block text-caption text-slate-500">
                    最近更新：
                    {formatGlobalAssetUpdatedAt(agent.updatedAt)}
                  </Typography.Text>
                </div>
              </GlobalAssetSidebarItem>
            );
          })
        )}
      </GlobalAssetSidebarSection>
    </GlobalAssetSidebar>
  );
};
