import type {
  KnowledgeIndexStatus,
  KnowledgeScope,
} from '@api/knowledge';

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: ProjectRosterMember[];
  createdAt: string;
  updatedAt: string;
  currentUserRole: ProjectRole;
  isPinned: boolean;
  knowledgeBaseIds: string[];
  agentIds: string[];
  skillIds: string[];
}

export type ProjectRole = "admin" | "member";

export interface ProjectRosterMember {
  userId: string;
  username: string;
  name: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface ConversationSummary {
  id: string;
  projectId: string;
  title: string;
  updatedAt: string;
  preview: string;
}

export interface MemberProfile {
  id: string;
  name: string;
  avatarUrl?: string;
}

export type ProjectMemberRole =
  | "owner"
  | "product"
  | "design"
  | "frontend"
  | "backend"
  | "marketing";

export type ProjectMemberStatus = "active" | "syncing" | "blocked" | "idle";

export type ProjectMemberActivityType =
  | "conversation"
  | "resource"
  | "delivery"
  | "review";

export interface ProjectMemberRecentActivity {
  type: ProjectMemberActivityType;
  summary: string;
  occurredAt: string;
  displayTime: string;
}

export interface ProjectMember extends MemberProfile {
  isActive: boolean;
  role: ProjectMemberRole;
  status: ProjectMemberStatus;
  responsibilityTags: string[];
  focusSummary: string;
  recentActivity: ProjectMemberRecentActivity;
}

export type ProjectSectionKey = "overview" | "chat" | "resources" | "members";

export type ProjectResourceFocus = "knowledge" | "skills" | "agents";

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
  source: KnowledgeScope;
  documentCount?: number;
  indexStatus?: KnowledgeIndexStatus;
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

export interface ProjectWorkspaceMeta {
  iconUrl: string;
  summary: string;
}

export interface ProjectWorkspaceSnapshot {
  members: ProjectMember[];
  meta: ProjectWorkspaceMeta;
  stats: ProjectOverviewStats;
}

export interface ProjectResourceBinding {
  knowledgeBaseIds: string[];
  agentIds: string[];
  skillIds: string[];
}

export interface CreateProjectInput extends ProjectResourceBinding {
  name: string;
  description: string;
}

export interface UpdateProjectInput extends CreateProjectInput {
  projectId: string;
}

export interface UpdateProjectResourceBindingsInput {
  projectId: string;
  knowledgeBaseIds?: string[];
  agentIds?: string[];
  skillIds?: string[];
}

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export type AddProjectResult = "added" | "empty" | "duplicate";
export type UpdateProjectResult =
  | "updated"
  | "empty"
  | "duplicate"
  | "not_found";
export type ToggleProjectPinResult = "pinned" | "unpinned" | "not_found";
export type DeleteProjectResult = "deleted" | "not_found";
