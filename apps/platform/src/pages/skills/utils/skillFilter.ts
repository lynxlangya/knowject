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
  if (filter === 'draft') {
    return items.filter((item) => item.status === 'draft');
  }

  if (filter === 'active') {
    return items.filter((item) => item.status === 'active');
  }

  if (filter === 'deprecated') {
    return items.filter((item) => item.status === 'deprecated');
  }

  if (filter === 'archived') {
    return items.filter((item) => item.status === 'archived');
  }

  if (filter === 'preset') {
    return items.filter((item) => item.source === 'preset');
  }

  if (filter === 'team') {
    return items.filter((item) => item.source === 'team');
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
      key: 'active',
      label: tp('filters.active'),
      count: filterSkills(items, 'active').length,
    },
    {
      key: 'draft',
      label: tp('filters.draft'),
      count: filterSkills(items, 'draft').length,
    },
    {
      key: 'deprecated',
      label: tp('filters.deprecated'),
      count: filterSkills(items, 'deprecated').length,
    },
    {
      key: 'archived',
      label: tp('filters.archived'),
      count: filterSkills(items, 'archived').length,
    },
    {
      key: 'preset',
      label: tp('filters.preset'),
      count: filterSkills(items, 'preset').length,
    },
    {
      key: 'team',
      label: tp('filters.team'),
      count: filterSkills(items, 'team').length,
    },
  ];
};
