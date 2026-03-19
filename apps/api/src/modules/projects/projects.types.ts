import type { ObjectId } from 'mongodb';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export type ProjectRole = 'admin' | 'member';
export type ProjectConversationMessageRole = 'user' | 'assistant';
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

export interface ProjectResourceBindingDocument {
  knowledgeBaseIds: string[];
  agentIds: string[];
  skillIds: string[];
}

export interface ProjectMemberDocument {
  userId: string;
  role: ProjectRole;
  joinedAt: Date;
}

export interface ProjectConversationMessageDocument {
  id: string;
  role: ProjectConversationMessageRole;
  content: string;
  createdAt: Date;
  clientRequestId?: string;
  sources?: ProjectConversationSourceDocument[];
}

export interface ProjectConversationSourceDocument {
  knowledgeId: string;
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  source: string;
  snippet: string;
  distance: number | null;
}

export interface ProjectConversationDocument {
  id: string;
  title: string;
  messages: ProjectConversationMessageDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDocument {
  _id?: ObjectId;
  name: string;
  description: string;
  ownerId: string;
  members: ProjectMemberDocument[];
  knowledgeBaseIds: string[];
  agentIds: string[];
  skillIds: string[];
  conversations: ProjectConversationDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name?: unknown;
  description?: unknown;
  knowledgeBaseIds?: unknown;
  agentIds?: unknown;
  skillIds?: unknown;
}

export interface CreateProjectConversationInput {
  title?: unknown;
}

export interface UpdateProjectConversationInput {
  title?: unknown;
}

export interface CreateProjectConversationMessageInput {
  content?: unknown;
  clientRequestId?: unknown;
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

export interface ProjectConversationStreamOptions {
  signal?: AbortSignal;
  onEvent(event: ProjectConversationStreamEvent): Promise<void> | void;
}

export interface UpdateProjectInput {
  name?: unknown;
  description?: unknown;
  knowledgeBaseIds?: unknown;
  agentIds?: unknown;
  skillIds?: unknown;
}

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

export interface ProjectsListResponse {
  total: number;
  items: ProjectResponse[];
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

export interface ProjectConversationMessageResponse {
  id: string;
  conversationId: string;
  role: ProjectConversationMessageRole;
  content: string;
  createdAt: string;
  sources?: ProjectConversationSourceResponse[];
}

export interface ProjectConversationSourceResponse {
  knowledgeId: string;
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  source: string;
  snippet: string;
  distance: number | null;
}

export interface ProjectConversationDetailResponse
  extends ProjectConversationSummaryResponse {
  messages: ProjectConversationMessageResponse[];
}

export interface ProjectConversationDetailEnvelope {
  conversation: ProjectConversationDetailResponse;
}

export interface ProjectCommandContext {
  actor: AuthenticatedRequestUser;
}
