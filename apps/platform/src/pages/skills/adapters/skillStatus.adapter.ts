import type { SkillSummaryResponse } from '@api/skills';
import {
  LIFECYCLE_STATUS_META,
  RUNTIME_STATUS_META,
} from '../constants/skillsManagement.constants';
import { tp } from '../skills.i18n';

export const getStatusBadgeMeta = (
  skill: Pick<SkillSummaryResponse, 'lifecycleStatus' | 'runtimeStatus'>,
): { label: string; accentClass: string } => {
  if (skill.lifecycleStatus === 'draft') {
    return LIFECYCLE_STATUS_META.draft;
  }

  if (skill.runtimeStatus === 'contract_only') {
    return {
      label: tp('runtime.publishedContractOnly'),
      accentClass: RUNTIME_STATUS_META.contract_only.accentClass,
    };
  }

  return LIFECYCLE_STATUS_META.published;
};
