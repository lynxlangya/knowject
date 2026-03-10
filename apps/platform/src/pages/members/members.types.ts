import type { MemberOverviewResponseItem } from '@api/members';
import type { ProjectRole } from '@api/projects';
import type {
  GlobalAssetItem,
  ProjectMemberRecentActivity,
  ProjectMemberRole,
  ProjectMemberStatus,
} from '@app/project/project.types';

export type MemberSortKey = 'activity' | 'projects' | 'joined';
export type MemberAdminFilter = 'all' | 'admin' | 'member';
export type MemberStatusFilter = ProjectMemberStatus | 'all';

export interface MemberFiltersState {
  query: string;
  status: MemberStatusFilter;
  adminScope: MemberAdminFilter;
  projectId: string;
  sortBy: MemberSortKey;
}

export interface MemberProjectViewModel {
  id: string;
  name: string;
  description: string;
  projectRole: ProjectRole;
  joinedAt: string;
  updatedAt: string;
  knowledgeCount: number;
  skillCount: number;
  agentCount: number;
  collaborationRole: ProjectMemberRole | null;
  status: ProjectMemberStatus;
  focusSummary: string;
  responsibilityTags: string[];
  recentActivity: ProjectMemberRecentActivity | null;
}

export interface MemberAssetSummary {
  knowledge: GlobalAssetItem[];
  skills: GlobalAssetItem[];
  agents: GlobalAssetItem[];
}

export interface MemberViewModel extends MemberOverviewResponseItem {
  avatarUrl?: string;
  isCurrentUser: boolean;
  primaryStatus: ProjectMemberStatus;
  primaryRole: ProjectMemberRole | null;
  focusSummary: string;
  responsibilityTags: string[];
  recentActivity: ProjectMemberRecentActivity | null;
  activeProjectCount: number;
  syncingProjectCount: number;
  blockedProjectCount: number;
  idleProjectCount: number;
  projects: MemberProjectViewModel[];
  assets: MemberAssetSummary;
}
