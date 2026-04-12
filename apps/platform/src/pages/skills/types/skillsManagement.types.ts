import type {
  SkillAuthoringHumanOverrides,
  SkillAuthoringInference,
  SkillCategory,
  SkillDefinitionFields,
  SkillSource,
  SkillStatus,
  SkillAuthoringStage,
  SkillAuthoringStructuredDraft,
} from "@api/skills";

export type SkillSidebarFilter = "all" | SkillStatus | SkillSource;

export type EditorMode = "create" | "edit" | null;

export type SkillAuthoringSessionStage =
  | SkillAuthoringStage
  | "hydrated";

export interface SkillAuthoringCreateScopeState {
  scenario: SkillCategory | null;
  targets: string[];
}

export interface SkillAuthoringSessionMessage {
  id?: string;
  role: "assistant" | "user";
  content: string;
}

export interface SkillAuthoringSessionState {
  stage: SkillAuthoringSessionStage;
  scope: SkillAuthoringCreateScopeState;
  messages: SkillAuthoringSessionMessage[];
  questionCount: number;
  currentSummary: string;
  structuredDraft: SkillAuthoringStructuredDraft | null;
  currentInference: SkillAuthoringInference | null;
  humanOverrides: SkillAuthoringHumanOverrides | null;
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
