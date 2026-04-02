import type {
  SkillCategory,
  SkillDefinitionFields,
  SkillSource,
  SkillStatus,
  SkillAuthoringStructuredDraft,
} from '@api/skills';

export type SkillSidebarFilter = 'all' | SkillStatus | SkillSource;

export type EditorMode = 'create' | 'edit' | null;

export type SkillAuthoringSessionStage =
  | 'scope_selecting'
  | 'interviewing'
  | 'synthesizing'
  | 'awaiting_confirmation'
  | 'hydrated';

export interface SkillAuthoringCreateScopeState {
  scenario: SkillCategory | null;
  targets: string[];
}

export interface SkillAuthoringSessionMessage {
  id?: string;
  role: 'assistant' | 'user';
  content: string;
}

export interface SkillAuthoringSessionState {
  stage: SkillAuthoringSessionStage;
  scope: SkillAuthoringCreateScopeState;
  messages: SkillAuthoringSessionMessage[];
  questionCount: number;
  currentSummary: string;
  structuredDraft: SkillAuthoringStructuredDraft | null;
  readyForConfirmation: boolean;
  pendingAnswer: string;
}

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
