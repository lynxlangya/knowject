import {
  unwrapApiData,
  type ApiEnvelope,
} from '@knowject/request';
import { client } from './client';

export type SkillType =
  | 'repository_search'
  | 'repository_inspection'
  | 'knowledge_search'
  | 'markdown_bundle';

export type SkillSource = 'system' | 'custom' | 'imported';
export type SkillOrigin = 'manual' | 'github' | 'url';
export type SkillHandler =
  | 'repository.search_codebase'
  | 'repository.check_git_log'
  | 'knowledge.search_documents';
export type SkillRuntimeStatus = 'available' | 'contract_only';
export type SkillLifecycleStatus = 'draft' | 'published';
export type SkillParameterType = 'string' | 'integer' | 'boolean';

export interface SkillParameterSchemaProperty {
  type: SkillParameterType;
  description: string;
  enum?: readonly string[];
  minimum?: number;
  maximum?: number;
  default?: string | number | boolean;
}

export interface SkillParametersSchema {
  type: 'object';
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

export interface SkillBundleFileRecord {
  path: string;
  size: number;
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
  bundleFiles: SkillBundleFileRecord[];
}

export interface SkillListResponse {
  total: number;
  items: SkillSummaryResponse[];
  meta: {
    module: 'skills';
    stage: 'GA-09';
    registry: 'hybrid';
    builtinOnly: boolean;
    boundaries: {
      businessRuntime: 'node-express';
      registryStore: 'mongodb+fs';
      knowledgeAccess: 'service-layer-only';
      execution: 'service-linked-or-contract-only';
      import: 'github-or-raw-url';
      authoring: 'skill-markdown';
    };
  };
}

export interface SkillDetailEnvelope {
  skill: SkillDetailResponse;
}

export interface SkillMutationResponse {
  skill: SkillDetailResponse;
}

export interface SkillImportPreview {
  source: 'imported';
  origin: 'github' | 'url';
  type: 'markdown_bundle';
  name: string;
  description: string;
  runtimeStatus: SkillRuntimeStatus;
  lifecycleStatus: 'draft';
  bindable: false;
  markdownExcerpt: string;
  skillMarkdown: string;
  bundleFiles: SkillBundleFileRecord[];
  bundleFileCount: number;
  importProvenance: SkillImportProvenance;
}

export interface SkillImportPreviewResponse {
  preview: SkillImportPreview;
}

export interface ListSkillsParams {
  source?: SkillSource;
  lifecycleStatus?: SkillLifecycleStatus;
  bindable?: boolean;
}

export interface CreateSkillRequest {
  skillMarkdown: string;
  name?: string;
  description?: string;
}

export interface UpdateSkillRequest {
  skillMarkdown?: string;
  name?: string;
  description?: string;
  lifecycleStatus?: SkillLifecycleStatus;
}

export interface ImportSkillRequest {
  mode: 'github' | 'url';
  dryRun?: boolean;
  githubUrl?: string;
  repository?: string;
  path?: string;
  ref?: string;
  url?: string;
}

export const listSkills = async (
  params: ListSkillsParams = {},
): Promise<SkillListResponse> => {
  const response = await client.get<ApiEnvelope<SkillListResponse>>('/skills', {
    params,
  });
  return unwrapApiData(response.data);
};

export const getSkillDetail = async (
  skillId: string,
): Promise<SkillDetailEnvelope> => {
  const response = await client.get<ApiEnvelope<SkillDetailEnvelope>>(
    `/skills/${encodeURIComponent(skillId)}`,
  );

  return unwrapApiData(response.data);
};

export const createSkill = async (
  payload: CreateSkillRequest,
): Promise<SkillMutationResponse> => {
  const response = await client.post<ApiEnvelope<SkillMutationResponse>>(
    '/skills',
    payload,
  );

  return unwrapApiData(response.data);
};

export const importSkill = async (
  payload: ImportSkillRequest,
): Promise<SkillMutationResponse | SkillImportPreviewResponse> => {
  const response = await client.post<
    ApiEnvelope<SkillMutationResponse | SkillImportPreviewResponse>
  >('/skills/import', payload);

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
