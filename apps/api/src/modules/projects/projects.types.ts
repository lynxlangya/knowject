import type { ObjectId } from 'mongodb';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export type ProjectRole = 'admin' | 'member';

export interface ProjectMemberDocument {
  userId: string;
  role: ProjectRole;
  joinedAt: Date;
}

export interface ProjectDocument {
  _id?: ObjectId;
  name: string;
  description: string;
  ownerId: string;
  members: ProjectMemberDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name?: unknown;
  description?: unknown;
}

export interface UpdateProjectInput {
  name?: unknown;
  description?: unknown;
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
  createdAt: string;
  updatedAt: string;
  currentUserRole: ProjectRole;
}

export interface ProjectsListResponse {
  total: number;
  items: ProjectResponse[];
}

export interface ProjectCommandContext {
  actor: AuthenticatedRequestUser;
}
