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

export type ProjectSectionKey = 'overview' | 'chat' | 'resources' | 'members';

export type ProjectResourceFocus = 'knowledge' | 'skills' | 'agents';

export interface GlobalCatalogOption {
  value: string;
  label: string;
}

export interface GlobalAssetItem {
  id: string;
  type: ProjectResourceFocus;
  name: string;
  description: string;
  updatedAt: string;
  owner: string;
  usageCount: number;
}

export interface ProjectResourceItem extends GlobalAssetItem {
  source: 'global';
}

export interface ProjectResourceGroup {
  key: ProjectResourceFocus;
  title: string;
  description: string;
  items: ProjectResourceItem[];
}

export interface ProjectOverviewStats {
  activeMembers: number;
  conversationCount: number;
  knowledgeCount: number;
  agentCount: number;
  skillCount: number;
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
