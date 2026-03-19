import {
  unwrapApiData,
  type ApiEnvelope,
} from '@knowject/request';
import { client } from "./client";

export type ProjectRole = "admin" | "member";

export interface ProjectMemberResponse {
  userId: string;
  username: string;
  name: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: ProjectMemberResponse[];
  knowledgeBaseIds: string[];
  agentIds: string[];
  skillIds: string[];
  createdAt: string;
  updatedAt: string;
  currentUserRole: ProjectRole;
}

export interface ProjectConversationSummaryResponse {
  id: string;
  projectId: string;
  title: string;
  updatedAt: string;
  preview: string;
}

export interface ProjectConversationListResponse {
  total: number;
  items: ProjectConversationSummaryResponse[];
}

export type ProjectConversationMessageRole = "user" | "assistant";
export type ProjectConversationStreamEventType =
  | 'ack'
  | 'delta'
  | 'done'
  | 'error';
export type ProjectConversationStreamFinishReason =
  | 'stop'
  | 'length'
  | 'cancelled'
  | 'unknown';

export interface ProjectConversationSourceResponse {
  knowledgeId: string;
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  source: string;
  snippet: string;
  distance: number | null;
}

export interface ProjectConversationMessageResponse {
  id: string;
  conversationId: string;
  role: ProjectConversationMessageRole;
  content: string;
  createdAt: string;
  sources?: ProjectConversationSourceResponse[];
}

export interface ProjectConversationDetailResponse
  extends ProjectConversationSummaryResponse {
  messages: ProjectConversationMessageResponse[];
}

export interface ProjectConversationDetailEnvelope {
  conversation: ProjectConversationDetailResponse;
}

export interface CreateProjectConversationRequest {
  title?: string;
}

export interface UpdateProjectConversationRequest {
  title: string;
}

export interface CreateProjectConversationMessageRequest {
  content: string;
  clientRequestId?: string;
}

export interface ProjectConversationStreamEventBase {
  version: 'v1';
  type: ProjectConversationStreamEventType;
  sequence: number;
  conversationId: string;
  clientRequestId: string;
}

export interface ProjectConversationStreamAckEvent
  extends ProjectConversationStreamEventBase {
  type: 'ack';
  userMessageId: string;
  userMessagePersisted: boolean;
}

export interface ProjectConversationStreamDeltaEvent
  extends ProjectConversationStreamEventBase {
  type: 'delta';
  delta: string;
}

export interface ProjectConversationStreamDoneEvent
  extends ProjectConversationStreamEventBase {
  type: 'done';
  assistantMessageId: string;
  assistantMessagePersisted: true;
  finishReason: ProjectConversationStreamFinishReason;
}

export interface ProjectConversationStreamErrorEvent
  extends ProjectConversationStreamEventBase {
  type: 'error';
  code: string;
  message: string;
  retryable: boolean;
}

export type ProjectConversationStreamEvent =
  | ProjectConversationStreamAckEvent
  | ProjectConversationStreamDeltaEvent
  | ProjectConversationStreamDoneEvent
  | ProjectConversationStreamErrorEvent;

const PROJECT_CHAT_MESSAGE_TIMEOUT_MS = 30000;

export interface ProjectsListResponse {
  total: number;
  items: ProjectResponse[];
}

export interface AddProjectMemberRequest {
  username: string;
  role: ProjectRole;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  knowledgeBaseIds?: string[];
  agentIds?: string[];
  skillIds?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  knowledgeBaseIds?: string[];
  agentIds?: string[];
  skillIds?: string[];
}

export interface UpdateProjectMemberRequest {
  role: ProjectRole;
}

export interface ProjectMutationResponse {
  project: ProjectResponse;
}

export interface RemoveProjectMemberResponse {
  project: ProjectResponse | null;
  removedCurrentUser: boolean;
}

export interface SearchProjectMemberCandidatesResponseItem {
  id: string;
  username: string;
  name: string;
}

export interface SearchProjectMemberCandidatesResponse {
  total: number;
  items: SearchProjectMemberCandidatesResponseItem[];
}

export const listProjects = async (): Promise<ProjectsListResponse> => {
  const response = await client.get<ApiEnvelope<ProjectsListResponse>>("/projects");
  return unwrapApiData(response.data);
};

export const searchProjectMemberCandidates = async (
  query: string,
): Promise<SearchProjectMemberCandidatesResponse> => {
  const response = await client.get<ApiEnvelope<SearchProjectMemberCandidatesResponse>>(
    "/auth/users",
    {
      params: {
        query,
        limit: 10,
      },
    },
  );

  return unwrapApiData(response.data);
};

export const createProject = async (
  payload: CreateProjectRequest,
): Promise<ProjectMutationResponse> => {
  const response = await client.post<ApiEnvelope<ProjectMutationResponse>>(
    "/projects",
    payload,
  );
  return unwrapApiData(response.data);
};

export const listProjectConversations = async (
  projectId: string,
): Promise<ProjectConversationListResponse> => {
  const response = await client.get<ApiEnvelope<ProjectConversationListResponse>>(
    `/projects/${encodeURIComponent(projectId)}/conversations`,
  );

  return unwrapApiData(response.data);
};

export const createProjectConversation = async (
  projectId: string,
  payload: CreateProjectConversationRequest = {},
): Promise<ProjectConversationDetailEnvelope> => {
  const response = await client.post<ApiEnvelope<ProjectConversationDetailEnvelope>>(
    `/projects/${encodeURIComponent(projectId)}/conversations`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const getProjectConversationDetail = async (
  projectId: string,
  conversationId: string,
): Promise<ProjectConversationDetailEnvelope> => {
  const response = await client.get<ApiEnvelope<ProjectConversationDetailEnvelope>>(
    `/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(
      conversationId,
    )}`,
  );

  return unwrapApiData(response.data);
};

export const updateProjectConversation = async (
  projectId: string,
  conversationId: string,
  payload: UpdateProjectConversationRequest,
): Promise<ProjectConversationDetailEnvelope> => {
  const response = await client.patch<ApiEnvelope<ProjectConversationDetailEnvelope>>(
    `/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(
      conversationId,
    )}`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const createProjectConversationMessage = async (
  projectId: string,
  conversationId: string,
  payload: CreateProjectConversationMessageRequest,
): Promise<ProjectConversationDetailEnvelope> => {
  const response = await client.post<ApiEnvelope<ProjectConversationDetailEnvelope>>(
    `/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(
      conversationId,
    )}/messages`,
    payload,
    {
      timeout: PROJECT_CHAT_MESSAGE_TIMEOUT_MS,
    },
  );

  return unwrapApiData(response.data);
};

export const deleteProjectConversation = async (
  projectId: string,
  conversationId: string,
): Promise<void> => {
  const response = await client.delete<ApiEnvelope<null>>(
    `/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(
      conversationId,
    )}`,
  );

  unwrapApiData(response.data);
};

export const updateProject = async (
  projectId: string,
  payload: UpdateProjectRequest,
): Promise<ProjectMutationResponse> => {
  const response = await client.patch<ApiEnvelope<ProjectMutationResponse>>(
    `/projects/${encodeURIComponent(projectId)}`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const response = await client.delete<ApiEnvelope<null>>(`/projects/${encodeURIComponent(projectId)}`);
  unwrapApiData(response.data);
};

export const addProjectMember = async (
  projectId: string,
  payload: AddProjectMemberRequest,
): Promise<ProjectMutationResponse> => {
  const response = await client.post<ApiEnvelope<ProjectMutationResponse>>(
    `/projects/${encodeURIComponent(projectId)}/members`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const updateProjectMemberRole = async (
  projectId: string,
  userId: string,
  payload: UpdateProjectMemberRequest,
): Promise<ProjectMutationResponse> => {
  const response = await client.patch<ApiEnvelope<ProjectMutationResponse>>(
    `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
    payload,
  );

  return unwrapApiData(response.data);
};

export const removeProjectMember = async (
  projectId: string,
  userId: string,
): Promise<RemoveProjectMemberResponse> => {
  const response = await client.delete<ApiEnvelope<RemoveProjectMemberResponse>>(
    `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
  );

  return unwrapApiData(response.data);
};
