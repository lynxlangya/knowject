import type {
  ProjectResourceFocus,
  ProjectResourceGroup,
} from "@app/project/project.types";
import type { ProjectResourceSummaryItem } from "../types/projectResources.types";

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
      label: "知识库",
      value: `${resourceCountByGroup.knowledge} 个`,
      hint: `${globalKnowledgeCount} 个全局绑定 + ${projectKnowledgeCount} 个项目私有`,
    },
    {
      label: "技能",
      value: `${resourceCountByGroup.skills} 个`,
      hint: "当前项目可直接复用的工作流能力",
    },
    {
      label: "智能体",
      value: `${resourceCountByGroup.agents} 个`,
      hint: "当前项目已绑定的协作智能体",
    },
    {
      label: "资源分层",
      value: "2 层",
      hint: "全局资产治理，项目资源编排与消费",
    },
  ];
};
