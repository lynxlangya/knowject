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
  const baseOptions = skillItems
    .filter((item) => item.source === 'team' && item.bindable)
    .map((item) => ({
      value: item.id,
      label:
        item.source === 'preset'
          ? tp('feedback.optionalPresetSkill', { name: item.name })
          : tp('feedback.optionalTeamSkill', { name: item.name }),
    }));
  const optionMap = new Map(
    baseOptions.map((option) => [option.value, option] as const),
  );

  selectedSkillIds.forEach((resourceId) => {
    if (optionMap.has(resourceId)) {
      return;
    }

    const skill = skillItems.find((item) => item.id === resourceId);

    if (!skill) {
      optionMap.set(resourceId, {
        value: resourceId,
        label: tp('feedback.optionalUnknownSkill', { id: resourceId }),
      });
      return;
    }

    optionMap.set(resourceId, {
      value: skill.id,
      label:
        skill.source === 'preset'
          ? tp('feedback.optionalPresetSkill', { name: skill.name })
          : tp('feedback.optionalTeamSkill', { name: skill.name }),
    });
  });

  return Array.from(optionMap.values());
};
