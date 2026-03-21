import { randomUUID } from 'node:crypto';
import type { WithId } from 'mongodb';
import { AppError } from '@lib/app-error.js';
import { DEFAULT_LOCALE, type SupportedLocale } from '@lib/locale.js';
import { getFallbackMessage, getMessage } from '@lib/locale.messages.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { AuthenticatedRequestUser, AuthUserProfile } from '@modules/auth/auth.types.js';
import type { ProjectsRepository } from './projects.repository.js';
import type {
  ProjectConversationDetailResponse,
  ProjectConversationDocument,
  ProjectConversationMessageDocument,
  ProjectConversationMessageRole,
  ProjectConversationMessageResponse,
  ProjectConversationSourceDocument,
  ProjectConversationSourceResponse,
  ProjectConversationSummaryResponse,
  ProjectConversationTitleOrigin,
  ProjectDocument,
  ProjectMemberDocument,
  ProjectResponse,
} from './projects.types.js';

type ProjectMemberProfileMap = Map<string, AuthUserProfile>;
const DEFAULT_PROJECT_CONVERSATION_MESSAGE_ID = 'msg-default-assistant';
const STORED_DEFAULT_PROJECT_CONVERSATION_TITLE = '新对话';
const DEFAULT_PROJECT_CONVERSATION_ID = 'chat-default';

const createUnknownMemberProfile = (
  userId: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
): AuthUserProfile => {
  return {
    id: userId,
    username: 'unknown',
    name:
      getMessage('project.member.unknownName', locale) ??
      getFallbackMessage('project.member.unknownName'),
  };
};

export const createProjectNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'PROJECT_NOT_FOUND',
    message: getFallbackMessage('project.notFound'),
    messageKey: 'project.notFound',
  });
};

export const createProjectForbiddenError = (): AppError => {
  return new AppError({
    statusCode: 403,
    code: 'PROJECT_FORBIDDEN',
    message: getFallbackMessage('project.forbidden'),
    messageKey: 'project.forbidden',
  });
};

export const createProjectConversationNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'PROJECT_CONVERSATION_NOT_FOUND',
    message: getFallbackMessage('project.conversation.notFound'),
    messageKey: 'project.conversation.notFound',
  });
};

export const createProjectConversationMessageNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'PROJECT_CONVERSATION_MESSAGE_NOT_FOUND',
    message: getFallbackMessage('project.conversation.message.notFound'),
    messageKey: 'project.conversation.message.notFound',
  });
};

export const getProjectMember = (
  project: Pick<ProjectDocument, 'members'>,
  userId: string,
): ProjectMemberDocument | null => {
  return project.members.find((member) => member.userId === userId) ?? null;
};

export const requireVisibleProject = async (
  repository: ProjectsRepository,
  projectId: string,
  actor: AuthenticatedRequestUser,
): Promise<WithId<ProjectDocument>> => {
  const project = await repository.findById(projectId);
  if (!project) {
    throw createProjectNotFoundError();
  }

  if (!getProjectMember(project, actor.id)) {
    throw createProjectNotFoundError();
  }

  return project;
};

export const requireAdminProject = async (
  repository: ProjectsRepository,
  projectId: string,
  actor: AuthenticatedRequestUser,
): Promise<WithId<ProjectDocument>> => {
  const project = await requireVisibleProject(repository, projectId, actor);
  const member = getProjectMember(project, actor.id);

  if (!member || member.role !== 'admin') {
    throw createProjectForbiddenError();
  }

  return project;
};

export const buildProjectMemberProfileMap = async (
  authRepository: AuthRepository,
  projects: Array<Pick<ProjectDocument, 'members'>>,
): Promise<ProjectMemberProfileMap> => {
  const userIds = Array.from(
    new Set(projects.flatMap((project) => project.members.map((member) => member.userId))),
  );
  const profiles = await authRepository.findProfilesByIds(userIds);

  return new Map(profiles.map((profile) => [profile.id, profile] as const));
};

const trimStringArray = (values: string[] | undefined): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
};

const buildDefaultConversationMessages = (
  projectName: string,
): ProjectConversationMessageDocument[] => {
  const now = new Date();
  void projectName;

  return [
    {
      id: DEFAULT_PROJECT_CONVERSATION_MESSAGE_ID,
      role: 'assistant',
      content: '',
      createdAt: now,
    },
  ];
};

export const getProjectResourceBinding = (
  project: Pick<ProjectDocument, 'knowledgeBaseIds' | 'agentIds' | 'skillIds'>,
) => {
  return {
    knowledgeBaseIds: trimStringArray(project.knowledgeBaseIds),
    agentIds: trimStringArray(project.agentIds),
    skillIds: trimStringArray(project.skillIds),
  };
};

export const createDefaultProjectConversation = (
  project: Pick<ProjectDocument, 'name'>,
): ProjectConversationDocument => {
  const now = new Date();
  void project;

  return {
    id: 'chat-default',
    title: STORED_DEFAULT_PROJECT_CONVERSATION_TITLE,
    titleOrigin: 'default',
    messages: buildDefaultConversationMessages(project.name),
    createdAt: now,
    updatedAt: now,
  };
};

export const buildDefaultProjectConversationTitle = (
  projectName: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string => {
  return (
    getMessage('project.conversation.defaultTitle', locale, {
      projectName,
    }) ??
    getFallbackMessage('project.conversation.defaultTitle', {
      projectName,
    })
  );
};

export const createProjectConversation = ({
  title,
  titleOrigin = 'manual',
  createdAt = new Date(),
}: {
  title: string;
  titleOrigin?: ProjectConversationTitleOrigin;
  createdAt?: Date;
}): ProjectConversationDocument => {
  return {
    id: `chat-${randomUUID()}`,
    title,
    titleOrigin,
    messages: [],
    createdAt,
    updatedAt: createdAt,
  };
};

export const createProjectConversationMessage = ({
  role,
  content,
  clientRequestId,
  sources,
  createdAt = new Date(),
}: {
  role: ProjectConversationMessageRole;
  content: string;
  clientRequestId?: string;
  sources?: ProjectConversationSourceDocument[];
  createdAt?: Date;
}): ProjectConversationMessageDocument => {
  return {
    id: `msg-${randomUUID()}`,
    role,
    content,
    createdAt,
    ...(clientRequestId !== undefined ? { clientRequestId } : {}),
    ...(sources !== undefined ? { sources } : {}),
  };
};

export const getProjectConversations = (
  project: Pick<ProjectDocument, 'name' | 'conversations'>,
): ProjectConversationDocument[] => {
  if (Array.isArray(project.conversations) && project.conversations.length > 0) {
    return [...project.conversations].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
    );
  }

  return [createDefaultProjectConversation(project)];
};

export const getProjectConversation = (
  project: Pick<ProjectDocument, 'name' | 'conversations'>,
  conversationId: string,
): ProjectConversationDocument | null => {
  return (
    getProjectConversations(project).find(
      (conversation) => conversation.id === conversationId,
    ) ?? null
  );
};

const resolveProjectConversationTitle = (
  projectName: string,
  conversation: ProjectConversationDocument,
  locale: SupportedLocale,
): string => {
  if (
    conversation.id === DEFAULT_PROJECT_CONVERSATION_ID &&
    conversation.titleOrigin === 'default'
  ) {
    return (
      getMessage('project.conversation.defaultTitle', locale, {
        projectName,
      }) ??
      getFallbackMessage('project.conversation.defaultTitle', {
        projectName,
      })
    );
  }

  if (conversation.titleOrigin === 'default') {
    return (
      getMessage('project.conversation.newTitle', locale) ??
      getFallbackMessage('project.conversation.newTitle')
    );
  }

  return conversation.title;
};

const getConversationPreview = (
  projectName: string,
  conversation: ProjectConversationDocument,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string => {
  const latestMessage =
    conversation.messages[conversation.messages.length - 1] ?? null;

  if (!latestMessage) {
    return (
      getMessage('project.conversation.emptyPreview', locale) ??
      getFallbackMessage('project.conversation.emptyPreview')
    );
  }

  if (
    conversation.id === DEFAULT_PROJECT_CONVERSATION_ID &&
    latestMessage.id === DEFAULT_PROJECT_CONVERSATION_MESSAGE_ID &&
    latestMessage.role === 'assistant'
  ) {
    return (
      getMessage('project.conversation.defaultIntro', locale, {
        projectName,
      }) ??
      getFallbackMessage('project.conversation.defaultIntro', {
        projectName,
      })
    );
  }

  return latestMessage.content;
};

const toProjectConversationSourceResponse = (
  source: ProjectConversationSourceDocument,
): ProjectConversationSourceResponse => {
  return {
    knowledgeId: source.knowledgeId,
    documentId: source.documentId,
    chunkId: source.chunkId,
    chunkIndex: source.chunkIndex,
    source: source.source,
    snippet: source.snippet,
    distance: source.distance,
  };
};

export const toProjectConversationMessageResponse = (
  conversationId: string,
  message: ProjectConversationMessageDocument,
  options?: {
    conversationId?: string;
    projectName?: string;
    locale?: SupportedLocale;
    titleOrigin?: ProjectConversationTitleOrigin;
  },
): ProjectConversationMessageResponse => {
  const localizedContent =
    options?.conversationId === DEFAULT_PROJECT_CONVERSATION_ID &&
    options?.titleOrigin === 'default' &&
    options.projectName &&
    message.id === DEFAULT_PROJECT_CONVERSATION_MESSAGE_ID &&
    message.role === 'assistant'
      ? (
          getMessage(
            'project.conversation.defaultIntro',
            options.locale ?? DEFAULT_LOCALE,
            {
              projectName: options.projectName,
            },
          ) ??
          getFallbackMessage('project.conversation.defaultIntro', {
            projectName: options.projectName,
          })
        )
      : message.content;

  return {
    id: message.id,
    conversationId,
    role: message.role,
    content: localizedContent,
    createdAt: message.createdAt.toISOString(),
    starred: Boolean(message.starredAt),
    starredAt: message.starredAt?.toISOString() ?? null,
    starredBy: message.starredBy ?? null,
    ...(message.sources !== undefined
      ? {
          sources: message.sources.map((source) =>
            toProjectConversationSourceResponse(source),
          ),
        }
      : {}),
  };
};

export const toProjectConversationSummaryResponse = (
  projectId: string,
  projectName: string,
  conversation: ProjectConversationDocument,
  locale: SupportedLocale = DEFAULT_LOCALE,
): ProjectConversationSummaryResponse => {
  return {
    id: conversation.id,
    projectId,
    title: resolveProjectConversationTitle(projectName, conversation, locale),
    updatedAt: conversation.updatedAt.toISOString(),
    preview: getConversationPreview(projectName, conversation, locale),
  };
};

export const toProjectConversationDetailResponse = (
  projectId: string,
  projectName: string,
  conversation: ProjectConversationDocument,
  locale: SupportedLocale = DEFAULT_LOCALE,
): ProjectConversationDetailResponse => {
  return {
    ...toProjectConversationSummaryResponse(
      projectId,
      projectName,
      conversation,
      locale,
    ),
    messages: conversation.messages.map((message) =>
      toProjectConversationMessageResponse(conversation.id, message, {
        conversationId: conversation.id,
        projectName,
        locale,
        titleOrigin: conversation.titleOrigin,
      }),
    ),
  };
};

export const toProjectResponse = (
  project: WithId<ProjectDocument>,
  actorId: string,
  memberProfileMap: ProjectMemberProfileMap,
  locale: SupportedLocale = DEFAULT_LOCALE,
): ProjectResponse => {
  const actorMember = getProjectMember(project, actorId);
  if (!actorMember) {
    throw new Error('Current actor is not a member of the project');
  }

  return {
    id: project._id.toHexString(),
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    members: project.members.map((projectMember) => {
      const profile =
        memberProfileMap.get(projectMember.userId) ??
        createUnknownMemberProfile(projectMember.userId, locale);

      return {
        userId: projectMember.userId,
        username: profile.username,
        name: profile.name,
        role: projectMember.role,
        joinedAt: projectMember.joinedAt.toISOString(),
      };
    }),
    ...getProjectResourceBinding(project),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    currentUserRole: actorMember.role,
  };
};
