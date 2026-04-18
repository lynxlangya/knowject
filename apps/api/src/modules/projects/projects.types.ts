import type { ObjectId } from 'mongodb';
import type { SupportedLocale } from '@lib/locale.js';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export type ProjectRole = 'admin' | 'member';
export type ProjectConversationMessageRole = 'user' | 'assistant';
export type ProjectConversationTitleOrigin = 'default' | 'auto' | 'manual';
export type ProjectConversationStreamEventType =
  | 'ack'
  | 'sources_seed'
  | 'delta'
  | 'done'
  | 'error'
  | 'citation_patch';
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
  citationContent?: ProjectConversationCitationContent;
  starredAt?: Date;
  starredBy?: string;
}

export interface ProjectConversationSourceDocument {
  id?: string;
  sourceKey?: string;
  retrievalIndex?: number;
  knowledgeId: string;
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  source: string;
  snippet: string;
  distance: number | null;
}

export interface ProjectConversationCitationSentence {
  id: string;
  text: string;
  sourceIds: string[];
  grounded: boolean;
}

export interface ProjectConversationCitationContent {
  version: 1;
  sentences: ProjectConversationCitationSentence[];
}

export interface ProjectConversationDocument {
  id: string;
  title: string;
  titleOrigin?: ProjectConversationTitleOrigin;
  messages: ProjectConversationMessageDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectConversationCollectionDocument
  extends ProjectConversationDocument {
  _id?: ObjectId;
  projectId: string;
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
  targetUserMessageId?: unknown;
  skillId?: unknown;
}

export interface UpdateProjectConversationMessageMetadataInput {
  starred?: unknown;
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

export interface ProjectConversationStreamSeedSource {
  id: string;
  sourceKey: string;
  knowledgeId: string;
  documentId: string;
  sourceLabel: string;
  status: 'seeded';
}

export interface ProjectConversationStreamSourcesSeedEvent
  extends ProjectConversationStreamEventBase {
  type: 'sources_seed';
  sources: ProjectConversationStreamSeedSource[];
}

export interface ProjectConversationStreamDoneEvent
  extends ProjectConversationStreamEventBase {
  type: 'done';
  assistantMessageId: string;
  assistantMessagePersisted: true;
  finishReason: ProjectConversationStreamFinishReason;
  assistantMessage: ProjectConversationMessageResponse;
  conversationSummary: ProjectConversationSummaryResponse;
}

export interface ProjectConversationStreamCitationPatchEvent
  extends ProjectConversationStreamEventBase {
  type: 'citation_patch';
  assistantMessageId: string;
  citationContent: ProjectConversationCitationContent;
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
  | ProjectConversationStreamSourcesSeedEvent
  | ProjectConversationStreamDeltaEvent
  | ProjectConversationStreamDoneEvent
  | ProjectConversationStreamCitationPatchEvent
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
  starred: boolean;
  starredAt?: string | null;
  starredBy?: string | null;
  sources?: ProjectConversationSourceResponse[];
  citationContent?: ProjectConversationCitationContent;
}

export interface ProjectConversationSourceResponse {
  id: string;
  sourceKey: string;
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

export interface ProjectConversationMessageEnvelope {
  message: ProjectConversationMessageResponse;
}

export interface ProjectCommandContext {
  actor: AuthenticatedRequestUser;
  locale?: SupportedLocale;
}
