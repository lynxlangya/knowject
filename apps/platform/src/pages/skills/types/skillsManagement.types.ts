import type {
  SkillCategory,
  SkillDefinitionFields,
  SkillSource,
  SkillStatus,
} from '@api/skills';

export type SkillSidebarFilter = 'all' | SkillStatus | SkillSource;

export type EditorMode = 'create' | 'edit' | null;

export interface SkillEditorDraft {
  name: string;
  description: string;
  category: SkillCategory;
  owner: string;
  status: SkillStatus;
  definition: SkillDefinitionFields;
}

export interface SkillEditorValidation {
  valid: boolean;
  errors: string[];
}

export interface SkillFilterGroup {
  key: SkillSidebarFilter;
  label: string;
  count: number;
}
