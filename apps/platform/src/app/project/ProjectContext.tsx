import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createProjectSummary,
  loadProjects,
  saveProjects,
} from './project.storage';
import {
  normalizeProjectDescription,
  orderProjectsForDisplay,
} from './project.helpers';
import type {
  AddProjectResult,
  CreateProjectInput,
  DeleteProjectResult,
  ProjectSummary,
  ToggleProjectPinResult,
  UpdateProjectInput,
  UpdateProjectResult,
} from './project.types';
import { ProjectContext } from './projectContext.shared';
import type { ProjectContextValue } from './projectContext.shared';

export interface ProjectProviderProps {
  children: React.ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [projects, setProjects] = useState<ProjectSummary[]>(loadProjects);
  const projectsRef = useRef(projects);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const commitProjects = useCallback((nextProjects: ProjectSummary[]) => {
    const orderedProjects = orderProjectsForDisplay(nextProjects);
    projectsRef.current = orderedProjects;
    saveProjects(orderedProjects);
    setProjects(() => orderedProjects);
  }, []);

  const addProject = useCallback(
    (input: CreateProjectInput): AddProjectResult => {
      const nextName = input.name.trim();
      const nextDescription = normalizeProjectDescription(input.description);
      if (!nextName) {
        return 'empty';
      }

      const currentProjects = projectsRef.current;
      const exists = currentProjects.some(
        (project) => project.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (exists) {
        return 'duplicate';
      }

      const nextProject = createProjectSummary({
        ...input,
        description: nextDescription,
        name: nextName,
      });
      const pinnedProjects = currentProjects.filter((project) => project.isPinned);
      const regularProjects = currentProjects.filter((project) => !project.isPinned);
      const nextProjects = [...pinnedProjects, nextProject, ...regularProjects];
      commitProjects(nextProjects);
      return 'added';
    },
    [commitProjects],
  );

  const updateProject = useCallback(
    (input: UpdateProjectInput): UpdateProjectResult => {
      const nextName = input.name.trim();
      const nextDescription = normalizeProjectDescription(input.description);
      if (!nextName) {
        return 'empty';
      }

      const currentProjects = projectsRef.current;
      const currentProject = currentProjects.find((project) => project.id === input.projectId);
      if (!currentProject) {
        return 'not_found';
      }

      const exists = currentProjects.some(
        (project) =>
          project.id !== input.projectId &&
          project.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (exists) {
        return 'duplicate';
      }

      const nextProjects = currentProjects.map((project) => {
        if (project.id !== input.projectId) {
          return project;
        }

        return {
          ...project,
          name: nextName,
          description: nextDescription,
          knowledgeBaseIds: input.knowledgeBaseIds,
          memberIds: input.memberIds,
          agentIds: input.agentIds,
          skillIds: input.skillIds,
        };
      });

      commitProjects(nextProjects);
      return 'updated';
    },
    [commitProjects],
  );

  const toggleProjectPin = useCallback(
    (projectId: string): ToggleProjectPinResult => {
      const currentProjects = projectsRef.current;
      const targetProject = currentProjects.find((project) => project.id === projectId);
      if (!targetProject) {
        return 'not_found';
      }

      const remainingProjects = currentProjects.filter((project) => project.id !== projectId);
      if (targetProject.isPinned) {
        const pinnedProjects = remainingProjects.filter((project) => project.isPinned);
        const regularProjects = remainingProjects.filter((project) => !project.isPinned);
        const nextProjects = [
          ...pinnedProjects,
          { ...targetProject, isPinned: false },
          ...regularProjects,
        ];
        commitProjects(nextProjects);
        return 'unpinned';
      }

      const nextProjects = [{ ...targetProject, isPinned: true }, ...remainingProjects];
      commitProjects(nextProjects);
      return 'pinned';
    },
    [commitProjects],
  );

  const deleteProject = useCallback(
    (projectId: string): DeleteProjectResult => {
      const currentProjects = projectsRef.current;
      if (!currentProjects.some((project) => project.id === projectId)) {
        return 'not_found';
      }

      const nextProjects = currentProjects.filter((project) => project.id !== projectId);
      commitProjects(nextProjects);
      return 'deleted';
    },
    [commitProjects],
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
      updateProject,
      toggleProjectPin,
      deleteProject,
      getProjectById,
    };
  }, [projects, addProject, updateProject, toggleProjectPin, deleteProject, getProjectById]);

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};
