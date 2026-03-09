import { createContext } from 'react';
import type {
  AddProjectResult,
  CreateProjectInput,
  DeleteProjectResult,
  ProjectSummary,
  ToggleProjectPinResult,
  UpdateProjectInput,
  UpdateProjectResult,
} from './project.types';

export interface ProjectContextValue {
  projects: ProjectSummary[];
  addProject: (input: CreateProjectInput) => AddProjectResult;
  updateProject: (input: UpdateProjectInput) => UpdateProjectResult;
  toggleProjectPin: (projectId: string) => ToggleProjectPinResult;
  deleteProject: (projectId: string) => DeleteProjectResult;
  getProjectById: (projectId: string) => ProjectSummary | null;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);
