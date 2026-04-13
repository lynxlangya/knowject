import type {
  ProjectResourceFocus,
  ProjectResourceGroup,
} from "@app/project/project.types";
import type { ProjectResourceSummaryItem } from "../types/projectResources.types";
import { tp } from "../project.i18n";

export const getProjectResourceCountByGroup = (
  groups: ProjectResourceGroup[],
): Record<ProjectResourceFocus, number> => {
  return groups.reduce<Record<ProjectResourceFocus, number>>(
    (result, group) => {
      result[group.key] = group.items.length;
      return result;
    },
    {
      knowledge: 0,
      skills: 0,
      agents: 0,
    },
  );
};

export const buildProjectResourceSummaryItems = ({
  resourceCountByGroup,
  globalKnowledgeCount,
  projectKnowledgeCount,
}: {
  resourceCountByGroup: Record<ProjectResourceFocus, number>;
  globalKnowledgeCount: number;
  projectKnowledgeCount: number;
}): ProjectResourceSummaryItem[] => {
  return [
    {
      label: tp("resources.summary.knowledge"),
      value: tp("resources.summary.countValue", {
        count: resourceCountByGroup.knowledge,
      }),
      hint: tp("resources.summary.knowledgeHint", {
        global: globalKnowledgeCount,
        project: projectKnowledgeCount,
      }),
    },
    {
      label: tp("resources.summary.skills"),
      value: tp("resources.summary.countValue", {
        count: resourceCountByGroup.skills,
      }),
      hint: tp("resources.summary.skillsHint"),
    },
    {
      label: tp("resources.summary.layered"),
      value: tp("resources.summary.layeredValue"),
      hint: tp("resources.summary.layeredHint"),
    },
  ];
};
