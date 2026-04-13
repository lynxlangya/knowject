import type { SkillStatus, SkillSummaryResponse } from "@api/skills";
import type {
  SkillFilterGroup,
  SkillSidebarFilter,
} from "../types/skillsManagement.types";
import { tp } from "../skills.i18n";

export const filterSkills = (
  items: SkillSummaryResponse[],
  filter: SkillSidebarFilter,
): SkillSummaryResponse[] => {
  if (filter === "draft") {
    return items.filter((item) => item.status === "draft");
  }

  if (filter === "active") {
    return items.filter((item) => item.status === "active");
  }

  if (filter === "deprecated") {
    return items.filter((item) => item.status === "deprecated");
  }

  if (filter === "archived") {
    return items.filter((item) => item.status === "archived");
  }

  return items;
};

const STATUS_FILTERS: SkillStatus[] = [
  "active",
  "draft",
  "deprecated",
  "archived",
];

export const buildSkillFilterGroups = (
  items: SkillSummaryResponse[],
): SkillFilterGroup[] => {
  return [
    {
      key: "all",
      label: tp("filters.all"),
      count: items.length,
    },
    ...STATUS_FILTERS.map((status) => ({
      key: status,
      label: tp(`filters.${status}`),
      count: filterSkills(items, status).length,
    })),
  ];
};
