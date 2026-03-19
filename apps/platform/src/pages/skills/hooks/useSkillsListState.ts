import { useEffect, useMemo, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import { listSkills, type SkillSummaryResponse } from '@api/skills';
import type { SkillSidebarFilter } from '../types/skillsManagement.types';
import { buildSkillFilterGroups, filterSkills } from '../utils/skillFilter';
import { buildSkillSummaryItems } from '../utils/skillSummary';

export const useSkillsListState = () => {
  const [items, setItems] = useState<SkillSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedFilter, setSelectedFilter] =
    useState<SkillSidebarFilter>('all');

  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await listSkills();

        if (cancelled) {
          return;
        }

        setItems(response.items);
      } catch (currentError) {
        if (cancelled) {
          return;
        }

        console.error('[SkillsManagementPage] 加载技能目录失败:', currentError);
        setError(
          extractApiErrorMessage(currentError, '加载技能目录失败，请稍后重试'),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSkills();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const summaryItems = useMemo(() => {
    return buildSkillSummaryItems(items);
  }, [items]);

  const filterGroups = useMemo(() => {
    return buildSkillFilterGroups(items);
  }, [items]);

  const filteredItems = useMemo(() => {
    return filterSkills(items, selectedFilter);
  }, [items, selectedFilter]);

  const handleReload = () => {
    setReloadToken((currentValue) => currentValue + 1);
  };

  return {
    items,
    loading,
    error,
    selectedFilter,
    setSelectedFilter,
    summaryItems,
    filterGroups,
    filteredItems,
    handleReload,
  };
};
