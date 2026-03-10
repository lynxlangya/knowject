import { client } from "./client";

export type ProjectRole = "admin" | "member";

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

export interface AddProjectMemberRequest {
  username: string;
  role: ProjectRole;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface UpdateProjectMemberRequest {
  role: ProjectRole;
}

export interface ProjectMutationResponse {
  project: ProjectResponse;
}

export interface RemoveProjectMemberResponse {
  project: ProjectResponse | null;
  removedCurrentUser: boolean;
}

export interface SearchProjectMemberCandidatesResponseItem {
  id: string;
  username: string;
  name: string;
}

export interface SearchProjectMemberCandidatesResponse {
  total: number;
  items: SearchProjectMemberCandidatesResponseItem[];
}

export const listProjects = async (): Promise<ProjectsListResponse> => {
  const response = await client.get<ProjectsListResponse>("/projects");
  return response.data;
};

export const searchProjectMemberCandidates = async (
  query: string,
): Promise<SearchProjectMemberCandidatesResponse> => {
  const response = await client.get<SearchProjectMemberCandidatesResponse>(
    "/auth/users",
    {
      params: {
        query,
        limit: 10,
      },
    },
  );

  return response.data;
};

export const createProject = async (
  payload: CreateProjectRequest,
): Promise<ProjectMutationResponse> => {
  const response = await client.post<ProjectMutationResponse>(
    "/projects",
    payload,
  );
  return response.data;
};

export const updateProject = async (
  projectId: string,
  payload: UpdateProjectRequest,
): Promise<ProjectMutationResponse> => {
  const response = await client.patch<ProjectMutationResponse>(
    `/projects/${encodeURIComponent(projectId)}`,
    payload,
  );

  return response.data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await client.delete(`/projects/${encodeURIComponent(projectId)}`);
};

export const addProjectMember = async (
  projectId: string,
  payload: AddProjectMemberRequest,
): Promise<ProjectMutationResponse> => {
  const response = await client.post<ProjectMutationResponse>(
    `/projects/${encodeURIComponent(projectId)}/members`,
    payload,
  );

  return response.data;
};

export const updateProjectMemberRole = async (
  projectId: string,
  userId: string,
  payload: UpdateProjectMemberRequest,
): Promise<ProjectMutationResponse> => {
  const response = await client.patch<ProjectMutationResponse>(
    `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
    payload,
  );

  return response.data;
};

export const removeProjectMember = async (
  projectId: string,
  userId: string,
): Promise<RemoveProjectMemberResponse> => {
  const response = await client.delete<RemoveProjectMemberResponse>(
    `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
  );

  return response.data;
};
