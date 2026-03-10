import type { ProjectResponse } from "@modules/projects/projects.types.js";

export interface AddProjectMemberInput {
  username?: unknown;
  role?: unknown;
}

export interface UpdateProjectMemberInput {
  role?: unknown;
}

export interface ProjectMembershipMutationResponse {
  project: ProjectResponse;
}

export interface ProjectMemberRemovalResponse {
  project: ProjectResponse | null;
  removedCurrentUser: boolean;
}
