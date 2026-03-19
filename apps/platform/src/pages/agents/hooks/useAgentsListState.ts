import { useEffect, useMemo, useRef, useState } from 'react';
import { listAgents, type AgentResponse } from '@api/agents';
import { extractApiErrorMessage } from '@api/error';
import { listKnowledge, type KnowledgeSummaryResponse } from '@api/knowledge';
import { listSkills, type SkillSummaryResponse } from '@api/skills';
import type { GlobalAssetSummaryItem } from '@pages/assets/components/GlobalAssetLayout';
import { createGlobalAssetSummaryItem } from '@pages/assets/components/globalAsset.shared';
import type { AgentSidebarFilter } from '../types/agentsManagement.types';
import { filterAgents, sortAgentsByUpdatedAt } from '../utils/agentFilter';

interface AgentSidebarFilterItem {
  key: AgentSidebarFilter;
  label: string;
  count: number;
}

export const useAgentsListState = () => {
  const agentCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [items, setItems] = useState<AgentResponse[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<
    KnowledgeSummaryResponse[]
  >([]);
  const [skillItems, setSkillItems] = useState<SkillSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedFilter, setSelectedFilter] =
    useState<AgentSidebarFilter>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [agentsResult, knowledgeResult, skillsResult] = await Promise.all(
          [listAgents(), listKnowledge(), listSkills({ bindable: true })],
        );

        if (cancelled) {
          return;
        }

        setItems(sortAgentsByUpdatedAt(agentsResult.items));
        setKnowledgeItems(knowledgeResult.items);
        setSkillItems(skillsResult.items);
      } catch (currentError) {
        if (cancelled) {
          return;
        }

        console.error(
          '[AgentsManagementPage] 加载智能体目录失败:',
          currentError,
        );
        setError(
          extractApiErrorMessage(
            currentError,
            '加载智能体目录失败，请稍后重试',
          ),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const filteredAgents = useMemo(() => {
    return filterAgents(items, selectedFilter);
  }, [items, selectedFilter]);

  const summaryItems = useMemo(() => {
    const activeCount = items.filter((item) => item.status === 'active').length;
    const disabledCount = items.length - activeCount;
    const knowledgeBoundCount = items.filter(
      (item) => item.boundKnowledgeIds.length > 0,
    ).length;
    const skillBoundCount = items.filter(
      (item) => item.boundSkillIds.length > 0,
    ).length;
    const knowledgeBindingTotal = items.reduce(
      (sum, item) => sum + item.boundKnowledgeIds.length,
      0,
    );
    const skillBindingTotal = items.reduce(
      (sum, item) => sum + item.boundSkillIds.length,
      0,
    );

    return [
      createGlobalAssetSummaryItem(
        '智能体总数',
        `${items.length} 个`,
        '当前目录中的全局智能体配置数量。',
      ),
      createGlobalAssetSummaryItem(
        '启用中',
        `${activeCount} 个`,
        disabledCount === 0
          ? '当前没有停用中的智能体。'
          : `${disabledCount} 个当前处于停用状态。`,
      ),
      createGlobalAssetSummaryItem(
        '已绑知识库',
        `${knowledgeBoundCount} 个`,
        knowledgeBindingTotal === 0
          ? '当前还没有智能体接入知识库。'
          : `累计 ${knowledgeBindingTotal} 条知识库绑定。`,
      ),
      createGlobalAssetSummaryItem(
        '已绑 Skill',
        `${skillBoundCount} 个`,
        skillBindingTotal === 0
          ? '当前还没有智能体接入 Skill。'
          : `累计 ${skillBindingTotal} 条 Skill 绑定。`,
      ),
    ] satisfies GlobalAssetSummaryItem[];
  }, [items]);

  const agentFilters = useMemo<AgentSidebarFilterItem[]>(() => {
    return [
      {
        key: 'all',
        label: '全部',
        count: items.length,
      },
      {
        key: 'recent',
        label: '最近使用',
        count: filterAgents(items, 'recent').length,
      },
      {
        key: 'active',
        label: '启用中',
        count: filterAgents(items, 'active').length,
      },
      {
        key: 'disabled',
        label: '已停用',
        count: filterAgents(items, 'disabled').length,
      },
    ];
  }, [items]);

  useEffect(() => {
    if (!selectedAgentId) {
      return;
    }

    if (!filteredAgents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [filteredAgents, selectedAgentId]);

  const reload = () => {
    setReloadToken((currentValue) => currentValue + 1);
  };

  const highlightAgentCard = (agentId: string) => {
    setSelectedAgentId(agentId);
    window.setTimeout(() => {
      agentCardRefs.current[agentId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 0);
  };

  const upsertAgent = (nextAgent: AgentResponse) => {
    setSelectedFilter('all');
    highlightAgentCard(nextAgent.id);
    setItems((currentItems) =>
      sortAgentsByUpdatedAt([
        nextAgent,
        ...currentItems.filter((item) => item.id !== nextAgent.id),
      ]),
    );
  };

  const removeAgent = (agentId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== agentId),
    );
    setSelectedAgentId((currentId) => (currentId === agentId ? null : currentId));
  };

  const registerAgentCardRef = (agentId: string, node: HTMLElement | null) => {
    agentCardRefs.current[agentId] = node;
  };

  return {
    agentFilters,
    error,
    filteredAgents,
    items,
    knowledgeItems,
    loading,
    reload,
    removeAgent,
    registerAgentCardRef,
    selectedAgentId,
    selectedFilter,
    setSelectedFilter,
    skillItems,
    summaryItems,
    highlightAgentCard,
    upsertAgent,
  };
};
