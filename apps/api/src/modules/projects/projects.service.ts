import { getEffectiveLlmConfig } from '@config/ai-config.js';
import type { AppEnv } from '@config/env.js';
import type { WithId } from 'mongodb';
import { AppError } from '@lib/app-error.js';
import {
  createValidationAppError,
  readOptionalStringField,
} from '@lib/validation.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { KnowledgeCommandContext, KnowledgeSearchResponse } from '@modules/knowledge/knowledge.types.js';
import type { SettingsRepository } from '@modules/settings/settings.repository.js';
import type { EffectiveLlmConfig, SettingsLlmProvider } from '@modules/settings/settings.types.js';
import type { SkillBindingValidator } from '@modules/skills/skills.binding.js';
import { ProjectsRepository } from './projects.repository.js';
import {
  buildProjectMemberProfileMap,
  createDefaultProjectConversation,
  createProjectConversation,
  createProjectConversationMessage,
  createProjectConversationNotFoundError,
  createProjectNotFoundError,
  getProjectConversation,
  getProjectConversations,
  requireAdminProject,
  requireVisibleProject,
  toProjectConversationDetailResponse,
  toProjectConversationSummaryResponse,
  toProjectResponse,
} from './projects.shared.js';
import type {
  CreateProjectConversationInput,
  CreateProjectConversationMessageInput,
  CreateProjectInput,
  ProjectCommandContext,
  ProjectConversationDetailEnvelope,
  ProjectConversationDocument,
  ProjectConversationMessageDocument,
  ProjectConversationSourceDocument,
  ProjectConversationListResponse,
  ProjectDocument,
  ProjectMemberDocument,
  ProjectResponse,
  ProjectsListResponse,
  UpdateProjectInput,
} from './projects.types.js';

export interface ProjectsService {
  listProjects(context: ProjectCommandContext): Promise<ProjectsListResponse>;
  listProjectConversations(
    context: ProjectCommandContext,
    projectId: string,
  ): Promise<ProjectConversationListResponse>;
  createProjectConversation(
    context: ProjectCommandContext,
    projectId: string,
    input: CreateProjectConversationInput,
  ): Promise<ProjectConversationDetailEnvelope>;
  createProjectConversationMessage(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: CreateProjectConversationMessageInput,
  ): Promise<ProjectConversationDetailEnvelope>;
  getProjectConversationDetail(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
  ): Promise<ProjectConversationDetailEnvelope>;
  createProject(
    context: ProjectCommandContext,
    input: CreateProjectInput,
  ): Promise<ProjectResponse>;
  updateProject(
    context: ProjectCommandContext,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectResponse>;
  deleteProject(context: ProjectCommandContext, projectId: string): Promise<void>;
}

interface ProjectKnowledgeUsage {
  deleteProjectKnowledge(
    projectId: string,
    actor: ProjectCommandContext['actor'],
  ): Promise<void>;
}

interface ProjectConversationKnowledgeSearch {
  searchProjectDocuments(
    context: KnowledgeCommandContext,
    projectId: string,
    input: {
      query: string;
      topK?: number;
    },
  ): Promise<KnowledgeSearchResponse>;
}

export interface ProjectConversationRuntime {
  generateAssistantReply(input: {
    actor: ProjectCommandContext['actor'];
    project: WithId<ProjectDocument>;
    conversation: ProjectConversationDocument;
    userMessage: ProjectConversationMessageDocument;
  }): Promise<{
    content: string;
    sources: ProjectConversationSourceDocument[];
  }>;
}

const NOOP_PROJECT_KNOWLEDGE_USAGE: ProjectKnowledgeUsage = {
  deleteProjectKnowledge: async () => undefined,
};

const DEFAULT_PROJECT_CONVERSATION_TITLE = '新对话';
const PROJECT_CONVERSATION_RETRIEVAL_TOP_K = 5;
const PROJECT_CONVERSATION_HISTORY_LIMIT = 6;
const CHAT_COMPLETIONS_COMPATIBLE_PROJECT_LLM_PROVIDERS = new Set<SettingsLlmProvider>([
  'openai',
  'anthropic',
  'gemini',
  'aliyun',
  'deepseek',
  'moonshot',
  'zhipu',
  'custom',
]);

const readProjectConversationMutationInput = <
  T extends CreateProjectConversationInput | CreateProjectConversationMessageInput,
>(
  input: T | undefined,
): T => {
  if (input === undefined) {
    return {} as T;
  }

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw createValidationAppError('请求体必须为对象', {
      body: '请求体必须为对象',
    });
  }

  return input;
};

const buildApiUrl = (baseUrl: string, path: string): string => {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ''), normalizedBaseUrl).toString();
};

const normalizeOpenAiCompatibleErrorMessage = (
  body: unknown,
  fallback: string,
): string => {
  if (
    body &&
    typeof body === 'object' &&
    'error' in body &&
    body.error &&
    typeof body.error === 'object' &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }

  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  return fallback;
};

const createProjectConversationLlmUnavailableError = (): AppError => {
  return new AppError({
    statusCode: 503,
    code: 'PROJECT_CONVERSATION_LLM_UNAVAILABLE',
    message: '当前未配置可用的对话模型，请先完成 LLM 设置',
  });
};

const createProjectConversationLlmProviderUnsupportedError = (): AppError => {
  return new AppError({
    statusCode: 503,
    code: 'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED',
    message: '当前 LLM Provider 暂不支持项目对话',
  });
};

const createProjectConversationLlmUpstreamError = (
  message: string,
  cause?: unknown,
): AppError => {
  return new AppError({
    statusCode: 502,
    code: 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR',
    message,
    cause,
  });
};

const extractOpenAiCompatibleMessageContent = (body: unknown): string => {
  if (
    body &&
    typeof body === 'object' &&
    'choices' in body &&
    Array.isArray(body.choices)
  ) {
    const firstChoice = body.choices[0];

    if (
      firstChoice &&
      typeof firstChoice === 'object' &&
      'message' in firstChoice &&
      firstChoice.message &&
      typeof firstChoice.message === 'object' &&
      'content' in firstChoice.message
    ) {
      const content = firstChoice.message.content;

      if (typeof content === 'string') {
        return content.trim();
      }

      if (Array.isArray(content)) {
        return content
          .map((item) => {
            if (
              item &&
              typeof item === 'object' &&
              'text' in item &&
              typeof item.text === 'string'
            ) {
              return item.text.trim();
            }

            return '';
          })
          .filter(Boolean)
          .join('\n')
          .trim();
      }
    }
  }

  return '';
};

const buildProjectConversationSystemPrompt = (projectName: string): string => {
  return [
    '你是知项 Knowject 的项目对话助手。',
    `当前项目：${projectName}。`,
    '回答约束：',
    '1. 仅基于对话历史与提供的项目知识片段作答；信息不足时明确说明。',
    '2. 不要编造接口、状态、结论或未出现的事实。',
    '3. 使用简洁中文回答，优先给结论，再补充必要依据。',
  ].join('\n');
};

const buildProjectConversationContextPrompt = ({
  question,
  retrieval,
}: {
  question: string;
  retrieval: KnowledgeSearchResponse;
}): string => {
  const retrievalContext =
    retrieval.items.length > 0
      ? retrieval.items
          .map(
            (item, index) =>
              [
                `[来源 ${index + 1}]`,
                `knowledgeId: ${item.knowledgeId}`,
                `documentId: ${item.documentId}`,
                `chunkId: ${item.chunkId}`,
                `chunkIndex: ${item.chunkIndex}`,
                `source: ${item.source}`,
                `content: ${item.content}`,
              ].join('\n'),
          )
          .join('\n\n')
      : '当前没有命中的项目知识片段。';

  return [
    '请结合下列项目知识片段回答用户问题。',
    '如果片段不足以支撑结论，请直接说明当前资料不足。',
    '',
    '项目知识片段：',
    retrievalContext,
    '',
    '用户问题：',
    question,
  ].join('\n');
};

const toProjectConversationHistoryMessages = (
  conversation: ProjectConversationDocument,
  latestUserMessageId: string,
): Array<{
  role: 'user' | 'assistant';
  content: string;
}> => {
  return conversation.messages
    .filter((message) => message.id !== latestUserMessageId)
    .slice(-PROJECT_CONVERSATION_HISTORY_LIMIT)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
};

const buildProjectConversationSourceSnippet = (content: string): string => {
  const normalizedContent = content.trim();

  if (normalizedContent.length <= 220) {
    return normalizedContent;
  }

  return `${normalizedContent.slice(0, 217)}...`;
};

const toProjectConversationSources = (
  retrieval: KnowledgeSearchResponse,
): ProjectConversationSourceDocument[] => {
  return retrieval.items.map((item) => ({
    knowledgeId: item.knowledgeId,
    documentId: item.documentId,
    chunkId: item.chunkId,
    chunkIndex: item.chunkIndex,
    source: item.source,
    snippet: buildProjectConversationSourceSnippet(item.content),
    distance: item.distance,
  }));
};

const requestProjectConversationCompletion = async ({
  llmConfig,
  messages,
}: {
  llmConfig: EffectiveLlmConfig;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}): Promise<string> => {
  if (!CHAT_COMPLETIONS_COMPATIBLE_PROJECT_LLM_PROVIDERS.has(llmConfig.provider)) {
    throw createProjectConversationLlmProviderUnsupportedError();
  }

  if (!llmConfig.apiKey) {
    throw createProjectConversationLlmUnavailableError();
  }

  let responseBody: unknown = null;

  try {
    const response = await fetch(buildApiUrl(llmConfig.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${llmConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: llmConfig.model,
        messages,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(llmConfig.requestTimeoutMs),
    });
    const responseText = await response.text();

    if (responseText) {
      try {
        responseBody = JSON.parse(responseText) as unknown;
      } catch {
        responseBody = responseText;
      }
    }

    if (!response.ok) {
      throw createProjectConversationLlmUpstreamError(
        normalizeOpenAiCompatibleErrorMessage(
          responseBody,
          `项目对话生成失败（HTTP ${response.status}）`,
        ),
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw createProjectConversationLlmUpstreamError(
      error instanceof Error && error.message.trim()
        ? error.message
        : '项目对话生成失败，请稍后重试',
      error,
    );
  }

  const content = extractOpenAiCompatibleMessageContent(responseBody);

  if (!content) {
    throw createProjectConversationLlmUpstreamError('项目对话模型返回了空内容');
  }

  return content;
};

export const createProjectConversationRuntime = ({
  env,
  settingsRepository,
  knowledgeSearch,
}: {
  env: AppEnv;
  settingsRepository: SettingsRepository;
  knowledgeSearch: ProjectConversationKnowledgeSearch;
}): ProjectConversationRuntime => {
  return {
    generateAssistantReply: async ({ actor, project, conversation, userMessage }) => {
      const [retrieval, llmConfig] = await Promise.all([
        knowledgeSearch.searchProjectDocuments(
          { actor },
          project._id.toHexString(),
          {
            query: userMessage.content,
            topK: PROJECT_CONVERSATION_RETRIEVAL_TOP_K,
          },
        ),
        getEffectiveLlmConfig({
          env,
          repository: settingsRepository,
        }),
      ]);

      const messages = [
        {
          role: 'system' as const,
          content: buildProjectConversationSystemPrompt(project.name),
        },
        ...toProjectConversationHistoryMessages(conversation, userMessage.id),
        {
          role: 'user' as const,
          content: buildProjectConversationContextPrompt({
            question: userMessage.content,
            retrieval,
          }),
        },
      ];
      const content = await requestProjectConversationCompletion({
        llmConfig,
        messages,
      });

      return {
        content,
        sources: toProjectConversationSources(retrieval),
      };
    },
  };
};

const readOptionalStringArrayField = (
  value: unknown,
  field: 'knowledgeBaseIds' | 'agentIds' | 'skillIds',
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw createValidationAppError(`${field} 必须为字符串数组`, {
      [field]: `${field} 必须为字符串数组`,
    });
  }

  const normalizedValues = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedValues.length !== value.length) {
    throw createValidationAppError(`${field} 必须为字符串数组`, {
      [field]: `${field} 必须为字符串数组`,
    });
  }

  return Array.from(new Set(normalizedValues));
};

const validateCreateProjectInput = (
  input: CreateProjectInput,
): Pick<
  ProjectDocument,
  'name' | 'description' | 'knowledgeBaseIds' | 'agentIds' | 'skillIds'
> => {
  const name = readOptionalStringField(input.name, 'name');
  const description = readOptionalStringField(input.description, 'description');
  const knowledgeBaseIds =
    readOptionalStringArrayField(input.knowledgeBaseIds, 'knowledgeBaseIds') ?? [];
  const agentIds = readOptionalStringArrayField(input.agentIds, 'agentIds') ?? [];
  const skillIds = readOptionalStringArrayField(input.skillIds, 'skillIds') ?? [];

  if (!name) {
    throw createValidationAppError('请输入项目名称', {
      name: '请输入项目名称',
    });
  }

  return {
    name,
    description: description ?? '',
    knowledgeBaseIds,
    agentIds,
    skillIds,
  };
};

const validateUpdateProjectInput = (
  input: UpdateProjectInput,
): Partial<
  Pick<
    ProjectDocument,
    'name' | 'description' | 'knowledgeBaseIds' | 'agentIds' | 'skillIds'
  >
> => {
  const name = readOptionalStringField(input.name, 'name');
  const description = readOptionalStringField(input.description, 'description');
  const knowledgeBaseIds = readOptionalStringArrayField(
    input.knowledgeBaseIds,
    'knowledgeBaseIds',
  );
  const agentIds = readOptionalStringArrayField(input.agentIds, 'agentIds');
  const skillIds = readOptionalStringArrayField(input.skillIds, 'skillIds');

  if (
    name === undefined &&
    description === undefined &&
    knowledgeBaseIds === undefined &&
    agentIds === undefined &&
    skillIds === undefined
  ) {
    throw createValidationAppError('至少需要提供一个可更新字段', {
      name: '至少需要提供 name 或 description',
      description: '至少需要提供 name 或 description',
      knowledgeBaseIds: '至少需要提供一个可更新字段',
      agentIds: '至少需要提供一个可更新字段',
      skillIds: '至少需要提供一个可更新字段',
    });
  }

  if (input.name !== undefined && !name) {
    throw createValidationAppError('请输入项目名称', {
      name: '请输入项目名称',
    });
  }

  return {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(knowledgeBaseIds !== undefined ? { knowledgeBaseIds } : {}),
    ...(agentIds !== undefined ? { agentIds } : {}),
    ...(skillIds !== undefined ? { skillIds } : {}),
  };
};

const validateCreateProjectConversationInput = (
  input: CreateProjectConversationInput,
): {
  title: string;
} => {
  const normalizedInput = readProjectConversationMutationInput(input);
  const title = readOptionalStringField(normalizedInput.title, 'title');

  return {
    title: title || DEFAULT_PROJECT_CONVERSATION_TITLE,
  };
};

const validateCreateProjectConversationMessageInput = (
  input: CreateProjectConversationMessageInput,
): {
  content: string;
} => {
  const normalizedInput = readProjectConversationMutationInput(input);
  const content = readOptionalStringField(normalizedInput.content, 'content');

  if (!content) {
    throw createValidationAppError('请输入消息内容', {
      content: '请输入消息内容',
    });
  }

  return {
    content,
  };
};

const buildInitialMembers = (actorId: string): ProjectMemberDocument[] => {
  const joinedAt = new Date();

  return [
    {
      userId: actorId,
      role: 'admin',
      joinedAt,
    },
  ];
};

const applyProjectPatch = (
  project: WithId<ProjectDocument>,
  patch: Partial<
    Pick<
      ProjectDocument,
      'name' | 'description' | 'knowledgeBaseIds' | 'agentIds' | 'skillIds'
    >
  >,
): Pick<
  ProjectDocument,
  'name' | 'description' | 'knowledgeBaseIds' | 'agentIds' | 'skillIds' | 'updatedAt'
> => {
  return {
    name: patch.name ?? project.name,
    description: patch.description ?? project.description,
    knowledgeBaseIds: patch.knowledgeBaseIds ?? project.knowledgeBaseIds ?? [],
    agentIds: patch.agentIds ?? project.agentIds ?? [],
    skillIds: patch.skillIds ?? project.skillIds ?? [],
    updatedAt: new Date(),
  };
};

const getRequiredPersistedConversation = (
  project: Pick<ProjectDocument, 'name' | 'conversations'>,
  conversationId: string,
): ProjectConversationDocument => {
  const conversation = getProjectConversation(project, conversationId);

  if (!conversation) {
    throw createProjectConversationNotFoundError();
  }

  return conversation;
};

const throwConversationPersistenceTargetError = async (
  repository: ProjectsRepository,
  projectId: string,
): Promise<never> => {
  const currentProject = await repository.findById(projectId);

  if (!currentProject) {
    throw createProjectNotFoundError();
  }

  throw createProjectConversationNotFoundError();
};

export const createProjectsService = ({
  repository,
  authRepository,
  skillBindingValidator,
  knowledgeUsage = NOOP_PROJECT_KNOWLEDGE_USAGE,
  conversationRuntime,
}: {
  repository: ProjectsRepository;
  authRepository: AuthRepository;
  skillBindingValidator: SkillBindingValidator;
  knowledgeUsage?: ProjectKnowledgeUsage;
  conversationRuntime?: ProjectConversationRuntime;
}): ProjectsService => {
  return {
    listProjects: async ({ actor }) => {
      const projects = await repository.listByMemberUserId(actor.id);
      const memberProfileMap = await buildProjectMemberProfileMap(authRepository, projects);

      return {
        total: projects.length,
        items: projects.map((project) => toProjectResponse(project, actor.id, memberProfileMap)),
      };
    },

    listProjectConversations: async ({ actor }, projectId) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const conversations = getProjectConversations(project);

      return {
        total: conversations.length,
        items: conversations.map((conversation) =>
          toProjectConversationSummaryResponse(project._id.toHexString(), conversation),
        ),
      };
    },

    createProjectConversation: async ({ actor }, projectId, input) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const { title } = validateCreateProjectConversationInput(input);
      const now = new Date();
      const conversation = createProjectConversation({
        title,
        createdAt: now,
      });
      const updatedProject = await repository.appendProjectConversation(
        project._id.toHexString(),
        conversation,
        now,
      );

      if (!updatedProject) {
        throw createProjectNotFoundError();
      }

      return {
        conversation: toProjectConversationDetailResponse(
          updatedProject._id.toHexString(),
          getRequiredPersistedConversation(updatedProject, conversation.id),
        ),
      };
    },

    createProjectConversationMessage: async (
      { actor },
      projectId,
      conversationId,
      input,
    ) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const { content } = validateCreateProjectConversationMessageInput(input);
      const now = new Date();
      const userMessage = createProjectConversationMessage({
        role: 'user',
        content,
        createdAt: now,
      });
      const persistedProjectId = project._id.toHexString();
      let persistedUserProject = await repository.appendProjectConversationMessage(
        persistedProjectId,
        conversationId,
        userMessage,
        now,
      );

      if (
        !persistedUserProject &&
        conversationId === 'chat-default' &&
        (project.conversations?.length ?? 0) === 0
      ) {
        const defaultConversation = createDefaultProjectConversation(project);

        await repository.materializeDefaultProjectConversation(
          persistedProjectId,
          defaultConversation,
          defaultConversation.updatedAt,
        );

        persistedUserProject = await repository.appendProjectConversationMessage(
          persistedProjectId,
          conversationId,
          userMessage,
          now,
        );
      }

      const ensuredUserProject =
        persistedUserProject ??
        (await throwConversationPersistenceTargetError(repository, persistedProjectId));

      const userConversation = getRequiredPersistedConversation(
        ensuredUserProject,
        conversationId,
      );

      if (!conversationRuntime) {
        return {
          conversation: toProjectConversationDetailResponse(
            ensuredUserProject._id.toHexString(),
            userConversation,
          ),
        };
      }

      const assistantReply = await conversationRuntime.generateAssistantReply({
        actor,
        project: ensuredUserProject,
        conversation: userConversation,
        userMessage,
      });
      const assistantCreatedAt = new Date();
      const assistantMessage = createProjectConversationMessage({
        role: 'assistant',
        content: assistantReply.content,
        sources: assistantReply.sources,
        createdAt: assistantCreatedAt,
      });
      const persistedAssistantProject = await repository.appendProjectConversationMessage(
        persistedProjectId,
        conversationId,
        assistantMessage,
        assistantCreatedAt,
      );

      const ensuredAssistantProject =
        persistedAssistantProject ??
        (await throwConversationPersistenceTargetError(repository, persistedProjectId));

      return {
        conversation: toProjectConversationDetailResponse(
          ensuredAssistantProject._id.toHexString(),
          getRequiredPersistedConversation(ensuredAssistantProject, conversationId),
        ),
      };
    },

    getProjectConversationDetail: async ({ actor }, projectId, conversationId) => {
      const project = await requireVisibleProject(repository, projectId, actor);
      const conversation = getProjectConversation(project, conversationId);

      if (!conversation) {
        throw createProjectConversationNotFoundError();
      }

      return {
        conversation: toProjectConversationDetailResponse(
          project._id.toHexString(),
          conversation,
        ),
      };
    },

    createProject: async ({ actor }, input) => {
      const {
        name,
        description,
        knowledgeBaseIds,
        agentIds,
        skillIds,
      } = validateCreateProjectInput(input);
      await skillBindingValidator.assertBindableSkillIds(skillIds, {
        fieldName: 'skillIds',
      });
      const now = new Date();
      const project = await repository.createProject({
        name,
        description,
        ownerId: actor.id,
        members: buildInitialMembers(actor.id),
        knowledgeBaseIds,
        agentIds,
        skillIds,
        conversations: [createDefaultProjectConversation({ name })],
        createdAt: now,
        updatedAt: now,
      });

      const memberProfileMap = await buildProjectMemberProfileMap(authRepository, [project]);
      return toProjectResponse(project, actor.id, memberProfileMap);
    },

    updateProject: async ({ actor }, projectId, input) => {
      const currentProject = await requireAdminProject(repository, projectId, actor);
      const patch = validateUpdateProjectInput(input);

      if (patch.skillIds !== undefined) {
        await skillBindingValidator.assertBindableSkillIds(patch.skillIds, {
          fieldName: 'skillIds',
        });
      }

      const updatedProject = await repository.updateProject(
        currentProject._id.toHexString(),
        applyProjectPatch(currentProject, patch),
      );

      if (!updatedProject) {
        throw createProjectNotFoundError();
      }

      const memberProfileMap = await buildProjectMemberProfileMap(authRepository, [updatedProject]);
      return toProjectResponse(updatedProject, actor.id, memberProfileMap);
    },

    deleteProject: async ({ actor }, projectId) => {
      const project = await requireAdminProject(repository, projectId, actor);
      await knowledgeUsage.deleteProjectKnowledge(project._id.toHexString(), actor);
      const deleted = await repository.deleteProject(project._id.toHexString());

      if (!deleted) {
        throw createProjectNotFoundError();
      }
    },
  };
};
