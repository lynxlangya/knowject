import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  createProjectSummary,
  loadProjects,
  saveProjects,
} from './project.storage';
import type { AddProjectResult, ProjectSummary } from './project.types';

interface ProjectContextValue {
  projects: ProjectSummary[];
  addProject: (name: string) => AddProjectResult;
  getProjectById: (projectId: string) => ProjectSummary | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export interface ProjectProviderProps {
  children: React.ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [projects, setProjects] = useState<ProjectSummary[]>(() =>
    loadProjects(),
  );

  const addProject = useCallback(
    (name: string): AddProjectResult => {
      const nextName = name.trim();
      if (!nextName) {
        return 'empty';
      }

      const exists = projects.some(
        (project) => project.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (exists) {
        return 'duplicate';
      }

      const nextProject = createProjectSummary(nextName);
      const nextProjects = [nextProject, ...projects];
      setProjects(nextProjects);
      saveProjects(nextProjects);
      return 'added';
    },
    [projects],
  );

  const getProjectById = useCallback(
    (projectId: string): ProjectSummary | null => {
      return projects.find((item) => item.id === projectId) ?? null;
    },
    [projects],
  );

  const value = useMemo<ProjectContextValue>(() => {
    return {
      projects,
      addProject,
      getProjectById,
    };
  }, [projects, addProject, getProjectById]);

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

export const useProjectContext = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext 必须在 ProjectProvider 内使用');
  }

  return context;
};
