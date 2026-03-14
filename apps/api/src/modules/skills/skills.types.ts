import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export interface SkillsCommandContext {
  actor: AuthenticatedRequestUser;
}

export const SKILL_TYPES = [
  'repository_search',
  'repository_inspection',
  'knowledge_search',
] as const;
export type SkillType = (typeof SKILL_TYPES)[number];

export const SKILL_SOURCES = ['system'] as const;
export type SkillSource = (typeof SKILL_SOURCES)[number];

export const SKILL_HANDLERS = [
  'repository.search_codebase',
  'repository.check_git_log',
  'knowledge.search_documents',
] as const;
export type SkillHandler = (typeof SKILL_HANDLERS)[number];

export const SKILL_STATUSES = ['available', 'contract_only'] as const;
export type SkillStatus = (typeof SKILL_STATUSES)[number];

export const SKILL_PARAMETER_TYPES = ['string', 'integer'] as const;
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

export interface SkillSummaryResponse {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  source: SkillSource;
  handler: SkillHandler;
  parametersSchema: SkillParametersSchema;
  status: SkillStatus;
}

export interface SkillsListResponse {
  total: number;
  items: SkillSummaryResponse[];
  meta: {
    module: 'skills';
    stage: 'GA-08';
    registry: 'code';
    builtinOnly: true;
    boundaries: {
      businessRuntime: 'node-express';
      registryStore: 'code-registry';
      knowledgeAccess: 'service-layer-only';
      execution: 'service-linked-or-contract-only';
    };
  };
}
