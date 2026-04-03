import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import { buildSkillMarkdownFromDefinition } from './skills.definition.js';
import type { SkillDefinitionFields } from './skills.definition.js';
import { createSkillAuthoringLlmService } from './services/skills-authoring-llm.service.js';
import {
  createNormalizedAuthoringTurnInput,
  runSkillAuthoringTurn,
  type SkillAuthoringLlmService,
} from './services/skills-authoring.service.js';
import type { SkillDetailResponse } from './skills.types.js';
import type { SkillDocument } from './skills.types.js';
import type { SkillsRepository } from './skills.repository.js';
import { createSkillsService } from './skills.service.js';

const ACTOR = {
  id: 'user-1',
  username: 'langya',
};

const buildSkillDefinition = (
  overrides: Partial<SkillDetailResponse['definition']> = {},
) : SkillDefinitionFields => {
  return {
    goal: '把方案补成可执行设计',
    triggerScenarios: ['文档只有目标没有步骤'],
    requiredContext: ['目标说明', '现有架构事实'],
    workflow: ['阅读上下文', '拆出模块边界', '补齐验证方式'],
    outputContract: ['完整方案草案', '模块拆分', '验证方式'],
    guardrails: ['不臆造新的基础设施'],
    artifacts: ['设计草案'],
    projectBindingNotes: ['优先复用当前目录结构'],
    followupQuestionsStrategy: 'optional',
    ...overrides,
  };
};

const createStoredSkillDocument = ({
  id = new ObjectId(),
  name,
  description,
  source = 'team',
  origin = 'manual',
  status = 'draft',
  category = 'documentation_architecture',
  createdBy = ACTOR.id,
  owner = ACTOR.username,
  definition = buildSkillDefinition(),
}: {
  id?: ObjectId;
  name: string;
  description: string;
  source?: SkillDocument['source'];
  origin?: SkillDocument['origin'];
  status?: NonNullable<SkillDocument['status']>;
  category?: string;
  createdBy?: string;
  owner?: string;
  definition?: ReturnType<typeof buildSkillDefinition>;
}): SkillDocument & { _id: NonNullable<SkillDocument['_id']> } => {
  const skillMarkdown = buildSkillMarkdownFromDefinition({
    name,
    description,
    definition,
  });
  const now = new Date('2026-03-14T08:00:00.000Z');
  const lifecycleStatus = status === 'active' ? 'published' : 'draft';

  return {
    _id: id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description,
    type: 'markdown_bundle',
    source,
    origin,
    handler: null,
    parametersSchema: null,
    runtimeStatus: 'contract_only',
    category,
    status,
    owner,
    definition,
    statusChangedAt: now,
    lifecycleStatus,
    skillMarkdown,
    markdownExcerpt: 'Goal 把方案补成可执行设计 Trigger Scenarios 文档只有目标没有步骤',
    storagePath: id.toHexString(),
    bundleFiles: [
      {
        path: 'SKILL.md',
        size: Buffer.byteLength(skillMarkdown),
      },
    ],
    importProvenance: null,
    createdBy,
    publishedAt:
      status === 'active'
        ? new Date('2026-03-14T09:00:00.000Z')
        : null,
    createdAt: now,
    updatedAt: now,
  };
};

const createRepositoryStub = (
  initialSkills: Array<SkillDocument & { _id: NonNullable<SkillDocument['_id']> }> = [],
): SkillsRepository => {
  const items = [...initialSkills];

  return {
    listSkills: async (filters?: {
      source?: SkillDocument['source'];
      lifecycleStatus?: SkillDocument['lifecycleStatus'];
    }) => {
      return items.filter((item) => {
        if (filters?.source && item.source !== filters.source) {
          return false;
        }

        if (filters?.lifecycleStatus && item.lifecycleStatus !== filters.lifecycleStatus) {
          return false;
        }

        return true;
      });
    },
    findSkillById: async (skillId: string) => {
      return items.find((item) => item._id.toHexString() === skillId) ?? null;
    },
    findSkillsByIds: async (skillIds: string[]) => {
      return items.filter((item) => skillIds.includes(item._id.toHexString()));
    },
    findSkillBySlug: async (slug: string) => {
      return items.find((item) => item.slug === slug) ?? null;
    },
    createSkill: async (
      document: SkillDocument & { _id: NonNullable<SkillDocument['_id']> },
    ) => {
      items.push(document);
      return document;
    },
    updateSkill: async (
      skillId: string,
      patch: Partial<SkillDocument>,
    ) => {
      const index = items.findIndex((item) => item._id.toHexString() === skillId);

      if (index < 0) {
        return null;
      }

      const nextItem = {
        ...items[index],
        ...patch,
        _id: items[index]!._id,
      };

      items[index] = nextItem;
      return nextItem;
    },
    deleteSkill: async (skillId: string) => {
      const index = items.findIndex((item) => item._id.toHexString() === skillId);

      if (index < 0) {
        return false;
      }

      items.splice(index, 1);
      return true;
    },
    findSkillBySlugSync: (slug: string) => items.find((item) => item.slug === slug) ?? null,
  } as unknown as SkillsRepository;
};

const createUsageLookupStub = (
  countsBySkillId: Record<
    string,
    {
      projectCount?: number;
      agentCount?: number;
    }
  > = {},
) => {
  return {
    countManagedSkillReferences: async (skillId: string) => {
      const counts = countsBySkillId[skillId];

      return {
        projectCount: counts?.projectCount ?? 0,
        agentCount: counts?.agentCount ?? 0,
      };
    },
  };
};

const createEnv = async (): Promise<AppEnv & { skillsRoot: string }> => {
  const skillsRoot = await mkdtemp(join(tmpdir(), 'knowject-skills-'));

  return {
    workspaceRoot: '',
    packageRoot: '',
    nodeEnv: 'test',
    appName: 'api-test',
    port: 0,
    logLevel: 'silent',
    corsOrigin: '*',
    mongo: {
      uri: 'mongodb://localhost:27017/knowject-test',
      dbName: 'knowject-test',
      host: 'localhost:27017',
    },
    chroma: {
      url: null,
      host: null,
      heartbeatPath: '/api/v2/heartbeat',
      tenant: 'default_tenant',
      database: 'default_database',
      requestTimeoutMs: 15000,
    },
    knowledge: {
      storageRoot: join(skillsRoot, '../knowledge'),
      indexerUrl: 'http://127.0.0.1:8001',
      indexerRequestTimeoutMs: 15000,
    },
    skills: {
      storageRoot: skillsRoot,
    },
    openai: {
      apiKey: null,
      baseUrl: 'https://api.openai.com/v1',
      embeddingModel: 'text-embedding-3-small',
      requestTimeoutMs: 15000,
    },
    settings: {
      encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
    jwt: {
      secret: 'secret',
      expiresIn: '1h',
      issuer: 'issuer',
      audience: 'audience',
    },
    argon2: {
      memoryCost: 1,
      timeCost: 1,
      parallelism: 1,
    },
    apiErrors: {
      exposeDetails: false,
      includeStack: false,
    },
    skillsRoot,
  };
};

const createTestSkillsService = ({
  env,
  repository,
  authoringLlm = createAuthoringLlmStub(),
  usageLookup = createUsageLookupStub(),
}: {
  env: AppEnv;
  repository: SkillsRepository;
  authoringLlm?: SkillAuthoringLlmService;
  usageLookup?: ReturnType<typeof createUsageLookupStub>;
}) => {
  return createSkillsService({
    env,
    repository,
    authoringLlm,
    usageLookup,
  });
};

const createAuthoringLlmStub = (): SkillAuthoringLlmService => {
  return {
    generateTurn: async ({ session }) => {
      if (session.questionCount >= 5 && session.messages.length >= 10) {
        return {
          assistantMessage: '信息已经足够，我先整理成结构化草稿供你确认。',
          nextQuestion: '请确认是否直接填充当前 Skill 草稿。',
          options: [
            {
              id: 'a',
              label: '确认草稿',
              rationale: '当前约束已经基本稳定',
              recommended: true,
            },
          ],
          structuredDraft: {
            name: 'Execution Alignment Skill',
            description: '把对话中收敛出的执行约束整理成 Skill 草稿。',
            definition: {
              ...buildSkillDefinition(),
              followupQuestionsStrategy: 'required',
              workflow: ['梳理目标', '确认边界', '输出结构化草稿'],
            },
          },
        };
      }

      if (session.questionCount >= 5) {
        return {
          assistantMessage: '我先整理当前信息，马上进入结构化草稿阶段。',
          nextQuestion: '请稍候确认归纳结果。',
          options: [
            {
              id: 'a',
              label: '继续补充',
              rationale: '该轮仅用于验证非决策轮会剥离选项',
              recommended: true,
            },
          ],
          structuredDraft: null,
        };
      }

      return {
        assistantMessage: '我先继续确认这个 Skill 的适用范围和场景。',
        nextQuestion: '请在范围或场景上再收敛一步。',
        options: [
          {
            id: 'a',
            label: '聚焦当前模块',
            rationale: '先把范围收窄到当前变更热点',
            recommended: true,
          },
        ],
        structuredDraft: null,
      };
    },
  };
};

const assertDecisionRoundOptions = (options: unknown): void => {
  assert.ok(Array.isArray(options));
  assert.ok(options.length > 0);

  let recommendedCount = 0;
  for (const option of options) {
    assert.equal(typeof option, 'object');
    assert.notEqual(option, null);
    assert.equal(typeof (option as { id?: unknown }).id, 'string');
    assert.ok(((option as { id?: string }).id ?? '').trim().length > 0);
    assert.equal(typeof (option as { label?: unknown }).label, 'string');
    assert.ok(((option as { label?: string }).label ?? '').trim().length > 0);
    assert.equal(typeof (option as { rationale?: unknown }).rationale, 'string');
    assert.ok(
      ((option as { rationale?: string }).rationale ?? '').trim().length > 0,
    );
    assert.equal(
      typeof (option as { recommended?: unknown }).recommended,
      'boolean',
    );
    if ((option as { recommended: boolean }).recommended) {
      recommendedCount += 1;
    }
  }

  assert.ok(recommendedCount > 0);
};

test('listSkills returns preset and team method assets', async () => {
  const env = await createEnv();
  const presetSkill = {
    ...createStoredSkillDocument({
      name: 'Preset Review Flow',
      description: 'Preset method asset',
      status: 'active',
    }),
    source: 'preset' as unknown as SkillDocument['source'],
    status: 'active' as const,
    definition: buildSkillDefinition(),
  } as SkillDocument & {
    _id: NonNullable<SkillDocument['_id']>;
    status: 'draft' | 'active' | 'deprecated' | 'archived';
    definition: ReturnType<typeof buildSkillDefinition>;
  };
  const teamSkill = {
    ...createStoredSkillDocument({
      name: 'Team Review Flow',
      description: 'Team method asset',
    }),
    source: 'team' as unknown as SkillDocument['source'],
    status: 'draft' as const,
    definition: buildSkillDefinition(),
    owner: ACTOR.username,
    category: 'team-method',
  } as SkillDocument & {
    _id: NonNullable<SkillDocument['_id']>;
    status: 'draft' | 'active' | 'deprecated' | 'archived';
    definition: ReturnType<typeof buildSkillDefinition>;
    owner: string;
    category: string;
  };
  const repository = createRepositoryStub([presetSkill, teamSkill]);
  const service = createTestSkillsService({ env, repository });

  try {
    const list = await service.listSkills({ actor: ACTOR });
    const items = list.items as Array<{
      source?: string;
      status?: string;
      definition?: { goal?: string };
    }>;
    const presetItem = items.find((item) => item.source === 'preset');
    const teamItem = items.find((item) => item.source === 'team');

    const boundaries = list.meta.boundaries as Record<string, string>;

    assert.equal(list.meta.registry, 'preset+team');
    assert.equal(boundaries.authoring, 'structured-method-asset');
    assert.equal(boundaries.source, 'team-created-only');
    assert.equal(boundaries.binding, 'project-first');
    assert.equal(
      boundaries.runtime,
      'manual-or-recommended-in-conversation',
    );
    assert.ok(presetItem);
    assert.ok(teamItem);
    assert.equal(presetItem?.source, 'preset');
    assert.equal(presetItem?.status, 'active');
    assert.ok(presetItem?.definition?.goal);
    assert.equal(teamItem?.source, 'team');
    assert.equal(teamItem?.status, 'draft');
    assert.ok(teamItem?.definition?.goal);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('listSkills includes legacy managed sources under the normalized team read model', async () => {
  const env = await createEnv();
  const legacyCustomSkill = createStoredSkillDocument({
    name: 'Legacy Custom Skill',
    description: 'Legacy custom managed skill',
    source: 'custom',
  });
  const legacyImportedSkill = createStoredSkillDocument({
    name: 'Legacy Imported Skill',
    description: 'Legacy imported managed skill',
    source: 'imported',
  });
  const repository = createRepositoryStub([legacyCustomSkill, legacyImportedSkill]);
  const service = createTestSkillsService({ env, repository });

  try {
    const list = await service.listSkills(
      { actor: ACTOR },
      { source: 'team' },
    );
    const itemNames = list.items.map((item) => item.name);

    assert.deepEqual(itemNames, ['Legacy Custom Skill', 'Legacy Imported Skill']);
    assert.deepEqual(
      list.items.map((item) => item.source),
      ['team', 'team'],
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('createSkill persists a draft team method asset and derives markdown', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub();
  const service = createTestSkillsService({ env, repository });

  try {
    const result = await service.createSkill(
      { actor: ACTOR },
      {
        name: '架构评审模板',
        description: '用于补齐边界、约束和验收标准。',
        category: 'documentation_architecture',
        owner: '架构组',
        definition: buildSkillDefinition(),
      },
    );

    const savedFilePath = join(
      env.skills.storageRoot,
      result.skill.id,
      'SKILL.md',
    );
    const skill = result.skill as {
      source?: string;
      status?: string;
      owner?: string;
      category?: string;
      skillMarkdown?: string;
    };

    assert.equal(skill.source, 'team');
    assert.equal(skill.status, 'draft');
    assert.equal(skill.owner, '架构组');
    assert.equal(skill.category, 'documentation_architecture');
    assert.match(skill.skillMarkdown ?? '', /## Goal/);
    assert.equal(result.skill.bindable, false);
    assert.equal(result.skill.bundleFiles.length, 1);
    assert.equal(existsSync(savedFilePath), true);
    assert.match(readFileSync(savedFilePath, 'utf8'), /## Goal/);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('updateSkill can rewrite metadata and activate a managed skill', async () => {
  const env = await createEnv();
  const existingSkill = createStoredSkillDocument({
    name: '需求梳理草稿',
    description: '旧描述',
  });
  const repository = createRepositoryStub([existingSkill]);
  const service = createTestSkillsService({ env, repository });

  try {
    await rm(join(env.skills.storageRoot, existingSkill.storagePath), {
      recursive: true,
      force: true,
    });

    const result = await service.updateSkill(
      { actor: ACTOR },
      existingSkill._id.toHexString(),
      {
        name: '需求梳理模板',
        description: '聚焦目标、边界和验收标准。',
        status: 'active',
        owner: '产品架构组',
        category: 'engineering_execution',
        definition: buildSkillDefinition({
          goal: '先把约束和验收标准补齐再进入编码',
        }),
      },
    );

    assert.equal(result.skill.name, '需求梳理模板');
    assert.equal(result.skill.description, '聚焦目标、边界和验收标准。');
    assert.equal(result.skill.status, 'active');
    assert.equal(result.skill.lifecycleStatus, 'published');
    assert.equal(result.skill.owner, '产品架构组');
    assert.equal(result.skill.category, 'engineering_execution');
    assert.ok(result.skill.definition);
    assert.equal(
      result.skill.definition?.goal,
      '先把约束和验收标准补齐再进入编码',
    );
    assert.equal(result.skill.bindable, true);
    assert.equal(result.skill.publishedAt !== null, true);
    assert.match(
      result.skill.skillMarkdown,
      /description: 聚焦目标、边界和验收标准。/,
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('updateSkill rejects deprecating an in-use active skill', async () => {
  const env = await createEnv();
  const existingSkill = createStoredSkillDocument({
    name: '已发布技能',
    description: '被项目和智能体引用',
    status: 'active',
  });
  const repository = createRepositoryStub([existingSkill]);
  const service = createTestSkillsService({
    env,
    repository,
    usageLookup: createUsageLookupStub({
      [existingSkill._id.toHexString()]: {
        projectCount: 2,
        agentCount: 1,
      },
    }),
  });

  try {
    await assert.rejects(
      () =>
        service.updateSkill(
          { actor: ACTOR },
          existingSkill._id.toHexString(),
          {
            status: 'deprecated',
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'SKILL_IN_USE');
        assert.match(error.message, /废弃/);
        return true;
      },
    );

    const persistedSkill = await repository.findSkillById(existingSkill._id.toHexString());
    assert.equal(persistedSkill?.status, 'active');
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('updateSkill rejects empty provided metadata fields', async () => {
  const env = await createEnv();
  const existingSkill = createStoredSkillDocument({
    name: '元数据校验',
    description: '用于校验 patch 字段',
  });
  const repository = createRepositoryStub([existingSkill]);
  const service = createTestSkillsService({ env, repository });

  try {
    for (const [fieldName, patch] of [
      ['name', { name: '   ' }],
      ['description', { description: '   ' }],
      ['owner', { owner: '   ' }],
    ] as const) {
      await assert.rejects(
        () =>
          service.updateSkill(
            { actor: ACTOR },
            existingSkill._id.toHexString(),
            patch,
          ),
        (error: unknown) => {
          assert.ok(error instanceof AppError);
          assert.equal(error.code, 'VALIDATION_ERROR');
          assert.equal(error.messageKey, 'validation.required.field');
          const fields = (error.details as { fields?: Record<string, string> } | null)
            ?.fields;
          assert.equal(fields?.[fieldName], `${fieldName} 为必填项`);
          return true;
        },
      );
    }
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('updateSkill keeps legacy active statusChangedAt stable on ordinary updates', async () => {
  const env = await createEnv();
  const publishedAt = new Date('2026-03-15T09:30:00.000Z');
  const existingSkill = {
    ...createStoredSkillDocument({
      name: 'Legacy Published Skill',
      description: 'legacy active skill',
      source: 'custom',
      status: undefined as unknown as NonNullable<SkillDocument['status']>,
    }),
    source: 'custom' as SkillDocument['source'],
    status: undefined,
    statusChangedAt: null,
    lifecycleStatus: 'published' as const,
    publishedAt,
    updatedAt: new Date('2026-03-20T08:00:00.000Z'),
  } as SkillDocument & { _id: NonNullable<SkillDocument['_id']> };
  const repository = createRepositoryStub([existingSkill]);
  const service = createTestSkillsService({ env, repository });

  try {
    const result = await service.updateSkill(
      { actor: ACTOR },
      existingSkill._id.toHexString(),
      {
        description: 'legacy active skill updated',
      },
    );

    assert.equal(result.skill.status, 'active');
    assert.equal(result.skill.source, 'team');
    assert.equal(result.skill.statusChangedAt, publishedAt.toISOString());

    const persistedSkill = await repository.findSkillById(existingSkill._id.toHexString());
    assert.equal(persistedSkill?.source, 'team');
    assert.equal(persistedSkill?.statusChangedAt?.toISOString(), publishedAt.toISOString());
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('updateSkill preserves legacy markdown body when definition is not stored', async () => {
  const env = await createEnv();
  const legacySkillMarkdown = `---
name: Legacy Imported Skill
description: Legacy imported managed skill
---

# Legacy Imported Skill

## Existing Workflow

- Keep this legacy body
- Do not rewrite it into generated sections
`;
  const existingSkill = {
    ...createStoredSkillDocument({
      name: 'Legacy Imported Skill',
      description: 'Legacy imported managed skill',
      source: 'imported',
      status: undefined as unknown as NonNullable<SkillDocument['status']>,
    }),
    source: 'imported' as SkillDocument['source'],
    status: undefined,
    category: undefined,
    owner: undefined,
    definition: undefined,
    skillMarkdown: legacySkillMarkdown,
    markdownExcerpt: 'Legacy imported managed skill',
    bundleFiles: [
      {
        path: 'SKILL.md',
        size: Buffer.byteLength(legacySkillMarkdown),
      },
    ],
  } as SkillDocument & { _id: NonNullable<SkillDocument['_id']> };
  const repository = createRepositoryStub([existingSkill]);
  const service = createTestSkillsService({ env, repository });

  try {
    const result = await service.updateSkill(
      { actor: ACTOR },
      existingSkill._id.toHexString(),
      {
        description: 'Updated legacy imported managed skill',
        status: 'active',
      },
    );

    assert.match(
      result.skill.skillMarkdown,
      /## Existing Workflow[\s\S]*Keep this legacy body/u,
    );
    assert.match(
      result.skill.skillMarkdown,
      /description: Updated legacy imported managed skill/u,
    );
    assert.doesNotMatch(result.skill.skillMarkdown, /## Goal/u);

    const persistedSkill = await repository.findSkillById(existingSkill._id.toHexString());
    assert.equal(persistedSkill?.definition, undefined);
    assert.match(
      persistedSkill?.skillMarkdown ?? '',
      /## Existing Workflow[\s\S]*Do not rewrite it into generated sections/u,
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('deleteSkill removes managed bundle files from disk', async () => {
  const env = await createEnv();
  const existingSkill = createStoredSkillDocument({
    name: '待删除技能',
    description: 'Delete me',
  });
  const repository = createRepositoryStub([existingSkill]);
  const service = createTestSkillsService({ env, repository });
  const skillDirectory = join(env.skills.storageRoot, existingSkill.storagePath);

  try {
    await mkdir(skillDirectory, { recursive: true });
    await writeFile(join(skillDirectory, 'SKILL.md'), existingSkill.skillMarkdown);
    await service.deleteSkill({ actor: ACTOR }, existingSkill._id.toHexString());
    assert.equal(existsSync(skillDirectory), false);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('deleteSkill rejects removing a managed skill that is still bound', async () => {
  const env = await createEnv();
  const existingSkill = createStoredSkillDocument({
    name: '绑定中的技能',
    description: '仍被项目使用',
    status: 'active',
  });
  const repository = createRepositoryStub([existingSkill]);
  const service = createTestSkillsService({
    env,
    repository,
    usageLookup: createUsageLookupStub({
      [existingSkill._id.toHexString()]: {
        projectCount: 1,
      },
    }),
  });
  const skillDirectory = join(env.skills.storageRoot, existingSkill.storagePath);

  try {
    await mkdir(skillDirectory, { recursive: true });
    await writeFile(join(skillDirectory, 'SKILL.md'), existingSkill.skillMarkdown);

    await assert.rejects(
      () => service.deleteSkill({ actor: ACTOR }, existingSkill._id.toHexString()),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'SKILL_IN_USE');
        assert.match(error.message, /删除/);
        return true;
      },
    );

    assert.equal(existsSync(skillDirectory), true);
    assert.notEqual(await repository.findSkillById(existingSkill._id.toHexString()), null);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('createSkill rejects invalid structured payloads and duplicate slugs', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub([
    createStoredSkillDocument({
      name: 'Existing Skill',
      description: 'Existing skill description',
      status: 'active',
    }),
  ]);
  const service = createTestSkillsService({ env, repository });

  try {
    await assert.rejects(
      () =>
        service.createSkill(
          { actor: ACTOR },
          {
            category: 'documentation_architecture',
            owner: '架构组',
            definition: {
              ...buildSkillDefinition(),
              workflow: [],
            },
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'VALIDATION_ERROR');
        return true;
      },
    );

    await assert.rejects(
      () =>
        service.createSkill(
          { actor: ACTOR },
          {
            name: 'Existing Skill',
            description: 'Trying to reuse the same slug',
            category: 'documentation_architecture',
            owner: '架构组',
            definition: buildSkillDefinition(),
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'SKILL_SLUG_CONFLICT');
        return true;
      },
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('runAuthoringTurn returns decision-round interviewing payload for scope/scenario alignment', async () => {
  const env = await createEnv();
  const service = createTestSkillsService({
    env,
    repository: createRepositoryStub(),
  });

  try {
    const result = await service.runAuthoringTurn(
      { actor: ACTOR },
      {
        scope: {
          scenario: 'engineering_execution',
          targets: ['apps/platform/src/pages/skills'],
        },
        messages: [
          {
            role: 'assistant',
            content: '请先概述这个 Skill 想解决什么问题。',
          },
          {
            role: 'user',
            content: '帮助团队产出更贴合项目的 Skill。',
          },
        ],
        questionCount: 1,
        currentSummary: '目标是让 Skill 更贴合项目。',
      },
    );

    assert.equal(result.stage, 'interviewing');
    assert.notEqual(result.stage, 'synthesizing');
    assert.ok(result.assistantMessage.trim().length > 0);
    assert.match(result.nextQuestion, /范围|场景/u);
    assertDecisionRoundOptions(result.options);
    assert.equal(result.questionCount, 2);
    assert.ok(result.currentSummary.trim().length > 0);
    assert.equal(result.structuredDraft, null);
    assert.equal(result.readyForConfirmation, false);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('runAuthoringTurn rejects an empty scope target list', async () => {
  const env = await createEnv();
  const service = createTestSkillsService({
    env,
    repository: createRepositoryStub(),
  });

  try {
    await assert.rejects(
      () =>
        service.runAuthoringTurn(
          { actor: ACTOR },
          {
            scope: {
              scenario: 'engineering_execution',
              targets: [],
            },
            messages: [],
            questionCount: 0,
            currentSummary: '',
          },
        ),
      /scope\.targets/,
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('runAuthoringTurn rejects arbitrary repo-relative paths outside the controlled target set', async () => {
  const env = await createEnv();
  const service = createTestSkillsService({
    env,
    repository: createRepositoryStub(),
  });

  try {
    await assert.rejects(
      () =>
        service.runAuthoringTurn(
          { actor: ACTOR },
          {
            scope: {
              scenario: 'engineering_execution',
              targets: ['foo/bar'],
            },
            messages: [],
            questionCount: 0,
            currentSummary: '',
          },
        ),
      /scope\.targets/,
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('runAuthoringTurn strips options for non-decision turns even if the model returns them', async () => {
  const result = await runSkillAuthoringTurn({
    actor: ACTOR,
    input: createNormalizedAuthoringTurnInput({ questionCount: 2 }),
    llm: {
      generateTurn: async () => ({
        assistantMessage: '我先总结已知约束，再进入下一轮。',
        nextQuestion: '请确认是否还有遗漏约束。',
        options: [
          {
            id: 'a',
            label: '保留现状',
            rationale: '这只是模型误带的选项',
            recommended: true,
          },
        ],
        structuredDraft: null,
      }),
    },
  });

  assert.deepEqual(result.options, []);
});

test('runAuthoringTurn returns from awaiting_confirmation to interviewing when the user keeps refining', async () => {
  const result = await runSkillAuthoringTurn({
    actor: ACTOR,
    input: createNormalizedAuthoringTurnInput({
      questionCount: 5,
      currentSummary: '已经有一版草稿，但用户还想补充边界。',
      currentStructuredDraft: {
        name: 'Execution Alignment Skill',
        description: '第一版草稿。',
        category: 'engineering_execution',
        owner: ACTOR.username,
        definition: {
          ...buildSkillDefinition(),
          followupQuestionsStrategy: 'required',
        },
      },
      messages: [
        {
          role: 'assistant',
          content: '这是当前草稿，请确认是否直接填充。',
        },
        {
          role: 'user',
          content: '先不要填充，我还想补充跨模块约束。',
        },
      ],
    }),
    llm: {
      generateTurn: async () => ({
        assistantMessage: '收到，我继续追问跨模块约束。',
        nextQuestion: '这些约束主要落在哪些现有目录或文档？',
        options: [
          {
            id: 'a',
            label: '这里不该保留选项',
            rationale: 'refinement 回到 interviewing 后应剥离非决策轮选项',
            recommended: true,
          },
        ],
        structuredDraft: null,
      }),
    },
  });

  assert.equal(result.stage, 'interviewing');
  assert.equal(result.readyForConfirmation, false);
  assert.equal(result.structuredDraft, null);
  assert.equal(result.questionCount, 6);
  assert.deepEqual(result.options, []);
});

test('createSkillAuthoringLlmService degrades invalid model structured draft definitions instead of throwing validation errors', async () => {
  const env = await createEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                assistantMessage: '我先整理一版草稿。',
                nextQuestion: '请确认是否继续补充。',
                options: [],
                structuredDraft: {
                  name: 'Execution Alignment Skill',
                  description: '模型给出了一版不完整草稿。',
                  definition: {
                    workflow: ['只返回了 workflow'],
                  },
                },
              }),
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    )) as typeof fetch;

  const llm = createSkillAuthoringLlmService({
    env: {
      ...env,
      openai: {
        ...env.openai,
        apiKey: 'test-api-key',
      },
    },
    settingsRepository: {
      getSettings: async () => null,
    } as never,
  });

  try {
    const result = await llm.generateTurn({
      actor: ACTOR,
      session: createNormalizedAuthoringTurnInput({
        questionCount: 5,
        messages: [
          {
            role: 'user',
            content: '请整理成草稿。',
          },
        ],
      }),
    });

    assert.equal(result.assistantMessage, '我先整理一版草稿。');
    assert.equal(result.nextQuestion, '请确认是否继续补充。');
    assert.deepEqual(result.options, []);
    assert.ok(result.structuredDraft);
    assert.equal(result.structuredDraft?.name, 'Execution Alignment Skill');
    assert.equal(result.structuredDraft?.definition, undefined);
  } catch (error: unknown) {
    assert.notEqual(error instanceof AppError && error.statusCode === 400, true);
    throw error;
  } finally {
    globalThis.fetch = originalFetch;
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('createSkillAuthoringLlmService raises provider timeout floor for slower authoring turns', async () => {
  const env = await createEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (_input, init) => {
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (init?.signal?.aborted) {
      throw new DOMException(
        'The operation was aborted due to timeout',
        'AbortError',
      );
    }

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                assistantMessage: '我先继续追问。',
                nextQuestion: '请补充输出要求。',
                options: [],
                structuredDraft: null,
              }),
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  const llm = createSkillAuthoringLlmService({
    env: {
      ...env,
      openai: {
        ...env.openai,
        apiKey: 'test-api-key',
        requestTimeoutMs: 5,
      },
    },
    settingsRepository: {
      getSettings: async () => null,
    } as never,
  });

  try {
    const result = await llm.generateTurn({
      actor: ACTOR,
      session: createNormalizedAuthoringTurnInput({
        questionCount: 1,
        messages: [
          {
            role: 'user',
            content: '请继续追问。',
          },
        ],
      }),
    });

    assert.equal(result.assistantMessage, '我先继续追问。');
    assert.equal(result.nextQuestion, '请补充输出要求。');
  } finally {
    globalThis.fetch = originalFetch;
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('createSkillAuthoringLlmService maps provider AbortError to project conversation timeout semantics', async () => {
  const env = await createEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    throw new DOMException(
      'The operation was aborted due to timeout',
      'AbortError',
    );
  }) as typeof fetch;

  const llm = createSkillAuthoringLlmService({
    env: {
      ...env,
      openai: {
        ...env.openai,
        apiKey: 'test-api-key',
      },
    },
    settingsRepository: {
      getSettings: async () => null,
    } as never,
  });

  try {
    await assert.rejects(
      () =>
        llm.generateTurn({
          actor: ACTOR,
          session: createNormalizedAuthoringTurnInput({
            questionCount: 1,
            messages: [
              {
                role: 'user',
                content: '请继续追问。',
              },
            ],
          }),
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR');
        assert.equal(error.messageKey, 'project.conversation.timeout');
        assert.deepEqual(error.details, {
          timeoutMs: 30000,
        });
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('createSkillAuthoringLlmService preserves caller-driven aborts for stream cancellation', async () => {
  const env = await createEnv();
  const originalFetch = globalThis.fetch;
  let observedSignal: AbortSignal | undefined;

  globalThis.fetch = (async (_input, init) => {
    observedSignal = init?.signal ?? undefined;

    return await new Promise<Response>((_resolve, reject) => {
      if (init?.signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      init?.signal?.addEventListener(
        'abort',
        () => {
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    });
  }) as typeof fetch;

  const llm = createSkillAuthoringLlmService({
    env: {
      ...env,
      openai: {
        ...env.openai,
        apiKey: 'test-api-key',
      },
    },
    settingsRepository: {
      getSettings: async () => null,
    } as never,
  });
  const abortController = new AbortController();

  try {
    const generation = llm.generateTurn({
      actor: ACTOR,
      session: createNormalizedAuthoringTurnInput({
        questionCount: 1,
        messages: [
          {
            role: 'user',
            content: '请继续追问。',
          },
        ],
      }),
      signal: abortController.signal,
    });

    abortController.abort();

    await assert.rejects(
      () => generation,
      (error: unknown) => {
        assert.ok(error instanceof DOMException);
        assert.equal(error.name, 'AbortError');
        assert.equal(observedSignal?.aborted, true);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('runAuthoringTurn forwards request abort signal to the authoring llm', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub();
  let capturedSignal: AbortSignal | undefined;
  const service = createTestSkillsService({
    env,
    repository,
    authoringLlm: {
      generateTurn: async ({ signal }) => {
        capturedSignal = signal;
        return {
          assistantMessage: '继续确认。',
          nextQuestion: '请补充输出要求。',
          options: [],
          structuredDraft: null,
        };
      },
    },
  });
  const abortController = new AbortController();

  try {
    await service.runAuthoringTurn(
      { actor: ACTOR },
      {
        scope: {
          scenario: 'engineering_execution',
          targets: ['apps/platform/src/pages/skills'],
        },
        messages: [
          {
            role: 'assistant',
            content: '先说说你想创建什么 Skill。',
          },
          {
            role: 'user',
            content: '我想让它先聚焦当前技能页。',
          },
        ],
        questionCount: 1,
        currentSummary: '',
        currentStructuredDraft: null,
      },
      {
        signal: abortController.signal,
      },
    );

    assert.equal(capturedSignal, abortController.signal);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('runAuthoringTurn exposes synthesizing as an independent stage contract (red)', async () => {
  const env = await createEnv();
  const service = createTestSkillsService({
    env,
    repository: createRepositoryStub(),
  });
  const messages = Array.from({ length: 8 }, (_, index) => {
    const round = index + 1;
    return [
      {
        role: 'assistant' as const,
        content: `第 ${round} 轮：请继续补充约束。`,
      },
      {
        role: 'user' as const,
        content: `第 ${round} 轮回答：补充约束。`,
      },
    ];
  }).flat();

  try {
    const result = await service.runAuthoringTurn(
      { actor: ACTOR },
      {
        scope: {
          scenario: 'engineering_execution',
          targets: ['apps/platform/src/pages/skills'],
        },
        messages,
        questionCount: 4,
        currentSummary: '目标和边界已经收敛，进入草案整合前的汇总阶段。',
      },
    );

    assert.equal(result.stage, 'synthesizing');
    assert.ok(result.assistantMessage.trim().length > 0);
    assert.equal(result.readyForConfirmation, false);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('runAuthoringTurn returns structured draft when the interview is ready to synthesize', async () => {
  const env = await createEnv();
  const service = createTestSkillsService({
    env,
    repository: createRepositoryStub(),
  });
  const messages = Array.from({ length: 10 }, (_, index) => {
    const round = index + 1;
    return [
      {
        role: 'assistant' as const,
        content: `第 ${round} 轮：请补充上下文。`,
      },
      {
        role: 'user' as const,
        content: `第 ${round} 轮回答：补充上下文。`,
      },
    ];
  }).flat();

  try {
    const result = await service.runAuthoringTurn(
      { actor: ACTOR },
      {
        scope: {
          scenario: 'engineering_execution',
          targets: [
            'docs/current/architecture.md',
            'apps/platform/src/pages/skills',
          ],
        },
        messages,
        questionCount: 5,
        currentSummary:
          'Skill 面向所有成员，但默认按不熟悉项目的人来引导。',
      },
    );

    assert.equal(result.stage, 'awaiting_confirmation');
    assert.notEqual(result.stage, 'synthesizing');
    assert.ok(result.assistantMessage.trim().length > 0);
    assert.ok(result.nextQuestion.trim().length > 0);
    assert.deepEqual(result.options, []);
    assert.equal(result.questionCount, 5);
    assert.ok(result.currentSummary.trim().length > 0);
    assert.ok(result.structuredDraft);
    assert.ok(result.structuredDraft?.name.trim().length);
    assert.ok(result.structuredDraft?.description.trim().length);
    assert.equal(result.structuredDraft?.category, 'engineering_execution');
    assert.ok(result.structuredDraft?.owner.trim().length);
    assert.equal(result.readyForConfirmation, true);
    assert.equal(
      result.structuredDraft?.definition.followupQuestionsStrategy,
      'required',
    );
    assert.ok((result.structuredDraft?.definition.workflow.length ?? 0) > 0);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('skills router wires authoring turns endpoint to the service', async () => {
  const routerSource = readFileSync(
    new URL('./skills.router.ts', import.meta.url),
    'utf8',
  );

  assert.match(routerSource, /skillsRouter\.post\('\/authoring\/turns'/u);
  assert.match(routerSource, /skillsService\.runAuthoringTurn/u);
  assert.match(routerSource, /skillsRouter\.post\(\s*'\/authoring\/turns\/stream'/u);
  assert.match(routerSource, /validateSkillAuthoringTurnInput/u);
  assert.match(routerSource, /text\/event-stream/u);
  assert.match(routerSource, /req\.on\('close', handleClientDisconnect\)/u);
  assert.match(routerSource, /type:\s*'ack'/u);
  assert.match(routerSource, /type:\s*'done'/u);
  assert.match(routerSource, /status:\s*normalizedError\.statusCode/u);
});

test('preset skills remain readable but immutable', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub();
  const service = createTestSkillsService({ env, repository });

  try {
    const detail = await service.getSkillDetail(
      { actor: ACTOR },
      'doc-gap-interrogation',
    );
    assert.equal(detail.skill.source, 'preset');
    assert.equal(detail.skill.status, 'active');
    assert.equal(detail.skill.owner, 'Knowject Core');

    await assert.rejects(
      () =>
        service.updateSkill({ actor: ACTOR }, 'doc-gap-interrogation', {
          status: 'archived',
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'SYSTEM_SKILL_READONLY');
        return true;
      },
    );

    await assert.rejects(
      () => service.deleteSkill({ actor: ACTOR }, 'doc-gap-interrogation'),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'SYSTEM_SKILL_READONLY');
        return true;
      },
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});
