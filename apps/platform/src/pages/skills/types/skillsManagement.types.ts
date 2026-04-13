import type { SkillStatus } from "@api/skills";

export type SkillSidebarFilter = "all" | SkillStatus;

export interface SkillFilterGroup {
  key: SkillSidebarFilter;
  label: string;
  count: number;
}
