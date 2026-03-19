import { useMemo } from 'react';
import type { KnowledgeSummaryResponse } from '@api/knowledge';
import type { SkillSummaryResponse } from '@api/skills';
import {
  createKnowledgeOptions,
  createSkillOptions,
} from '../adapters/agentOption.adapter';

interface UseAgentBindingsOptionsParams {
  knowledgeItems: KnowledgeSummaryResponse[];
  skillItems: SkillSummaryResponse[];
  selectedSkillIds: string[];
}

export const useAgentBindingsOptions = ({
  knowledgeItems,
  skillItems,
  selectedSkillIds,
}: UseAgentBindingsOptionsParams) => {
  const knowledgeOptions = useMemo(() => {
    return createKnowledgeOptions(knowledgeItems);
  }, [knowledgeItems]);

  const skillOptions = useMemo(() => {
    return createSkillOptions(skillItems, selectedSkillIds);
  }, [selectedSkillIds, skillItems]);

  return {
    knowledgeOptions,
    skillOptions,
  };
};
