import type { KnowledgeSourceType } from '@modules/knowledge/knowledge.types.js';
import type {
  SkillDetailResponse,
  SkillParametersSchema,
  SkillSummaryResponse,
} from './skills.types.js';

const DEFAULT_CODEBASE_LIMIT = 20;
const DEFAULT_GIT_LOG_LIMIT = 20;
const DEFAULT_TOP_K = 5;
const BUILTIN_SKILL_TIMESTAMP = '2026-03-10T00:00:00.000Z';

const KNOWLEDGE_SOURCE_OPTIONS: readonly KnowledgeSourceType[] = [
  'global_docs',
  'global_code',
];

const createBuiltinSkillMarkdown = (
  skill: Pick<
    SkillDetailResponse,
    | 'name'
    | 'description'
    | 'handler'
    | 'runtimeStatus'
    | 'lifecycleStatus'
    | 'parametersSchema'
  >,
): string => {
  const parameterSection = !skill.parametersSchema
    ? '当前没有额外参数。'
    : Object.entries(skill.parametersSchema.properties)
        .map(([parameterName, property]) => {
          const required = skill.parametersSchema?.required.includes(parameterName)
            ? '必填'
            : '可选';
          const range =
            property.minimum !== undefined && property.maximum !== undefined
              ? `，范围 ${property.minimum}-${property.maximum}`
              : '';

          return `- \`${parameterName}\`（${required} / ${property.type}${range}）：${property.description}`;
        })
        .join('\n');

  return `---
name: ${skill.name}
description: ${skill.description}
---

# ${skill.name}

- source: system
- runtimeStatus: ${skill.runtimeStatus}
- lifecycleStatus: ${skill.lifecycleStatus}
- handler: ${skill.handler ?? 'N/A'}

## Parameters

${parameterSection}
`;
};

const createBuiltinSkill = (skill: {
  id: string;
  name: string;
  description: string;
  type: SkillDetailResponse['type'];
  handler: SkillDetailResponse['handler'];
  parametersSchema: SkillParametersSchema;
  runtimeStatus: SkillDetailResponse['runtimeStatus'];
}): SkillDetailResponse => {
  const skillMarkdown = createBuiltinSkillMarkdown({
    name: skill.name,
    description: skill.description,
    handler: skill.handler,
    runtimeStatus: skill.runtimeStatus,
    lifecycleStatus: 'published',
    parametersSchema: skill.parametersSchema,
  });

  return {
    id: skill.id,
    slug: skill.id,
    name: skill.name,
    description: skill.description,
    type: skill.type,
    source: 'system',
    origin: null,
    handler: skill.handler,
    parametersSchema: skill.parametersSchema,
    runtimeStatus: skill.runtimeStatus,
    lifecycleStatus: 'published',
    bindable: true,
    markdownExcerpt: skill.description,
    bundleFileCount: 1,
    importProvenance: null,
    skillMarkdown,
    bundleFiles: [
      {
        path: 'SKILL.md',
        size: Buffer.byteLength(skillMarkdown),
      },
    ],
    createdBy: 'system',
    createdAt: BUILTIN_SKILL_TIMESTAMP,
    updatedAt: BUILTIN_SKILL_TIMESTAMP,
    publishedAt: BUILTIN_SKILL_TIMESTAMP,
  };
};

const BUILTIN_SKILLS: readonly SkillDetailResponse[] = [
  createBuiltinSkill({
    id: 'search_codebase',
    name: '搜索代码库',
    description: '按关键词或路径范围搜索当前仓库中的代码与配置片段。',
    type: 'repository_search',
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
    runtimeStatus: 'contract_only',
  }),
  createBuiltinSkill({
    id: 'check_git_log',
    name: '检查 Git 历史',
    description: '查询提交历史、提交人和时间窗口，用于辅助回溯变更上下文。',
    type: 'repository_inspection',
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
    runtimeStatus: 'contract_only',
  }),
  createBuiltinSkill({
    id: 'search_documents',
    name: '搜索知识文档',
    description: '复用服务端统一知识检索能力查询全局知识库文档，不直连底层 Chroma。',
    type: 'knowledge_search',
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
    runtimeStatus: 'available',
  }),
] as const;

const toSkillSummary = (
  skill: SkillDetailResponse,
): SkillSummaryResponse => {
  const { skillMarkdown: _skillMarkdown, bundleFiles: _bundleFiles, ...summary } = skill;
  return structuredClone(summary);
};

export const listRegisteredSkills = (): SkillSummaryResponse[] => {
  return Array.from(BUILTIN_SKILLS, (skill) => toSkillSummary(skill));
};

export const findRegisteredSkillById = (skillId: string): SkillDetailResponse | null => {
  const skill = BUILTIN_SKILLS.find((item) => item.id === skillId);
  return skill ? structuredClone(skill) : null;
};
