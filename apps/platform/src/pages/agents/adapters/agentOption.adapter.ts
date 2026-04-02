import type { KnowledgeSummaryResponse } from '@api/knowledge';
import type { SkillSummaryResponse } from '@api/skills';
import { tp } from '../agents.i18n';
import type { AgentSelectOption } from '../types/agentsManagement.types';

export const resolveSelectableOptions = (
  selectedIds: string[],
  baseOptions: AgentSelectOption[],
): AgentSelectOption[] => {
  const optionMap = new Map(
    baseOptions.map((option) => [option.value, option] as const),
  );

  selectedIds.forEach((resourceId) => {
    if (optionMap.has(resourceId)) {
      return;
    }

    optionMap.set(resourceId, {
      value: resourceId,
      label: tp('feedback.optionalUnknownSkill', { id: resourceId }),
    });
  });

  return Array.from(optionMap.values());
};

export const createKnowledgeOptions = (
  knowledgeItems: KnowledgeSummaryResponse[],
): AgentSelectOption[] => {
  return knowledgeItems.map((item) => ({
    value: item.id,
    label:
      item.sourceType === 'global_code'
        ? tp('feedback.optionalGlobalCode', { name: item.name })
        : item.name,
  }));
};

export const createSkillOptions = (
  skillItems: SkillSummaryResponse[],
  selectedSkillIds: string[],
): AgentSelectOption[] => {
  const baseOptions = skillItems.map((item) => ({
    value: item.id,
    label:
      item.source === 'preset'
        ? tp('feedback.optionalPresetSkill', { name: item.name })
        : tp('feedback.optionalTeamSkill', { name: item.name }),
  }));

  return resolveSelectableOptions(selectedSkillIds, baseOptions);
};
