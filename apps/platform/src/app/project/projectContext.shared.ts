import { createContext } from "react";
import type { ProjectResponse } from "@api/projects";
import type {
  AddProjectResult,
  CreateProjectInput,
  DeleteProjectResult,
  ProjectSummary,
  ToggleProjectPinResult,
  UpdateProjectInput,
  UpdateProjectResult,
} from "./project.types";

export interface ProjectContextValue {
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
  addProject: (input: CreateProjectInput) => Promise<AddProjectResult>;
  updateProject: (input: UpdateProjectInput) => Promise<UpdateProjectResult>;
  toggleProjectPin: (projectId: string) => ToggleProjectPinResult;
  deleteProject: (projectId: string) => Promise<DeleteProjectResult>;
  removeProjectSnapshot: (projectId: string) => void;
  getProjectById: (projectId: string) => ProjectSummary | null;
  refreshProjects: () => Promise<void>;
  syncProject: (project: ProjectResponse) => void;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);
