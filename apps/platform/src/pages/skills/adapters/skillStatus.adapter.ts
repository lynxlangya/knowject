import type { SkillSummaryResponse } from '@api/skills';
import {
  LIFECYCLE_STATUS_META,
  RUNTIME_STATUS_META,
} from '../constants/skillsManagement.constants';

export const getStatusBadgeMeta = (
  skill: Pick<SkillSummaryResponse, 'lifecycleStatus' | 'runtimeStatus'>,
): { label: string; accentClass: string } => {
  if (skill.lifecycleStatus === 'draft') {
    return LIFECYCLE_STATUS_META.draft;
  }

  if (skill.runtimeStatus === 'contract_only') {
    return {
      label: '已发布 · 契约预留',
      accentClass: RUNTIME_STATUS_META.contract_only.accentClass,
    };
  }

  return LIFECYCLE_STATUS_META.published;
};
