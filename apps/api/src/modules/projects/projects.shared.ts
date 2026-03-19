import { randomUUID } from 'node:crypto';
import type { WithId } from 'mongodb';
import { AppError } from '@lib/app-error.js';
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

const createUnknownMemberProfile = (userId: string): AuthUserProfile => {
  return {
    id: userId,
    username: 'unknown',
    name: '未知成员',
  };
};

export const createProjectNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'PROJECT_NOT_FOUND',
    message: '项目不存在或当前用户不可见',
  });
};

export const createProjectForbiddenError = (): AppError => {
  return new AppError({
    statusCode: 403,
    code: 'PROJECT_FORBIDDEN',
    message: '当前用户没有该项目的管理权限',
  });
};

export const createProjectConversationNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: 'PROJECT_CONVERSATION_NOT_FOUND',
    message: '项目对话不存在',
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

  return [
    {
      id: 'msg-default-assistant',
      role: 'assistant',
      content: `这里是「${projectName}」的项目对话入口。当前已经切到正式后端读链路，后续会在这里接入真实消息写入、知识检索与上下文沉淀。`,
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

  return {
    id: 'chat-default',
    title: buildDefaultProjectConversationTitle(project.name),
    titleOrigin: 'default',
    messages: buildDefaultConversationMessages(project.name),
    createdAt: now,
    updatedAt: now,
  };
};

export const buildDefaultProjectConversationTitle = (
  projectName: string,
): string => {
  return `${projectName} 项目上下文`;
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

const getConversationPreview = (
  conversation: ProjectConversationDocument,
): string => {
  const latestMessage =
    conversation.messages[conversation.messages.length - 1] ?? null;

  if (!latestMessage) {
    return '当前对话暂无消息。';
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

const toProjectConversationMessageResponse = (
  conversationId: string,
  message: ProjectConversationMessageDocument,
): ProjectConversationMessageResponse => {
  return {
    id: message.id,
    conversationId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
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
  conversation: ProjectConversationDocument,
): ProjectConversationSummaryResponse => {
  return {
    id: conversation.id,
    projectId,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    preview: getConversationPreview(conversation),
  };
};

export const toProjectConversationDetailResponse = (
  projectId: string,
  conversation: ProjectConversationDocument,
): ProjectConversationDetailResponse => {
  return {
    ...toProjectConversationSummaryResponse(projectId, conversation),
    messages: conversation.messages.map((message) =>
      toProjectConversationMessageResponse(conversation.id, message),
    ),
  };
};

export const toProjectResponse = (
  project: WithId<ProjectDocument>,
  actorId: string,
  memberProfileMap: ProjectMemberProfileMap,
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
        createUnknownMemberProfile(projectMember.userId);

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
