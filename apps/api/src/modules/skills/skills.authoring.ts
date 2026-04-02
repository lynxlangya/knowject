import type {
  SkillCategory,
  SkillDefinitionFields,
} from './skills.definition.js';

export type SkillAuthoringStage =
  | 'scope_selecting'
  | 'interviewing'
  | 'synthesizing'
  | 'awaiting_confirmation'
  | 'hydrated';

export interface SkillAuthoringScopeInput {
  scenario: SkillCategory;
  targets: string[];
}

export interface SkillAuthoringMessage {
  role: 'assistant' | 'user';
  content: string;
}

export interface SkillAuthoringTurnInput {
  scope?: unknown;
  messages?: unknown;
  questionCount?: unknown;
  currentSummary?: unknown;
  currentStructuredDraft?: unknown;
}

export interface SkillAuthoringOption {
  id: 'a' | 'b' | 'c';
  label: string;
  rationale: string;
  recommended: boolean;
}

export interface SkillAuthoringStructuredDraft {
  name: string;
  description: string;
  category: SkillCategory;
  owner: string;
  definition: SkillDefinitionFields;
}

export interface SkillAuthoringTurnResponse {
  stage: SkillAuthoringStage;
  assistantMessage: string;
  nextQuestion: string;
  options: SkillAuthoringOption[];
  questionCount: number;
  currentSummary: string;
  structuredDraft: SkillAuthoringStructuredDraft | null;
  readyForConfirmation: boolean;
}
