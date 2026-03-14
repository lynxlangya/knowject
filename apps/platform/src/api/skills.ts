import {
  unwrapApiData,
  type ApiEnvelope,
} from '@knowject/request';
import { client } from './client';

export type SkillType =
  | 'repository_search'
  | 'repository_inspection'
  | 'knowledge_search';

export type SkillSource = 'system';
export type SkillHandler =
  | 'repository.search_codebase'
  | 'repository.check_git_log'
  | 'knowledge.search_documents';

export type SkillStatus = 'available' | 'contract_only';
export type SkillParameterType = 'string' | 'integer';

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

export interface SkillListResponse {
  total: number;
  items: SkillSummaryResponse[];
  meta: {
    module: 'skills';
    stage: 'GA-08';
    registry: 'code';
    builtinOnly: boolean;
    boundaries: {
      businessRuntime: 'node-express';
      registryStore: 'code-registry';
      knowledgeAccess: 'service-layer-only';
      execution: 'service-linked-or-contract-only';
    };
  };
}

export const listSkills = async (): Promise<SkillListResponse> => {
  const response = await client.get<ApiEnvelope<SkillListResponse>>('/skills');
  return unwrapApiData(response.data);
};
