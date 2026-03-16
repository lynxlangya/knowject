import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import type { SkillDocument } from './skills.types.js';
import type { SkillsRepository } from './skills.repository.js';
import { createSkillsService } from './skills.service.js';

const ACTOR = {
  id: 'user-1',
  username: 'langya',
};

const buildSkillMarkdown = (
  name: string,
  description: string,
  body = '# Overview\n\n- First step\n- Second step\n',
): string => {
  return `---
name: ${name}
description: ${description}
---

${body}`;
};

const createStoredSkillDocument = ({
  id = new ObjectId(),
  name,
  description,
  source = 'custom',
  origin = 'manual',
  lifecycleStatus = 'draft',
  createdBy = ACTOR.id,
}: {
  id?: ObjectId;
  name: string;
  description: string;
  source?: SkillDocument['source'];
  origin?: SkillDocument['origin'];
  lifecycleStatus?: SkillDocument['lifecycleStatus'];
  createdBy?: string;
}): SkillDocument & { _id: NonNullable<SkillDocument['_id']> } => {
  const skillMarkdown = buildSkillMarkdown(name, description);
  const now = new Date('2026-03-14T08:00:00.000Z');

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
    lifecycleStatus,
    skillMarkdown,
    markdownExcerpt: 'Overview First step Second step',
    storagePath: id.toHexString(),
    bundleFiles: [
      {
        path: 'SKILL.md',
        size: Buffer.byteLength(skillMarkdown),
      },
    ],
    importProvenance:
      source === 'imported'
        ? {
            repository: origin === 'github' ? 'openai/example-skills' : null,
            path: origin === 'github' ? 'skills/test-skill' : null,
            ref: origin === 'github' ? 'main' : null,
            sourceUrl: origin === 'url' ? 'https://example.com/test-skill/SKILL.md' : null,
            githubUrl:
              origin === 'github'
                ? 'https://github.com/openai/example-skills/tree/main/skills/test-skill'
                : null,
          }
        : null,
    createdBy,
    publishedAt:
      lifecycleStatus === 'published'
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

const withMockFetch = async (
  implementation: typeof globalThis.fetch,
  run: () => Promise<void>,
): Promise<void> => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = implementation;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const createTestSkillsService = ({
  env,
  repository,
  usageLookup = createUsageLookupStub(),
}: {
  env: AppEnv;
  repository: SkillsRepository;
  usageLookup?: ReturnType<typeof createUsageLookupStub>;
}) => {
  return createSkillsService({
    env,
    repository,
    usageLookup,
  });
};

test('listSkills merges builtin skills with managed skills and supports filters', async () => {
  const env = await createEnv();
  const publishedCustom = createStoredSkillDocument({
    name: 'Custom Review Flow',
    description: 'Published custom flow',
    lifecycleStatus: 'published',
  });
  const draftImported = createStoredSkillDocument({
    name: 'Imported Draft Flow',
    description: 'Draft imported flow',
    source: 'imported',
    origin: 'github',
    lifecycleStatus: 'draft',
  });
  const repository = createRepositoryStub([publishedCustom, draftImported]);
  const service = createTestSkillsService({ env, repository });

  try {
    const allSkills = await service.listSkills({ actor: ACTOR });
    const bindableSkills = await service.listSkills(
      { actor: ACTOR },
      { bindable: 'true' },
    );
    const draftSkills = await service.listSkills(
      { actor: ACTOR },
      { lifecycleStatus: 'draft' },
    );

    assert.equal(allSkills.total, 5);
    assert.deepEqual(
      allSkills.items.slice(0, 2).map((item) => item.name),
      ['Custom Review Flow', 'Imported Draft Flow'],
    );
    assert.equal(allSkills.meta.registry, 'hybrid');
    assert.equal(bindableSkills.items.some((item) => item.id === draftImported._id.toHexString()), false);
    assert.equal(
      bindableSkills.items.some((item) => item.id === publishedCustom._id.toHexString()),
      true,
    );
    assert.equal(
      draftSkills.items.some((item) => item.id === draftImported._id.toHexString()),
      true,
    );
    assert.equal(
      draftSkills.items.some((item) => item.id === 'search_documents'),
      false,
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('createSkill stores canonical SKILL.md as a draft managed asset', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub();
  const service = createTestSkillsService({ env, repository });

  try {
    const result = await service.createSkill(
      { actor: ACTOR },
      {
        skillMarkdown: buildSkillMarkdown(
          '团队复盘模板',
          '帮助团队沉淀复盘结论与行动项。',
          '# 团队复盘模板\n\n- 总结目标\n- 记录行动项\n',
        ),
      },
    );

    const savedFilePath = join(
      env.skills.storageRoot,
      result.skill.id,
      'SKILL.md',
    );

    assert.equal(result.skill.source, 'custom');
    assert.equal(result.skill.origin, 'manual');
    assert.equal(result.skill.lifecycleStatus, 'draft');
    assert.equal(result.skill.bindable, false);
    assert.equal(result.skill.bundleFiles.length, 1);
    assert.equal(existsSync(savedFilePath), true);
    assert.match(readFileSync(savedFilePath, 'utf8'), /name: 团队复盘模板/);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('importSkill supports raw markdown URL preview without persisting data', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub();
  const service = createTestSkillsService({ env, repository });

  try {
    await withMockFetch(
      async (input) => {
        assert.equal(String(input), 'https://example.com/skills/review/SKILL.md');

        return new Response(
          buildSkillMarkdown(
            'Review Remote Skill',
            'Imported from a raw markdown URL.',
          ),
          {
            status: 200,
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
          },
        );
      },
      async () => {
        const result = await service.importSkill(
          { actor: ACTOR },
          {
            mode: 'url',
            url: 'https://example.com/skills/review/SKILL.md',
            dryRun: true,
          },
        );

        assert.ok('preview' in result);
        if (!('preview' in result)) {
          throw new Error('expected import preview response');
        }

        assert.equal(result.preview.origin, 'url');
        assert.equal(result.preview.bindable, false);
        assert.equal(result.preview.bundleFiles[0]?.path, 'SKILL.md');
      },
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('importSkill imports GitHub bundles and preserves provenance', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub();
  const service = createTestSkillsService({ env, repository });

  try {
    await withMockFetch(
      async (input) => {
        const url = String(input);

        if (url === 'https://api.github.com/repos/openai/example-skills/contents/skills/review?ref=main') {
          return Response.json([
            {
              type: 'file',
              path: 'skills/review/SKILL.md',
              url,
              download_url:
                'https://raw.githubusercontent.com/openai/example-skills/main/skills/review/SKILL.md',
            },
            {
              type: 'file',
              path: 'skills/review/README.md',
              url,
              download_url:
                'https://raw.githubusercontent.com/openai/example-skills/main/skills/review/README.md',
            },
          ]);
        }

        if (
          url ===
          'https://raw.githubusercontent.com/openai/example-skills/main/skills/review/SKILL.md'
        ) {
          return new Response(
            buildSkillMarkdown(
              'GitHub Imported Skill',
              'Imported from a GitHub skill directory.',
            ),
            {
              status: 200,
              headers: {
                'content-type': 'text/plain; charset=utf-8',
              },
            },
          );
        }

        if (
          url ===
          'https://raw.githubusercontent.com/openai/example-skills/main/skills/review/README.md'
        ) {
          return new Response('# Notes\n', {
            status: 200,
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
          });
        }

        throw new Error(`unexpected fetch url: ${url}`);
      },
      async () => {
        const result = await service.importSkill(
          { actor: ACTOR },
          {
            mode: 'github',
            repository: 'openai/example-skills',
            path: 'skills/review',
            ref: 'main',
          },
        );

        assert.ok('skill' in result);
        if (!('skill' in result)) {
          throw new Error('expected persisted skill response');
        }

        assert.equal(result.skill.source, 'imported');
        assert.equal(result.skill.origin, 'github');
        assert.equal(result.skill.importProvenance?.repository, 'openai/example-skills');
        assert.deepEqual(
          result.skill.bundleFiles.map((item) => item.path),
          ['README.md', 'SKILL.md'],
        );
        assert.equal(
          existsSync(join(env.skills.storageRoot, result.skill.id, 'README.md')),
          true,
        );
      },
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('importSkill accepts repo-root GitHub SKILL.md URLs', async () => {
  const env = await createEnv();
  const rootContentsUrl =
    'https://api.github.com/repos/openai/example-skills/contents?ref=main';

  try {
    await withMockFetch(
      async (input) => {
        const url = String(input);

        if (url === rootContentsUrl) {
          return Response.json([
            {
              type: 'file',
              path: 'SKILL.md',
              url,
              download_url:
                'https://raw.githubusercontent.com/openai/example-skills/main/SKILL.md',
            },
            {
              type: 'file',
              path: 'README.md',
              url,
              download_url:
                'https://raw.githubusercontent.com/openai/example-skills/main/README.md',
            },
          ]);
        }

        if (
          url === 'https://raw.githubusercontent.com/openai/example-skills/main/SKILL.md'
        ) {
          return new Response(
            buildSkillMarkdown(
              'Root GitHub Skill',
              'Imported from repository root.',
            ),
            {
              status: 200,
              headers: {
                'content-type': 'text/plain; charset=utf-8',
              },
            },
          );
        }

        if (
          url === 'https://raw.githubusercontent.com/openai/example-skills/main/README.md'
        ) {
          return new Response('# Root notes\n', {
            status: 200,
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
          });
        }

        throw new Error(`unexpected fetch url: ${url}`);
      },
      async () => {
        for (const githubUrl of [
          'https://github.com/openai/example-skills/blob/main/SKILL.md',
          'https://raw.githubusercontent.com/openai/example-skills/main/SKILL.md',
        ]) {
          const service = createTestSkillsService({
            env,
            repository: createRepositoryStub(),
          });
          const result = await service.importSkill(
            { actor: ACTOR },
            {
              mode: 'github',
              githubUrl,
            },
          );

          assert.ok('skill' in result);
          if (!('skill' in result)) {
            throw new Error('expected persisted skill response');
          }

          assert.equal(result.skill.bundleFiles.some((item) => item.path === 'SKILL.md'), true);
        }
      },
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('updateSkill can rewrite metadata and publish a managed skill', async () => {
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
        lifecycleStatus: 'published',
      },
    );

    assert.equal(result.skill.name, '需求梳理模板');
    assert.equal(result.skill.description, '聚焦目标、边界和验收标准。');
    assert.equal(result.skill.lifecycleStatus, 'published');
    assert.equal(result.skill.bindable, true);
    assert.equal(result.skill.publishedAt !== null, true);
    assert.match(result.skill.skillMarkdown, /description: 聚焦目标、边界和验收标准。/);
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});

test('updateSkill rejects downgrading an in-use published skill back to draft', async () => {
  const env = await createEnv();
  const existingSkill = createStoredSkillDocument({
    name: '已发布技能',
    description: '被项目和智能体引用',
    lifecycleStatus: 'published',
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
            lifecycleStatus: 'draft',
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'SKILL_IN_USE');
        assert.match(error.message, /回退为草稿/);
        return true;
      },
    );

    const persistedSkill = await repository.findSkillById(existingSkill._id.toHexString());
    assert.equal(persistedSkill?.lifecycleStatus, 'published');
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
    lifecycleStatus: 'published',
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

test('createSkill rejects invalid frontmatter and duplicate slugs', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub([
    createStoredSkillDocument({
      name: 'Existing Skill',
      description: 'Existing skill description',
      lifecycleStatus: 'published',
    }),
  ]);
  const service = createTestSkillsService({ env, repository });

  try {
    await assert.rejects(
      () =>
        service.createSkill(
          { actor: ACTOR },
          {
            skillMarkdown: '# missing frontmatter',
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
            skillMarkdown: buildSkillMarkdown(
              'Existing Skill',
              'Trying to reuse the same slug',
            ),
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

test('system skills remain readable but immutable', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub();
  const service = createTestSkillsService({ env, repository });

  try {
    const detail = await service.getSkillDetail({ actor: ACTOR }, 'search_documents');
    assert.equal(detail.skill.source, 'system');

    await assert.rejects(
      () =>
        service.updateSkill({ actor: ACTOR }, 'search_documents', {
          lifecycleStatus: 'draft',
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'SYSTEM_SKILL_READONLY');
        return true;
      },
    );

    await assert.rejects(
      () => service.deleteSkill({ actor: ACTOR }, 'search_documents'),
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

test('importSkill rejects HTML pages and missing GitHub SKILL.md bundles', async () => {
  const env = await createEnv();
  const repository = createRepositoryStub();
  const service = createTestSkillsService({ env, repository });

  try {
    await withMockFetch(
      async (input) => {
        const url = String(input);

        if (url === 'https://example.com/not-raw') {
          return new Response('<html><body>not markdown</body></html>', {
            status: 200,
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
          });
        }

        if (url === 'https://api.github.com/repos/openai/example-skills/contents/skills/empty?ref=main') {
          return Response.json([
            {
              type: 'file',
              path: 'skills/empty/README.md',
              url,
              download_url:
                'https://raw.githubusercontent.com/openai/example-skills/main/skills/empty/README.md',
            },
          ]);
        }

        if (
          url ===
          'https://raw.githubusercontent.com/openai/example-skills/main/skills/empty/README.md'
        ) {
          return new Response('# only readme', {
            status: 200,
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
          });
        }

        throw new Error(`unexpected fetch url: ${url}`);
      },
      async () => {
        await assert.rejects(
          () =>
            service.importSkill(
              { actor: ACTOR },
              {
                mode: 'url',
                url: 'https://example.com/not-raw',
              },
            ),
          (error: unknown) => {
            assert.ok(error instanceof AppError);
            assert.equal(error.code, 'SKILL_IMPORT_FETCH_FAILED');
            return true;
          },
        );

        await assert.rejects(
          () =>
            service.importSkill(
              { actor: ACTOR },
              {
                mode: 'github',
                repository: 'openai/example-skills',
                path: 'skills/empty',
                ref: 'main',
              },
            ),
          (error: unknown) => {
            assert.ok(error instanceof AppError);
            assert.equal(error.code, 'SKILL_IMPORT_FETCH_FAILED');
            return true;
          },
        );
      },
    );
  } finally {
    await rm(env.skills.storageRoot, { recursive: true, force: true });
  }
});
