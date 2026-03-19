import type { KnowledgeSummaryResponse } from '@api/knowledge';
import type { SkillSummaryResponse } from '@api/skills';
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
      label: `未知 Skill（${resourceId}）`,
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
        ? `${item.name} · global_code（预留）`
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
      item.runtimeStatus === 'available'
        ? `${item.name} · 已接服务`
        : `${item.name} · 契约预留`,
  }));

  return resolveSelectableOptions(selectedSkillIds, baseOptions);
};
