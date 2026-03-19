export type SkillSidebarFilter =
  | 'all'
  | 'published'
  | 'draft'
  | 'system'
  | 'custom'
  | 'imported';

export type EditorMode = 'create' | 'edit' | null;
export type ImportMode = 'github' | 'url';

export interface SkillFilterGroup {
  key: SkillSidebarFilter;
  label: string;
  count: number;
}
