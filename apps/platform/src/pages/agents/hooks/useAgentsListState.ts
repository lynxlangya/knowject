import { useEffect, useMemo, useRef, useState } from 'react';
import { listAgents, type AgentResponse } from '@api/agents';
import { extractApiErrorMessage } from '@api/error';
import { listKnowledge, type KnowledgeSummaryResponse } from '@api/knowledge';
import { listSkills, type SkillSummaryResponse } from '@api/skills';
import type { GlobalAssetSummaryItem } from '@pages/assets/components/GlobalAssetLayout';
import { createGlobalAssetSummaryItem } from '@pages/assets/components/globalAsset.shared';
import { tp } from '../agents.i18n';
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
            tp('feedback.loadFailed'),
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
        tp('summary.total'),
        tp('summary.totalValue', { count: items.length }),
        tp('summary.totalHint'),
      ),
      createGlobalAssetSummaryItem(
        tp('summary.active'),
        tp('summary.activeValue', { count: activeCount }),
        disabledCount === 0
          ? tp('summary.activeHintNone')
          : tp('summary.activeHintDisabled', { count: disabledCount }),
      ),
      createGlobalAssetSummaryItem(
        tp('summary.knowledge'),
        tp('summary.knowledgeValue', { count: knowledgeBoundCount }),
        knowledgeBindingTotal === 0
          ? tp('summary.knowledgeHintNone')
          : tp('summary.knowledgeHintSome', { count: knowledgeBindingTotal }),
      ),
      createGlobalAssetSummaryItem(
        tp('summary.skills'),
        tp('summary.skillsValue', { count: skillBoundCount }),
        skillBindingTotal === 0
          ? tp('summary.skillsHintNone')
          : tp('summary.skillsHintSome', { count: skillBindingTotal }),
      ),
    ] satisfies GlobalAssetSummaryItem[];
  }, [items]);

  const agentFilters = useMemo<AgentSidebarFilterItem[]>(() => {
    return [
      {
        key: 'all',
        label: tp('filters.all'),
        count: items.length,
      },
      {
        key: 'recent',
        label: tp('filters.recent'),
        count: filterAgents(items, 'recent').length,
      },
      {
        key: 'active',
        label: tp('filters.active'),
        count: filterAgents(items, 'active').length,
      },
      {
        key: 'disabled',
        label: tp('filters.disabled'),
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
