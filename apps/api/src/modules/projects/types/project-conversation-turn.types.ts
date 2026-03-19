import type { WithId } from "mongodb";
import type { ProjectsRepository } from "../projects.repository.js";
import type { ProjectConversationRuntime } from "../project-conversation-runtime.js";
import type {
  CreateProjectConversationMessageInput,
  ProjectCommandContext,
  ProjectConversationDetailEnvelope,
  ProjectConversationDocument,
  ProjectConversationMessageDocument,
  ProjectConversationSourceDocument,
  ProjectConversationStreamEvent,
  ProjectConversationStreamOptions,
  ProjectDocument,
} from "../projects.types.js";

export interface ProjectConversationAssistantReply {
  content: string;
  sources: ProjectConversationSourceDocument[];
}

export interface PersistedProjectConversationAssistantReply {
  detail: ProjectConversationDetailEnvelope;
  assistantMessageId: string;
}

export interface PreparedProjectConversationReplayRestoreState {
  conversation: ProjectConversationDocument;
  replayUpdatedAt: Date;
}

export interface PreparedProjectConversationTurn {
  projectId: string;
  project: WithId<ProjectDocument>;
  conversationId: string;
  conversation: ProjectConversationDocument;
  userMessage: ProjectConversationMessageDocument;
  clientRequestId?: string;
  existingAssistantMessage: ProjectConversationMessageDocument | null;
  replayRestoreState?: PreparedProjectConversationReplayRestoreState;
}

export interface ProjectConversationTurnService {
  prepareTurn(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: CreateProjectConversationMessageInput,
    options?: {
      requireClientRequestId?: boolean;
    },
  ): Promise<PreparedProjectConversationTurn>;
  persistAssistantReply(
    preparedTurn: PreparedProjectConversationTurn,
    assistantReply: ProjectConversationAssistantReply,
  ): Promise<PersistedProjectConversationAssistantReply>;
  createSynchronousTurn(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: CreateProjectConversationMessageInput,
  ): Promise<ProjectConversationDetailEnvelope>;
  createStreamingTurn(
    context: ProjectCommandContext,
    projectId: string,
    conversationId: string,
    input: CreateProjectConversationMessageInput,
    options: ProjectConversationStreamOptions,
  ): Promise<void>;
}

export interface ProjectConversationTurnServiceDependencies {
  repository: ProjectsRepository;
  conversationRuntime?: ProjectConversationRuntime;
}

export interface ProjectConversationTurnPreparationOptions {
  requireClientRequestId?: boolean;
}

export interface ProjectConversationTurnInput {
  content: string;
  clientRequestId?: string;
  targetUserMessageId?: string;
}

export interface ProjectConversationRetryState {
  userMessage: ProjectConversationMessageDocument;
  assistantMessage: ProjectConversationMessageDocument | null;
}

export type ProjectConversationStreamEmission =
  | Omit<
      ProjectConversationStreamEvent,
      "version" | "sequence" | "conversationId" | "clientRequestId"
    >
  | ProjectConversationStreamEvent;
