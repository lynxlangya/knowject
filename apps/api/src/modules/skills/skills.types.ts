import type { ObjectId } from 'mongodb';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import type {
  SkillCategory,
  SkillDefinitionFields,
  SkillStatus,
} from './skills.definition.js';
export type {
  SkillAuthoringMessage,
  SkillAuthoringOption,
  SkillAuthoringScopeInput,
  SkillAuthoringStage,
  SkillAuthoringStructuredDraft,
  SkillAuthoringTurnInput,
  SkillAuthoringTurnStreamAckEvent,
  SkillAuthoringTurnStreamDoneEvent,
  SkillAuthoringTurnStreamErrorEvent,
  SkillAuthoringTurnStreamEvent,
  SkillAuthoringTurnStreamEventBase,
  SkillAuthoringTurnStreamEventType,
  SkillAuthoringTurnResponse,
} from './skills.authoring.js';

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

export const SKILL_SOURCES = ['preset', 'team'] as const;
export type MethodAssetSkillSource = (typeof SKILL_SOURCES)[number];
export const LEGACY_SKILL_SOURCES = ['system', 'custom', 'imported'] as const;
export type LegacySkillSource = (typeof LEGACY_SKILL_SOURCES)[number];
export type SkillSource = MethodAssetSkillSource | LegacySkillSource;
export type PersistedSkillSource = SkillSource;
export type ReadSkillSource = MethodAssetSkillSource;

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
  source: PersistedSkillSource;
  origin: SkillOrigin;
  handler: SkillHandler | null;
  parametersSchema: SkillParametersSchema | null;
  runtimeStatus: SkillRuntimeStatus;
  category?: SkillCategory | string;
  status?: SkillStatus;
  owner?: string;
  definition?: SkillDefinitionFields;
  statusChangedAt?: Date | null;
  lifecycleStatus?: SkillLifecycleStatus;
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

export interface NormalizedSkillReadModel {
  source: ReadSkillSource;
  lifecycleStatus: SkillLifecycleStatus;
  category?: SkillCategory;
  status: SkillStatus;
  owner: string;
  definition: SkillDefinitionFields;
  statusChangedAt: Date;
  bindable: boolean;
}

export interface ListSkillsInput {
  source?: unknown;
  lifecycleStatus?: unknown;
  bindable?: unknown;
}

export interface ListSkillsFilters {
  source?: PersistedSkillSource;
  lifecycleStatus?: SkillLifecycleStatus;
  bindable?: boolean;
}

export interface CreateSkillInput {
  name?: unknown;
  description?: unknown;
  category?: unknown;
  owner?: unknown;
  definition?: unknown;
}

export interface UpdateSkillInput {
  name?: unknown;
  description?: unknown;
  category?: unknown;
  owner?: unknown;
  definition?: unknown;
  status?: unknown;
}

export interface SkillSummaryResponse {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: SkillType;
  source: ReadSkillSource;
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
  bundleFiles: SkillBundleFileRecord[];
}

export interface SkillsListResponse {
  total: number;
  items: SkillSummaryResponse[];
  meta: {
    module: 'skills';
    stage: 'GA-09';
    registry: 'preset+team';
    builtinOnly: false;
    boundaries: {
      businessRuntime: 'node-express';
      registryStore: 'mongodb+fs';
      knowledgeAccess: 'service-layer-only';
      execution: 'service-linked-or-contract-only';
      authoring: 'structured-method-asset';
      source: 'team-created-only';
      binding: 'project-first';
      runtime: 'manual-or-recommended-in-conversation';
    };
  };
}

export interface SkillMutationResponse {
  skill: SkillDetailResponse;
}

export interface SkillDetailEnvelope {
  skill: SkillDetailResponse;
}
