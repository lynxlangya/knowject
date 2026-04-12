import type {
  SkillCategory,
  SkillDefinitionFields,
} from "./skills.definition.js";

export type SkillAuthoringStage =
  | "interviewing"
  | "synthesizing"
  | "awaiting_confirmation";

export interface SkillAuthoringScopeInput {
  scenario: SkillCategory;
  targets: string[];
}

export interface SkillAuthoringMessage {
  role: "assistant" | "user";
  content: string;
}

export interface SkillAuthoringInference {
  category: SkillCategory | null;
  contextTargets: string[];
  rationale?: string;
}

export interface SkillAuthoringHumanOverrides {
  category?: SkillCategory | null;
  contextTargets?: string[];
}

export interface SkillAuthoringTurnInput {
  scope?: unknown;
  messages?: unknown;
  questionCount?: unknown;
  currentSummary?: unknown;
  currentStructuredDraft?: unknown;
  currentInference?: unknown;
  humanOverrides?: unknown;
}

export interface SkillAuthoringOption {
  id: "a" | "b" | "c";
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
  currentInference: SkillAuthoringInference;
  structuredDraft: SkillAuthoringStructuredDraft | null;
  readyForConfirmation: boolean;
}

export type SkillAuthoringTurnStreamEventType = "ack" | "done" | "error";

export interface SkillAuthoringTurnStreamEventBase {
  version: "v1";
  type: SkillAuthoringTurnStreamEventType;
  sequence: number;
}

export interface SkillAuthoringTurnStreamAckEvent extends SkillAuthoringTurnStreamEventBase {
  type: "ack";
}

export interface SkillAuthoringTurnStreamDoneEvent extends SkillAuthoringTurnStreamEventBase {
  type: "done";
  turn: SkillAuthoringTurnResponse;
}

export interface SkillAuthoringTurnStreamErrorEvent extends SkillAuthoringTurnStreamEventBase {
  type: "error";
  status: number;
  code: string;
  message: string;
  retryable: boolean;
}

export type SkillAuthoringTurnStreamEvent =
  | SkillAuthoringTurnStreamAckEvent
  | SkillAuthoringTurnStreamDoneEvent
  | SkillAuthoringTurnStreamErrorEvent;
