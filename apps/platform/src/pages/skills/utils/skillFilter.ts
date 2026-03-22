import type { SkillSummaryResponse } from '@api/skills';
import type {
  SkillFilterGroup,
  SkillSidebarFilter,
} from '../types/skillsManagement.types';
import { tp } from '../skills.i18n';

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
      label: tp('filters.all'),
      count: items.length,
    },
    {
      key: 'published',
      label: tp('filters.published'),
      count: filterSkills(items, 'published').length,
    },
    {
      key: 'draft',
      label: tp('filters.draft'),
      count: filterSkills(items, 'draft').length,
    },
    {
      key: 'system',
      label: tp('filters.system'),
      count: filterSkills(items, 'system').length,
    },
    {
      key: 'custom',
      label: tp('filters.custom'),
      count: filterSkills(items, 'custom').length,
    },
    {
      key: 'imported',
      label: tp('filters.imported'),
      count: filterSkills(items, 'imported').length,
    },
  ];
};
