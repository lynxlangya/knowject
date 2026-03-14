import type { KnowledgeSourceType } from '@modules/knowledge/knowledge.types.js';
import type { SkillSummaryResponse } from './skills.types.js';

const DEFAULT_CODEBASE_LIMIT = 20;
const DEFAULT_GIT_LOG_LIMIT = 20;
const DEFAULT_TOP_K = 5;

const KNOWLEDGE_SOURCE_OPTIONS: readonly KnowledgeSourceType[] = [
  'global_docs',
  'global_code',
];

const BUILTIN_SKILLS: readonly SkillSummaryResponse[] = [
  {
    id: 'search_codebase',
    name: '搜索代码库',
    description: '按关键词或路径范围搜索当前仓库中的代码与配置片段。',
    type: 'repository_search',
    source: 'system',
    handler: 'repository.search_codebase',
    parametersSchema: {
      type: 'object',
      description: '在当前仓库范围内执行代码搜索，支持按路径收窄结果。',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          description: '必填，搜索关键词或正则片段。',
        },
        path: {
          type: 'string',
          description: '可选，限定搜索目录或文件路径前缀。',
        },
        limit: {
          type: 'integer',
          description: '可选，返回结果上限。',
          minimum: 1,
          maximum: 50,
          default: DEFAULT_CODEBASE_LIMIT,
        },
      },
      required: ['query'],
    },
    status: 'contract_only',
  },
  {
    id: 'check_git_log',
    name: '检查 Git 历史',
    description: '查询提交历史、提交人和时间窗口，用于辅助回溯变更上下文。',
    type: 'repository_inspection',
    source: 'system',
    handler: 'repository.check_git_log',
    parametersSchema: {
      type: 'object',
      description: '查看当前仓库的 Git 提交历史，支持按 revision 范围和作者过滤。',
      additionalProperties: false,
      properties: {
        revisionRange: {
          type: 'string',
          description: '可选，Git revision range，例如 HEAD~10..HEAD。',
        },
        author: {
          type: 'string',
          description: '可选，按提交作者过滤。',
        },
        limit: {
          type: 'integer',
          description: '可选，返回提交数量上限。',
          minimum: 1,
          maximum: 50,
          default: DEFAULT_GIT_LOG_LIMIT,
        },
      },
      required: [],
    },
    status: 'contract_only',
  },
  {
    id: 'search_documents',
    name: '搜索知识文档',
    description: '复用服务端统一知识检索能力查询全局知识库文档，不直连底层 Chroma。',
    type: 'knowledge_search',
    source: 'system',
    handler: 'knowledge.search_documents',
    parametersSchema: {
      type: 'object',
      description: '复用 POST /api/knowledge/search 的服务端知识检索契约。',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          description: '必填，检索 query。',
        },
        knowledgeId: {
          type: 'string',
          description: '可选，只检索指定知识库。',
        },
        sourceType: {
          type: 'string',
          description: '可选，检索命名空间。',
          enum: KNOWLEDGE_SOURCE_OPTIONS,
          default: 'global_docs',
        },
        topK: {
          type: 'integer',
          description: '可选，返回结果数量，范围 1 到 10。',
          minimum: 1,
          maximum: 10,
          default: DEFAULT_TOP_K,
        },
      },
      required: ['query'],
    },
    status: 'available',
  },
] as const;

export const listRegisteredSkills = (): SkillSummaryResponse[] => {
  return Array.from(BUILTIN_SKILLS, (skill) => structuredClone(skill));
};

export const findRegisteredSkillById = (skillId: string): SkillSummaryResponse | null => {
  const skill = BUILTIN_SKILLS.find((item) => item.id === skillId);
  return skill ? structuredClone(skill) : null;
};
