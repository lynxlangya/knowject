import type { KnowledgeSourceType } from '@modules/knowledge/knowledge.types.js';
import {
  buildSkillMarkdownFromDefinition,
  type SkillDefinitionFields,
} from './skills.definition.js';
import type {
  SkillDetailResponse,
  SkillParametersSchema,
  SkillSummaryResponse,
} from './skills.types.js';

const DEFAULT_CODEBASE_LIMIT = 20;
const DEFAULT_GIT_LOG_LIMIT = 20;
const DEFAULT_TOP_K = 5;
const REGISTRY_OWNER = 'Knowject Core';
const PRESET_SKILL_TIMESTAMP = '2026-03-31T00:00:00.000Z';
const LEGACY_PRESET_TIMESTAMP = '2026-03-10T00:00:00.000Z';

const KNOWLEDGE_SOURCE_OPTIONS: readonly KnowledgeSourceType[] = [
  'global_docs',
  'global_code',
];

const createPresetSkill = ({
  id,
  name,
  description,
  category,
  owner,
  definition,
}: {
  id: string;
  name: string;
  description: string;
  category: NonNullable<SkillDetailResponse['category']>;
  owner: string;
  definition: SkillDefinitionFields;
}): SkillDetailResponse => {
  const skillMarkdown = buildSkillMarkdownFromDefinition({
    name,
    description,
    definition,
  });

  return {
    id,
    slug: id,
    name,
    description,
    type: 'markdown_bundle',
    source: 'preset',
    origin: null,
    handler: null,
    parametersSchema: null,
    runtimeStatus: 'contract_only',
    lifecycleStatus: 'published',
    category,
    status: 'active',
    owner,
    definition,
    statusChangedAt: PRESET_SKILL_TIMESTAMP,
    bindable: true,
    markdownExcerpt: description,
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
    createdAt: PRESET_SKILL_TIMESTAMP,
    updatedAt: PRESET_SKILL_TIMESTAMP,
    publishedAt: PRESET_SKILL_TIMESTAMP,
  };
};

const createLegacyPresetSkillMarkdown = (
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

const createLegacyPresetSkill = (skill: {
  id: string;
  name: string;
  description: string;
  type: SkillDetailResponse['type'];
  handler: SkillDetailResponse['handler'];
  parametersSchema: SkillParametersSchema;
  runtimeStatus: SkillDetailResponse['runtimeStatus'];
}): SkillDetailResponse => {
  const skillMarkdown = createLegacyPresetSkillMarkdown({
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
    source: 'preset',
    origin: null,
    handler: skill.handler,
    parametersSchema: skill.parametersSchema,
    runtimeStatus: skill.runtimeStatus,
    lifecycleStatus: 'published',
    status: 'active',
    owner: REGISTRY_OWNER,
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
    createdAt: LEGACY_PRESET_TIMESTAMP,
    updatedAt: LEGACY_PRESET_TIMESTAMP,
    publishedAt: LEGACY_PRESET_TIMESTAMP,
    statusChangedAt: LEGACY_PRESET_TIMESTAMP,
  };
};

const PRESET_SKILLS: readonly SkillDetailResponse[] = [
  createPresetSkill({
    id: 'doc-gap-interrogation',
    name: '文档反向追问',
    description: '找出文档里没说清、但后续一定会踩坑的问题。',
    category: 'documentation_architecture',
    owner: REGISTRY_OWNER,
    definition: {
      goal: '暴露文档中的缺失决策',
      triggerScenarios: ['需求文档边界模糊', '设计稿没有异常分支'],
      requiredContext: ['PRD', '架构文档', '历史决策'],
      workflow: ['阅读文档', '列出不清晰的问题', '附上建议补充内容'],
      outputContract: ['问题清单', '建议追问', '建议补充内容'],
      guardrails: ['不替用户直接拍板关键 tradeoff'],
      artifacts: ['补充问题清单'],
      projectBindingNotes: ['优先读取 docs/current/architecture.md'],
      followupQuestionsStrategy: 'required',
    },
  }),
  createPresetSkill({
    id: 'solution-expansion',
    name: '方案补全',
    description: '把只有目标或半成品的方案补成可执行设计。',
    category: 'documentation_architecture',
    owner: REGISTRY_OWNER,
    definition: {
      goal: '把半成品方案补到可执行',
      triggerScenarios: ['只有目标没有设计', '文档缺少数据流和验证方式'],
      requiredContext: ['目标说明', '现有架构', '相关模块事实'],
      workflow: ['阅读输入', '拆出模块边界', '补齐数据流和验证'],
      outputContract: ['完整方案草案', '模块拆分', '验证方式'],
      guardrails: ['不臆造基础设施'],
      artifacts: ['设计草案'],
      projectBindingNotes: ['优先复用现有目录与模块边界'],
      followupQuestionsStrategy: 'optional',
    },
  }),
  createPresetSkill({
    id: 'architecture-sketch',
    name: '架构草图生成',
    description: '把文档和系统关系转成易沟通的简化结构图。',
    category: 'documentation_architecture',
    owner: REGISTRY_OWNER,
    definition: {
      goal: '把系统关系转成可讨论的简化架构图',
      triggerScenarios: ['需要讲清模块边界', '需要解释调用链和数据流'],
      requiredContext: ['架构文档', '模块说明', '接口关系'],
      workflow: ['抽取核心模块', '整理调用链', '输出简化图和边界说明'],
      outputContract: ['简化架构图', '图例说明', '关键边界说明'],
      guardrails: ['必须区分当前事实和目标态蓝图'],
      artifacts: ['架构草图'],
      projectBindingNotes: ['优先引用 docs/current 下的实现事实'],
      followupQuestionsStrategy: 'optional',
    },
  }),
  createPresetSkill({
    id: 'requirement-ambiguity-review',
    name: '需求去歧义',
    description: '把看似完整、实则含糊的需求拆出缺口和风险。',
    category: 'documentation_architecture',
    owner: REGISTRY_OWNER,
    definition: {
      goal: '暴露需求中的歧义点和缺失决策位',
      triggerScenarios: ['准备开始设计前', '准备排期或进入实现前'],
      requiredContext: ['需求文档', '业务目标', '相关页面或接口背景'],
      workflow: ['阅读需求', '标记歧义点', '给出建议明确项'],
      outputContract: ['歧义点列表', '风险等级', '建议明确项'],
      guardrails: ['先暴露问题，不直接跳到实现细节'],
      artifacts: ['需求澄清清单'],
      projectBindingNotes: ['优先结合当前项目已有术语和业务边界'],
      followupQuestionsStrategy: 'required',
    },
  }),
  createPresetSkill({
    id: 'implementation-readiness-check',
    name: '实现前检查',
    description: '在编码前收紧事实、边界、改动面和最小验证集。',
    category: 'engineering_execution',
    owner: REGISTRY_OWNER,
    definition: {
      goal: '降低直接开写导致的返工和边界遗漏',
      triggerScenarios: ['准备实现功能', '准备修复 bug', '准备做局部重构'],
      requiredContext: ['任务目标', '相关代码', '相关文档', '测试基线'],
      workflow: ['确认当前事实', '列出改动文件', '整理风险与最小验证集'],
      outputContract: ['Current Facts', 'Files To Touch', 'Minimal Validation'],
      guardrails: ['不越过事实和文档直接拍板实现'],
      artifacts: ['实现前检查单'],
      projectBindingNotes: ['优先复用现有测试模式和目录结构'],
      followupQuestionsStrategy: 'optional',
    },
  }),
  createPresetSkill({
    id: 'decision-recording',
    name: '决策记录生成',
    description: '把讨论结果沉淀成团队可复用的正式决策记录。',
    category: 'governance_capture',
    owner: REGISTRY_OWNER,
    definition: {
      goal: '把讨论结论沉淀成可追溯的正式决策',
      triggerScenarios: ['方案定稿', 'tradeoff 已明确', '准备交接或归档'],
      requiredContext: ['讨论结论', '备选方案', '取舍依据', '影响范围'],
      workflow: ['整理结论', '补齐 alternatives', '写清取舍与迁移路径'],
      outputContract: ['Decision', 'Alternatives', 'Tradeoffs', 'Migration Path'],
      guardrails: ['不把未确认内容写成既定决策'],
      artifacts: ['ADR 草案'],
      projectBindingNotes: ['优先链接当前项目已有方案和 handoff 文档'],
      followupQuestionsStrategy: 'optional',
    },
  }),
] as const;

const LEGACY_PRESET_COMPAT_SKILLS: readonly SkillDetailResponse[] = [
  createLegacyPresetSkill({
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
  createLegacyPresetSkill({
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
  createLegacyPresetSkill({
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

const toSkillSummary = (skill: SkillDetailResponse): SkillSummaryResponse => {
  const { skillMarkdown: _skillMarkdown, bundleFiles: _bundleFiles, ...summary } = skill;
  return structuredClone(summary);
};

export const listRegisteredSkills = (): SkillSummaryResponse[] => {
  return Array.from(PRESET_SKILLS, (skill) => toSkillSummary(skill));
};

export const findRegisteredSkillById = (
  skillId: string,
): SkillDetailResponse | null => {
  const presetSkill =
    PRESET_SKILLS.find((item) => item.id === skillId) ??
    LEGACY_PRESET_COMPAT_SKILLS.find((item) => item.id === skillId);
  return presetSkill ? structuredClone(presetSkill) : null;
};
