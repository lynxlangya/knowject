import type { ObjectId } from "mongodb";
import type { SkillAuthoringInference } from "./skills.authoring.js";
import type { SkillCreationTemplateHint } from "./skills.creation.js";

export const SKILL_CREATION_JOB_STATUSES = [
  "queued",
  "generating",
  "ready",
  "failed",
  "saved",
] as const;
export type SkillCreationJobStatus =
  (typeof SKILL_CREATION_JOB_STATUSES)[number];

export interface SkillCreationJobDocument {
  _id?: ObjectId;
  ownerId: string;
  ownerUsername: string;
  name: string;
  description: string;
  taskIntent: string;
  templateHint: SkillCreationTemplateHint | null;
  status: SkillCreationJobStatus;
  markdownDraft: string | null;
  currentSummary: string | null;
  currentInference: SkillAuthoringInference | null;
  confirmationQuestions: string[];
  errorMessage: string | null;
  savedSkillId: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  expiresAt: Date;
}

export interface SkillCreationJobResponse {
  id: string;
  status: SkillCreationJobStatus;
  name: string;
  description: string;
  taskIntent: string;
  templateHint: SkillCreationTemplateHint | null;
  markdownDraft: string | null;
  currentSummary: string | null;
  currentInference: SkillAuthoringInference | null;
  confirmationQuestions: string[];
  errorMessage: string | null;
  savedSkillId: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
}

export interface SkillCreationJobEnvelope {
  job: SkillCreationJobResponse;
}

export interface SkillCreationJobsListResponse {
  items: SkillCreationJobResponse[];
}

export interface SkillCreationJobCreateInput {
  name?: unknown;
  description?: unknown;
  taskIntent?: unknown;
  templateHint?: unknown;
}

export interface SkillCreationJobRefineInput {
  markdownDraft?: unknown;
  optimizationInstruction?: unknown;
  currentInference?: unknown;
}

export interface SkillCreationJobSaveInput {
  markdownDraft?: unknown;
  currentInference?: unknown;
}

