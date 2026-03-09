import { useCallback, useMemo, useState } from 'react';
import {
  createProjectSummary,
  loadProjects,
  saveProjects,
} from './project.storage';
import type { AddProjectResult, CreateProjectInput, ProjectSummary } from './project.types';
import { ProjectContext } from './projectContext.shared';
import type { ProjectContextValue } from './projectContext.shared';

export interface ProjectProviderProps {
  children: React.ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [projects, setProjects] = useState<ProjectSummary[]>(() =>
    loadProjects(),
  );

  const addProject = useCallback(
    (input: CreateProjectInput): AddProjectResult => {
      const nextName = input.name.trim();
      if (!nextName) {
        return 'empty';
      }

      const exists = projects.some(
        (project) => project.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (exists) {
        return 'duplicate';
      }

      const nextProject = createProjectSummary({
        ...input,
        name: nextName,
      });
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
