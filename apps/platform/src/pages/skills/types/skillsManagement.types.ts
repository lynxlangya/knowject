import type {
  SkillCreationJobResponse,
  SkillCreationInference,
  SkillCreationTemplateHint,
  SkillStatus,
} from "@api/skills";

export type SkillSidebarFilter = "all" | SkillStatus;
export type SkillCreationPageStatus =
  | "idle"
  | "generating"
  | "editing"
  | "optimizing"
  | "saving"
  | "saved"
  | "error";

export interface SkillFilterGroup {
  key: SkillSidebarFilter;
  label: string;
  count: number;
}

export interface SkillCreationInputDraft {
  name: string;
  description: string;
  taskIntent: string;
  templateHint: SkillCreationTemplateHint | null;
}

export interface SkillCreationTemplateOption {
  value: SkillCreationTemplateHint;
  label: string;
  preview: string;
}

export interface SkillCreationDraftSessionState {
  status: SkillCreationPageStatus;
  inputDraft: SkillCreationInputDraft;
  markdownDraft: string;
  baselineMarkdownDraft: string;
  lastOptimizedMarkdownDraft: string | null;
  currentInference: SkillCreationInference | null;
  currentSummary: string;
  confirmationQuestions: string[];
  optimizationInstruction: string;
  isDirty: boolean;
}

export interface SkillCreationSnapshot {
  markdownDraft: string;
  currentInference: SkillCreationInference | null;
  currentSummary: string;
  confirmationQuestions: string[];
}

export interface SkillCreationJobsState {
  items: SkillCreationJobResponse[];
  loading: boolean;
  error: string | null;
  shouldPoll: boolean;
  pollingStopped: boolean;
  activeJobId: string | null;
  drawerOpen: boolean;
}
