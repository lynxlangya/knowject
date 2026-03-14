import type { ObjectId } from 'mongodb';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export interface SkillsCommandContext {
  actor: AuthenticatedRequestUser;
}

export const SKILL_TYPES = [
  'repository_search',
  'repository_inspection',
  'knowledge_search',
  'markdown_bundle',
] as const;
export type SkillType = (typeof SKILL_TYPES)[number];

export const SKILL_SOURCES = ['system', 'custom', 'imported'] as const;
export type SkillSource = (typeof SKILL_SOURCES)[number];

export const SKILL_ORIGINS = ['manual', 'github', 'url'] as const;
export type SkillOrigin = (typeof SKILL_ORIGINS)[number];

export const SKILL_HANDLERS = [
  'repository.search_codebase',
  'repository.check_git_log',
  'knowledge.search_documents',
] as const;
export type SkillHandler = (typeof SKILL_HANDLERS)[number];

export const SKILL_RUNTIME_STATUSES = ['available', 'contract_only'] as const;
export type SkillRuntimeStatus = (typeof SKILL_RUNTIME_STATUSES)[number];

export const SKILL_LIFECYCLE_STATUSES = ['draft', 'published'] as const;
export type SkillLifecycleStatus = (typeof SKILL_LIFECYCLE_STATUSES)[number];

export const SKILL_PARAMETER_TYPES = ['string', 'integer', 'boolean'] as const;
export type SkillParameterType = (typeof SKILL_PARAMETER_TYPES)[number];

export type SkillParameterDefaultValue = string | number | boolean;

export interface SkillParameterSchemaProperty {
  type: SkillParameterType;
  description: string;
  enum?: readonly string[];
  minimum?: number;
  maximum?: number;
  default?: SkillParameterDefaultValue;
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

export interface SkillDocument {
  _id?: ObjectId;
  name: string;
  slug: string;
  description: string;
  type: SkillType;
  source: SkillSource;
  origin: SkillOrigin;
  handler: SkillHandler | null;
  parametersSchema: SkillParametersSchema | null;
  runtimeStatus: SkillRuntimeStatus;
  lifecycleStatus: SkillLifecycleStatus;
  skillMarkdown: string;
  markdownExcerpt: string;
  storagePath: string;
  bundleFiles: SkillBundleFileRecord[];
  importProvenance: SkillImportProvenance | null;
  createdBy: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSkillsInput {
  source?: unknown;
  lifecycleStatus?: unknown;
  bindable?: unknown;
}

export interface ListSkillsFilters {
  source?: SkillSource;
  lifecycleStatus?: SkillLifecycleStatus;
  bindable?: boolean;
}

export interface CreateSkillInput {
  name?: unknown;
  description?: unknown;
  skillMarkdown?: unknown;
}

export interface UpdateSkillInput {
  name?: unknown;
  description?: unknown;
  skillMarkdown?: unknown;
  lifecycleStatus?: unknown;
}

export interface ImportSkillInput {
  mode?: unknown;
  dryRun?: unknown;
  githubUrl?: unknown;
  repository?: unknown;
  path?: unknown;
  ref?: unknown;
  url?: unknown;
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

export interface SkillsListResponse {
  total: number;
  items: SkillSummaryResponse[];
  meta: {
    module: 'skills';
    stage: 'GA-09';
    registry: 'hybrid';
    builtinOnly: false;
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

export interface SkillMutationResponse {
  skill: SkillDetailResponse;
}

export interface SkillDetailEnvelope {
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
