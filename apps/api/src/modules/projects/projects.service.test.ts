import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { SkillBindingValidator } from '@modules/skills/skills.binding.js';
import { createProjectsService } from './projects.service.js';
import type { ProjectsRepository } from './projects.repository.js';
import type { ProjectDocument } from './projects.types.js';

const createAuthRepositoryStub = (): AuthRepository => {
  return {
    findProfilesByIds: async (userIds: string[]) =>
      userIds.map((userId) => ({
        id: userId,
        username: userId,
        name: userId === 'user-1' ? 'Langya' : `User ${userId}`,
      })),
  } as unknown as AuthRepository;
};

const createSkillBindingValidatorStub = (
  implementation?: (
    skillIds: string[],
    options: { fieldName: 'boundSkillIds' | 'skillIds' },
  ) => Promise<void>,
): SkillBindingValidator => {
  return {
    assertBindableSkillIds: implementation ?? (async () => undefined),
  };
};

test('createProject persists resource bindings into the formal project model', async () => {
  let createdProject: ProjectDocument | null = null;

  const repository = {
    createProject: async (document: Omit<ProjectDocument, '_id'>) => {
      createdProject = document;

      return {
        ...document,
        _id: new ObjectId('507f1f77bcf86cd799439011'),
      };
    },
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const response = await service.createProject(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    {
      name: '项目资源正式化',
      description: '把项目资源绑定切到后端主模型',
      knowledgeBaseIds: ['kb-1', 'kb-2', 'kb-1'],
      agentIds: ['agent-1'],
      skillIds: ['skill-1', 'skill-2'],
    },
  );

  assert.notEqual(createdProject, null);
  if (!createdProject) {
    throw new Error('createdProject should not be null');
  }

  const persistedProject: ProjectDocument = createdProject;
  assert.deepEqual(persistedProject.knowledgeBaseIds, ['kb-1', 'kb-2']);
  assert.deepEqual(persistedProject.agentIds, ['agent-1']);
  assert.deepEqual(persistedProject.skillIds, ['skill-1', 'skill-2']);
  assert.equal(persistedProject.conversations.length, 1);
  assert.equal(persistedProject.conversations[0]?.id, 'chat-default');
  assert.deepEqual(response.knowledgeBaseIds, ['kb-1', 'kb-2']);
  assert.deepEqual(response.agentIds, ['agent-1']);
  assert.deepEqual(response.skillIds, ['skill-1', 'skill-2']);
});

test('listProjectConversations returns a default formal conversation when the project has no stored threads', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439012'),
    name: '项目对话正式化',
    description: '验证默认会话回退',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-13T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-13T00:00:00.000Z'),
    updatedAt: new Date('2026-03-13T00:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.listProjectConversations(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
  );

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, 'chat-default');
  assert.match(result.items[0]?.title ?? '', /项目对话正式化/);
  assert.match(result.items[0]?.preview ?? '', /正式后端读链路/);
});

test('updateProject accepts resource-binding-only patches', async () => {
  const project: ProjectDocument & {
    _id: NonNullable<ProjectDocument['_id']>;
  } = {
    _id: new ObjectId('507f1f77bcf86cd799439013'),
    name: '绑定迁移',
    description: '验证只更新绑定',
    ownerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-03-13T00:00:00.000Z'),
      },
    ],
    knowledgeBaseIds: [],
    agentIds: [],
    skillIds: [],
    conversations: [],
    createdAt: new Date('2026-03-13T00:00:00.000Z'),
    updatedAt: new Date('2026-03-13T00:00:00.000Z'),
  };

  const repository = {
    findById: async (projectId: string) =>
      projectId === project._id.toHexString() ? project : null,
    updateProject: async (_projectId: string, patch: Partial<ProjectDocument>) => ({
      ...project,
      ...patch,
      _id: project._id,
    }),
  } as unknown as ProjectsRepository;

  const service = createProjectsService({
    repository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(),
  });

  const result = await service.updateProject(
    {
      actor: {
        id: 'user-1',
        username: 'langya',
      },
    },
    project._id.toHexString(),
    {
      knowledgeBaseIds: ['kb-real-1'],
      agentIds: ['agent-keep'],
      skillIds: ['skill-keep'],
    },
  );

  assert.equal(result.name, '绑定迁移');
  assert.deepEqual(result.knowledgeBaseIds, ['kb-real-1']);
  assert.deepEqual(result.agentIds, ['agent-keep']);
  assert.deepEqual(result.skillIds, ['skill-keep']);
});

test('createProject rejects unbindable managed skill ids', async () => {
  const service = createProjectsService({
    repository: {} as ProjectsRepository,
    authRepository: createAuthRepositoryStub(),
    skillBindingValidator: createSkillBindingValidatorStub(async (skillIds) => {
      if (skillIds.includes('draft-skill')) {
        throw new Error('draft skill');
      }
    }),
  });

  await assert.rejects(
    () =>
      service.createProject(
        {
          actor: {
            id: 'user-1',
            username: 'langya',
          },
        },
        {
          name: '非法 Skill 绑定',
          skillIds: ['draft-skill'],
        },
      ),
    /draft skill/,
  );
});
