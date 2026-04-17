import type { SkillAuthoringInference } from "./skills.authoring.js";

export const SKILL_CREATION_TEMPLATE_HINTS = [
  "goal",
  "workflow",
  "output",
  "guardrails",
] as const;
export type SkillCreationTemplateHint =
  (typeof SKILL_CREATION_TEMPLATE_HINTS)[number];

export interface SkillCreationDraftGenerateInput {
  name?: unknown;
  description?: unknown;
  taskIntent?: unknown;
  templateHint?: unknown;
}

export interface SkillCreationDraftRefineInput {
  name?: unknown;
  description?: unknown;
  markdownDraft?: unknown;
  optimizationInstruction?: unknown;
  currentInference?: unknown;
}

export interface SkillCreationDraftSaveInput {
  markdownDraft?: unknown;
  currentInference?: unknown;
}

export interface SkillCreationDraftResponse {
  markdownDraft: string;
  currentSummary: string;
  currentInference: SkillAuthoringInference;
  confirmationQuestions: string[];
  needsFollowup: boolean;
}
