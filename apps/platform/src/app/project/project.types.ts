export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  knowledgeBaseIds: string[];
  memberIds: string[];
  agentIds: string[];
  skillIds: string[];
}

export interface ConversationSummary {
  id: string;
  projectId: string;
  title: string;
  updatedAt: string;
  preview: string;
}

export interface ProjectMember {
  id: string;
  name: string;
  avatarUrl: string;
  isActive: boolean;
}

export type ProjectTabKey = 'chat' | 'knowledge' | 'members' | 'agents' | 'skills';

export interface ProjectWorkspaceSectionItem {
  id: string;
  title: string;
  description: string;
  updatedAt?: string;
}

export interface CreateProjectInput {
  name: string;
  knowledgeBaseIds: string[];
  memberIds: string[];
  agentIds: string[];
  skillIds: string[];
}

export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export type AddProjectResult = 'added' | 'empty' | 'duplicate';
