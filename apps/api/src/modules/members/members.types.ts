import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import type { ProjectRole } from '@modules/projects/projects.types.js';

export interface MemberVisibleProjectResponse {
  id: string;
  name: string;
  description: string;
  role: ProjectRole;
  joinedAt: string;
  updatedAt: string;
}

export interface MemberOverviewResponseItem {
  id: string;
  username: string;
  name: string;
  firstCollaborationAt: string | null;
  lastProjectActivityAt: string | null;
  visibleProjectCount: number;
  adminProjectCount: number;
  memberProjectCount: number;
  visibleProjects: MemberVisibleProjectResponse[];
}

export interface MembersOverviewResponse {
  total: number;
  items: MemberOverviewResponseItem[];
}

export interface MembersCommandContext {
  actor: AuthenticatedRequestUser;
}
