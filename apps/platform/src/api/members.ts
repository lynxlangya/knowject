import {
  unwrapApiData,
  type ApiEnvelope,
} from '@knowject/request';
import { client } from './client';
import type { ProjectRole } from './projects';

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

export const getMembersOverview = async (): Promise<MembersOverviewResponse> => {
  const response = await client.get<ApiEnvelope<MembersOverviewResponse>>('/members');
  return unwrapApiData(response.data);
};
