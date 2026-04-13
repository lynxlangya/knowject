import { useEffect, useMemo, useState } from "react";
import { listAgents } from "@api/agents";
import { listKnowledge } from "@api/knowledge";
import { listSkills, type SkillSummaryResponse } from "@api/skills";
import { AGENTS_PROJECT_BINDING_ENABLED } from "@app/navigation/features";
import { GLOBAL_KNOWLEDGE_OPTIONS } from "./project.catalog";
import {
  createUnknownResourceOption,
  resolveSelectedResourceOptions,
  type ProjectResourceOption,
} from "./projectResourceOptions.shared";
import { tp } from "../../pages/project/project.i18n";

interface UseProjectResourceOptionsOptions {
  open: boolean;
  selectedKnowledgeIds: string[];
  selectedAgentIds: string[];
  selectedSkillIds: string[];
}

export const buildProjectSkillOptionLabel = (
  item: Pick<SkillSummaryResponse, "name" | "source">,
): string => {
  return item.source === "preset"
    ? `${item.name} · ${tp("resources.item.presetSkill")}`
    : `${item.name} · ${tp("resources.item.teamSkill")}`;
};

export const useProjectResourceOptions = ({
  open,
  selectedKnowledgeIds,
  selectedAgentIds,
  selectedSkillIds,
}: UseProjectResourceOptionsOptions) => {
  const [knowledgeOptionsLoading, setKnowledgeOptionsLoading] = useState(false);
  const [agentOptionsLoading, setAgentOptionsLoading] = useState(false);
  const [skillOptionsLoading, setSkillOptionsLoading] = useState(false);
  const [knowledgeOptions, setKnowledgeOptions] = useState<
    ProjectResourceOption[]
  >([]);
  const [agentOptions, setAgentOptions] = useState<ProjectResourceOption[]>([]);
  const [skillOptions, setSkillOptions] = useState<ProjectResourceOption[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadProjectResourceOptions = async () => {
      setKnowledgeOptionsLoading(true);
      setSkillOptionsLoading(true);
      setAgentOptionsLoading(AGENTS_PROJECT_BINDING_ENABLED);

      try {
        const [knowledgeResult, agentResult, skillResult] =
          await Promise.allSettled([
            listKnowledge(),
            AGENTS_PROJECT_BINDING_ENABLED
              ? listAgents()
              : Promise.resolve({ items: [] }),
            listSkills({ bindable: true }),
          ]);

        if (cancelled) {
          return;
        }

        if (knowledgeResult.status === "fulfilled") {
          setKnowledgeOptions(
            knowledgeResult.value.items.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          );
        } else {
          console.error(knowledgeResult.reason);
          setKnowledgeOptions([]);
        }

        if (skillResult.status === "fulfilled") {
          setSkillOptions(
            skillResult.value.items.map((item) => ({
              value: item.id,
              label: buildProjectSkillOptionLabel(item),
            })),
          );
        } else {
          console.error(skillResult.reason);
          setSkillOptions([]);
        }

        if (agentResult.status === "fulfilled") {
          setAgentOptions(
            agentResult.value.items.map((item) => ({
              value: item.id,
              label:
                item.status === "active"
                  ? `${item.name} · 已启用`
                  : `${item.name} · 已停用`,
            })),
          );
        } else if (AGENTS_PROJECT_BINDING_ENABLED) {
          console.error(agentResult.reason);
          setAgentOptions([]);
        } else {
          setAgentOptions([]);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(loadError);
        setKnowledgeOptions([]);
        setAgentOptions([]);
        setSkillOptions([]);
      } finally {
        if (!cancelled) {
          setKnowledgeOptionsLoading(false);
          setAgentOptionsLoading(false);
          setSkillOptionsLoading(false);
        }
      }
    };

    void loadProjectResourceOptions();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const resolvedKnowledgeOptions = useMemo(() => {
    return resolveSelectedResourceOptions({
      selectedIds: selectedKnowledgeIds,
      baseOptions: knowledgeOptions,
      createFallbackOption: (knowledgeId) =>
        GLOBAL_KNOWLEDGE_OPTIONS.find(
          (option) => option.value === knowledgeId,
        ) ?? createUnknownResourceOption(knowledgeId, "知识库"),
    });
  }, [knowledgeOptions, selectedKnowledgeIds]);

  const resolvedAgentOptions = useMemo(() => {
    return resolveSelectedResourceOptions({
      selectedIds: selectedAgentIds,
      baseOptions: agentOptions,
      createFallbackOption: (agentId) =>
        createUnknownResourceOption(agentId, "智能体"),
    });
  }, [agentOptions, selectedAgentIds]);

  const resolvedSkillOptions = useMemo(() => {
    return resolveSelectedResourceOptions({
      selectedIds: selectedSkillIds,
      baseOptions: skillOptions,
      createFallbackOption: (skillId) =>
        createUnknownResourceOption(skillId, "Skill"),
    });
  }, [selectedSkillIds, skillOptions]);

  return {
    knowledgeOptionsLoading,
    agentOptionsLoading,
    skillOptionsLoading,
    resolvedKnowledgeOptions,
    resolvedAgentOptions,
    resolvedSkillOptions,
  };
};
