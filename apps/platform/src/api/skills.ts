import { unwrapApiData, type ApiEnvelope } from "@knowject/request";
import { client } from "./client";

export type SkillType =
  | "repository_search"
  | "repository_inspection"
  | "knowledge_search"
  | "markdown_bundle";

export type SkillSource = "preset" | "team";
export type SkillOrigin = "manual" | "github" | "url";
export type SkillHandler =
  | "repository.search_codebase"
  | "repository.check_git_log"
  | "knowledge.search_documents";
export type SkillRuntimeStatus = "available" | "contract_only";
export type SkillLifecycleStatus = "draft" | "published";
export const SKILL_CATEGORY_VALUES = [
  "documentation_architecture",
  "engineering_execution",
  "governance_capture",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORY_VALUES)[number];
export type SkillStatus = "draft" | "active" | "deprecated" | "archived";
export type SkillFollowupStrategy = "none" | "optional" | "required";
export const SKILL_CREATION_TEMPLATE_HINT_VALUES = [
  "goal",
  "workflow",
  "output",
  "guardrails",
] as const;
export type SkillCreationTemplateHint =
  (typeof SKILL_CREATION_TEMPLATE_HINT_VALUES)[number];
export const SKILL_CREATION_JOB_STATUS_VALUES = [
  "queued",
  "generating",
  "ready",
  "failed",
  "saved",
] as const;
export type SkillCreationJobStatus =
  (typeof SKILL_CREATION_JOB_STATUS_VALUES)[number];

export interface SkillDefinitionFields {
  goal: string;
  triggerScenarios: string[];
  requiredContext: string[];
  workflow: string[];
  outputContract: string[];
  guardrails: string[];
  artifacts: string[];
  projectBindingNotes: string[];
  followupQuestionsStrategy: SkillFollowupStrategy;
}

export type SkillParameterType = "string" | "integer" | "boolean";

export interface SkillParameterSchemaProperty {
  type: SkillParameterType;
  description: string;
  enum?: readonly string[];
  minimum?: number;
  maximum?: number;
  default?: string | number | boolean;
}

export interface SkillParametersSchema {
  type: "object";
  description: string;
  additionalProperties: false;
  properties: Record<string, SkillParameterSchemaProperty>;
  required: string[];
}

export interface SkillImportProvenance {
  repository: string | null;
  path: string | null;
  ref: string | null;
  sourceUrl: string | null;
  githubUrl: string | null;
}

export interface SkillSummaryResponse {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: SkillType;
  source: SkillSource;
  origin: SkillOrigin | null;
  handler: SkillHandler | null;
  parametersSchema: SkillParametersSchema | null;
  runtimeStatus: SkillRuntimeStatus;
  lifecycleStatus: SkillLifecycleStatus;
  category?: SkillCategory;
  status?: SkillStatus;
  owner?: string;
  definition?: SkillDefinitionFields;
  statusChangedAt?: string | null;
  bindable: boolean;
  markdownExcerpt: string;
  bundleFileCount: number;
  importProvenance: SkillImportProvenance | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface SkillDetailResponse extends SkillSummaryResponse {
  skillMarkdown: string;
  bundleFiles: Array<{
    path: string;
    size: number;
  }>;
}

export interface SkillListResponse {
  total: number;
  items: SkillSummaryResponse[];
  meta: {
    module: "skills";
    stage: "GA-09";
    registry: "preset+team";
    builtinOnly: false;
    boundaries: {
      businessRuntime: "node-express";
      registryStore: "mongodb+fs";
      knowledgeAccess: "service-layer-only";
      execution: "service-linked-or-contract-only";
      authoring: "structured-method-asset";
      source: "team-created-only";
      binding: "project-first";
      runtime: "manual-or-recommended-in-conversation";
    };
  };
}

export interface SkillMutationResponse {
  skill: SkillDetailResponse;
}

export interface SkillCreationInference {
  category: SkillCategory | null;
  contextTargets: string[];
  rationale?: string;
}

export interface SkillCreationDraftResponse {
  markdownDraft: string;
  currentSummary: string;
  currentInference: SkillCreationInference;
  confirmationQuestions: string[];
  needsFollowup: boolean;
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
  currentInference: SkillCreationInference | null;
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

export interface ListSkillsParams {
  source?: SkillSource;
  lifecycleStatus?: SkillLifecycleStatus;
  bindable?: boolean;
}

export interface UpdateSkillRequest {
  name?: string;
  description?: string;
  category?: SkillCategory;
  owner?: string;
  definition?: SkillDefinitionFields;
  status?: SkillStatus;
}

export interface GenerateSkillCreationDraftRequest {
  name: string;
  description: string;
  taskIntent: string;
  templateHint?: SkillCreationTemplateHint | null;
}

export interface RefineSkillCreationDraftRequest {
  name: string;
  description: string;
  markdownDraft: string;
  optimizationInstruction?: string;
  currentInference?: SkillCreationInference | null;
}

export interface SaveSkillCreationDraftRequest {
  markdownDraft: string;
  currentInference?: SkillCreationInference | null;
}

export interface CreateSkillCreationJobRequest {
  name: string;
  description: string;
  taskIntent: string;
  templateHint?: SkillCreationTemplateHint | null;
}

export interface RefineSkillCreationJobRequest {
  markdownDraft: string;
  optimizationInstruction?: string;
  currentInference?: SkillCreationInference | null;
}

export interface SaveSkillCreationJobRequest {
  markdownDraft: string;
  currentInference?: SkillCreationInference | null;
}

export const listSkills = async (
  params: ListSkillsParams = {},
): Promise<SkillListResponse> => {
  const response = await client.get<ApiEnvelope<SkillListResponse>>("/skills", {
    params,
  });
  return unwrapApiData(response.data);
};

export const updateSkill = async (
  skillId: string,
  payload: UpdateSkillRequest,
): Promise<SkillMutationResponse> => {
  const response = await client.patch<ApiEnvelope<SkillMutationResponse>>(
    `/skills/${encodeURIComponent(skillId)}`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const generateSkillCreationDraft = async (
  payload: GenerateSkillCreationDraftRequest,
): Promise<SkillCreationDraftResponse> => {
  const response = await client.post<ApiEnvelope<SkillCreationDraftResponse>>(
    "/skills/creation/drafts/generate",
    payload,
  );

  return unwrapApiData(response.data);
};

export const createSkillCreationJob = async (
  payload: CreateSkillCreationJobRequest,
): Promise<SkillCreationJobEnvelope> => {
  const response = await client.post<ApiEnvelope<SkillCreationJobEnvelope>>(
    "/skills/creation/jobs",
    payload,
  );

  return unwrapApiData(response.data);
};

export const listSkillCreationJobs = async (): Promise<SkillCreationJobsListResponse> => {
  const response = await client.get<ApiEnvelope<SkillCreationJobsListResponse>>(
    "/skills/creation/jobs",
  );

  return unwrapApiData(response.data);
};

export const getSkillCreationJob = async (
  jobId: string,
): Promise<SkillCreationJobEnvelope> => {
  const response = await client.get<ApiEnvelope<SkillCreationJobEnvelope>>(
    `/skills/creation/jobs/${encodeURIComponent(jobId)}`,
  );

  return unwrapApiData(response.data);
};

export const refineSkillCreationJob = async (
  jobId: string,
  payload: RefineSkillCreationJobRequest,
): Promise<SkillCreationJobEnvelope> => {
  const response = await client.post<ApiEnvelope<SkillCreationJobEnvelope>>(
    `/skills/creation/jobs/${encodeURIComponent(jobId)}/refine`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const saveSkillCreationJob = async (
  jobId: string,
  payload: SaveSkillCreationJobRequest,
): Promise<SkillMutationResponse & SkillCreationJobEnvelope> => {
  const response = await client.post<
    ApiEnvelope<SkillMutationResponse & SkillCreationJobEnvelope>
  >(
    `/skills/creation/jobs/${encodeURIComponent(jobId)}/save`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const refineSkillCreationDraft = async (
  payload: RefineSkillCreationDraftRequest,
): Promise<SkillCreationDraftResponse> => {
  const response = await client.post<ApiEnvelope<SkillCreationDraftResponse>>(
    "/skills/creation/drafts/refine",
    payload,
  );

  return unwrapApiData(response.data);
};

export const saveSkillCreationDraft = async (
  payload: SaveSkillCreationDraftRequest,
): Promise<SkillMutationResponse> => {
  const response = await client.post<ApiEnvelope<SkillMutationResponse>>(
    "/skills/creation/drafts/save",
    payload,
  );

  return unwrapApiData(response.data);
};

export const deleteSkill = async (skillId: string): Promise<void> => {
  const response = await client.delete<ApiEnvelope<null>>(
    `/skills/${encodeURIComponent(skillId)}`,
  );

  unwrapApiData(response.data);
};
