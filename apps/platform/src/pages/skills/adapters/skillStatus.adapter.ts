import type { SkillSummaryResponse } from '@api/skills';
import { STATUS_META } from '../constants/skillsManagement.constants';

export const getStatusBadgeMeta = (
  skill: Pick<SkillSummaryResponse, 'status'>,
): { label: string; accentClass: string } => {
  return STATUS_META[skill.status ?? 'draft'];
};

