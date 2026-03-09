import { createContext } from 'react';
import type {
  AddProjectResult,
  CreateProjectInput,
  ProjectSummary,
} from './project.types';

export interface ProjectContextValue {
  projects: ProjectSummary[];
  addProject: (input: CreateProjectInput) => AddProjectResult;
  getProjectById: (projectId: string) => ProjectSummary | null;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);
