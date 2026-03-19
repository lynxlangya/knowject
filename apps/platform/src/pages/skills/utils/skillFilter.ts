import type { SkillSummaryResponse } from '@api/skills';
import type {
  SkillFilterGroup,
  SkillSidebarFilter,
} from '../types/skillsManagement.types';

export const filterSkills = (
  items: SkillSummaryResponse[],
  filter: SkillSidebarFilter,
): SkillSummaryResponse[] => {
  if (filter === 'published') {
    return items.filter((item) => item.lifecycleStatus === 'published');
  }

  if (filter === 'draft') {
    return items.filter((item) => item.lifecycleStatus === 'draft');
  }

  if (filter === 'system') {
    return items.filter((item) => item.source === 'system');
  }

  if (filter === 'custom') {
    return items.filter((item) => item.source === 'custom');
  }

  if (filter === 'imported') {
    return items.filter((item) => item.source === 'imported');
  }

  return items;
};

export const buildSkillFilterGroups = (
  items: SkillSummaryResponse[],
): SkillFilterGroup[] => {
  return [
    {
      key: 'all',
      label: '全部',
      count: items.length,
    },
    {
      key: 'published',
      label: '已发布',
      count: filterSkills(items, 'published').length,
    },
    {
      key: 'draft',
      label: '草稿',
      count: filterSkills(items, 'draft').length,
    },
    {
      key: 'system',
      label: '系统内置',
      count: filterSkills(items, 'system').length,
    },
    {
      key: 'custom',
      label: '自建',
      count: filterSkills(items, 'custom').length,
    },
    {
      key: 'imported',
      label: '公网导入',
      count: filterSkills(items, 'imported').length,
    },
  ];
};
