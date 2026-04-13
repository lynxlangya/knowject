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
  skill: SkillSummaryResponse;
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

export const deleteSkill = async (skillId: string): Promise<void> => {
  const response = await client.delete<ApiEnvelope<null>>(
    `/skills/${encodeURIComponent(skillId)}`,
  );

  unwrapApiData(response.data);
};
