import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  listProjects,
  updateProject as updateProjectRequest,
  type ProjectResponse,
} from "@api/projects";
import {
  clearLegacyProjectsAfterMigration,
  isProjectResourceBindingEmpty,
  loadLegacyProjectsForMigration,
  loadPinnedProjectIds,
  loadProjectResourceBindings,
  prunePinnedProjectIds,
  savePinnedProjectIds,
  saveProjectResourceBindings,
} from "./project.storage";
import {
  normalizeProjectDescription,
  orderProjectsForDisplay,
} from "./project.helpers";
import type {
  AddProjectResult,
  CreateProjectInput,
  DeleteProjectResult,
  ProjectResourceBinding,
  ProjectSummary,
  ToggleProjectPinResult,
  UpdateProjectInput,
  UpdateProjectResult,
} from "./project.types";
import { ProjectContext } from "./projectContext.shared";
import type { ProjectContextValue } from "./projectContext.shared";

export interface ProjectProviderProps {
  children: React.ReactNode;
}

const normalizeProjectNameKey = (value: string): string => {
  return value.trim().toLowerCase();
};

const normalizeBindingIds = (values: string[]): string[] => {
  return Array.from(new Set(values.filter(Boolean)));
};

const toProjectResourceBinding = (
  input: Pick<CreateProjectInput, "knowledgeBaseIds" | "agentIds" | "skillIds">,
): ProjectResourceBinding => {
  return {
    knowledgeBaseIds: normalizeBindingIds(input.knowledgeBaseIds),
    agentIds: normalizeBindingIds(input.agentIds),
    skillIds: normalizeBindingIds(input.skillIds),
  };
};

const getResponseProjectResourceBinding = (
  project: Pick<ProjectResponse, "knowledgeBaseIds" | "agentIds" | "skillIds">,
): ProjectResourceBinding => {
  return {
    knowledgeBaseIds: normalizeBindingIds(project.knowledgeBaseIds),
    agentIds: normalizeBindingIds(project.agentIds),
    skillIds: normalizeBindingIds(project.skillIds),
  };
};

const mergeProjectResourceBinding = (
  ...bindings: ProjectResourceBinding[]
): ProjectResourceBinding => {
  return {
    knowledgeBaseIds: normalizeBindingIds(
      bindings.flatMap((binding) => binding.knowledgeBaseIds),
    ),
    agentIds: normalizeBindingIds(
      bindings.flatMap((binding) => binding.agentIds),
    ),
    skillIds: normalizeBindingIds(
      bindings.flatMap((binding) => binding.skillIds),
    ),
  };
};

const hasSameBindingIds = (left: string[], right: string[]): boolean => {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
};

const hasSameProjectResourceBinding = (
  left: ProjectResourceBinding,
  right: ProjectResourceBinding,
): boolean => {
  return (
    hasSameBindingIds(left.knowledgeBaseIds, right.knowledgeBaseIds) &&
    hasSameBindingIds(left.agentIds, right.agentIds) &&
    hasSameBindingIds(left.skillIds, right.skillIds)
  );
};

const applyResourceBindingToProject = (
  project: ProjectResponse,
  binding: ProjectResourceBinding,
): ProjectResponse => {
  return {
    ...project,
    ...binding,
  };
};

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const projectsRef = useRef(projects);
  const pinnedProjectIdsRef = useRef<string[]>(loadPinnedProjectIds());
  const legacyProjectResourceBindingsRef = useRef<
    Record<string, ProjectResourceBinding>
  >(loadProjectResourceBindings());

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const commitProjects = useCallback((nextProjects: ProjectSummary[]) => {
    const orderedProjects = orderProjectsForDisplay(nextProjects);
    projectsRef.current = orderedProjects;
    setProjects(() => orderedProjects);
  }, []);

  const persistProjectPreferences = useCallback((validProjectIds: string[]) => {
    const nextPinnedProjectIds = prunePinnedProjectIds(
      pinnedProjectIdsRef.current,
      validProjectIds,
    );
    pinnedProjectIdsRef.current = nextPinnedProjectIds;
    savePinnedProjectIds(nextPinnedProjectIds);
  }, []);

  const toProjectSummary = useCallback(
    (project: ProjectResponse): ProjectSummary => {
      const resourceBinding = getResponseProjectResourceBinding(project);

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        members: project.members,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        currentUserRole: project.currentUserRole,
        isPinned: pinnedProjectIdsRef.current.includes(project.id),
        knowledgeBaseIds: resourceBinding.knowledgeBaseIds,
        agentIds: resourceBinding.agentIds,
        skillIds: resourceBinding.skillIds,
      };
    },
    [],
  );

  const applyProjects = useCallback(
    (items: ProjectResponse[]) => {
      persistProjectPreferences(items.map((project) => project.id));
      commitProjects(items.map(toProjectSummary));
    },
    [commitProjects, persistProjectPreferences, toProjectSummary],
  );

  const migrateProjectResourceBinding = useCallback(
    async (
      project: ProjectResponse,
      legacyBinding: ProjectResourceBinding,
    ): Promise<{
      migratedProject: ProjectResponse;
      migrated: boolean;
    }> => {
      const currentBinding = getResponseProjectResourceBinding(project);
      const mergedBinding = mergeProjectResourceBinding(
        currentBinding,
        legacyBinding,
      );

      if (hasSameProjectResourceBinding(currentBinding, mergedBinding)) {
        return {
          migratedProject: project,
          migrated: true,
        };
      }

      try {
        const result = await updateProjectRequest(project.id, mergedBinding);
        return {
          migratedProject: result.project,
          migrated: true,
        };
      } catch (migrationError) {
        console.error(
          "迁移项目资源绑定失败，将保留本地缓存以便后续重试",
          migrationError,
        );

        return {
          migratedProject: applyResourceBindingToProject(project, mergedBinding),
          migrated: false,
        };
      }
    },
    [],
  );

  const upsertProject = useCallback(
    (
      project: ProjectResponse,
      options?: { insertToTopOfRegular?: boolean },
    ) => {
      const currentProjects = projectsRef.current;
      const nextProject = toProjectSummary(project);
      const existingIndex = currentProjects.findIndex(
        (item) => item.id === project.id,
      );

      if (existingIndex >= 0) {
        const nextProjects = currentProjects.map((item) =>
          item.id === project.id ? nextProject : item,
        );
        commitProjects(nextProjects);
        return;
      }

      if (options?.insertToTopOfRegular) {
        const pinnedProjects = currentProjects.filter((item) => item.isPinned);
        const regularProjects = currentProjects.filter(
          (item) => !item.isPinned,
        );
        commitProjects([...pinnedProjects, nextProject, ...regularProjects]);
        return;
      }

      commitProjects([...currentProjects, nextProject]);
    },
    [commitProjects, toProjectSummary],
  );

  const migrateStoredProjectResourceBindings = useCallback(
    async (items: ProjectResponse[]): Promise<ProjectResponse[]> => {
      const storedBindings = legacyProjectResourceBindingsRef.current;
      const bindingEntries = Object.entries(storedBindings);

      if (bindingEntries.length === 0) {
        return items;
      }

      const nextProjects = [...items];
      const remainingBindings = { ...storedBindings };
      let bindingsChanged = false;

      for (const [index, project] of nextProjects.entries()) {
        const storedBinding = remainingBindings[project.id];
        if (!storedBinding) {
          continue;
        }

        if (isProjectResourceBindingEmpty(storedBinding)) {
          delete remainingBindings[project.id];
          bindingsChanged = true;
          continue;
        }

        const { migratedProject, migrated } =
          await migrateProjectResourceBinding(project, storedBinding);

        nextProjects[index] = migratedProject;

        if (migrated) {
          delete remainingBindings[project.id];
          bindingsChanged = true;
        }
      }

      if (bindingsChanged) {
        legacyProjectResourceBindingsRef.current = remainingBindings;
        saveProjectResourceBindings(remainingBindings);
      }

      return nextProjects;
    },
    [migrateProjectResourceBinding],
  );

  const migrateLegacyProjects = useCallback(
    async (items: ProjectResponse[]): Promise<ProjectResponse[]> => {
      const legacyProjects = loadLegacyProjectsForMigration();
      if (legacyProjects.length === 0) {
        return items;
      }

      const nextProjects = [...items];
      const projectsByName = new Map(
        nextProjects.map(
          (project) =>
            [normalizeProjectNameKey(project.name), project] as const,
        ),
      );

      let nextPinnedProjectIds = pinnedProjectIdsRef.current;
      let pinnedChanged = false;
      let hasUnresolvedLegacyProjects = false;

      for (const legacyProject of legacyProjects) {
        const projectKey = normalizeProjectNameKey(legacyProject.name);
        let matchedProject = projectsByName.get(projectKey) ?? null;

        if (!matchedProject) {
          try {
            const result = await createProjectRequest({
              name: legacyProject.name,
              description: legacyProject.description,
              ...legacyProject.resourceBinding,
            });
            nextProjects.push(result.project);
            projectsByName.set(projectKey, result.project);
            matchedProject = result.project;
          } catch (migrationError) {
            console.error(
              "迁移历史项目失败，将保留本地缓存以便后续重试",
              migrationError,
            );
            hasUnresolvedLegacyProjects = true;
            continue;
          }
        }

        if (!isProjectResourceBindingEmpty(legacyProject.resourceBinding)) {
          const { migratedProject, migrated } =
            await migrateProjectResourceBinding(
              matchedProject,
              legacyProject.resourceBinding,
            );
          const matchedProjectIndex = nextProjects.findIndex(
            (project) => project.id === matchedProject?.id,
          );

          if (matchedProjectIndex >= 0) {
            nextProjects[matchedProjectIndex] = migratedProject;
          }

          matchedProject = migratedProject;
          projectsByName.set(projectKey, migratedProject);

          if (!migrated) {
            hasUnresolvedLegacyProjects = true;
          }
        }

        if (
          legacyProject.isPinned &&
          !nextPinnedProjectIds.includes(matchedProject.id)
        ) {
          nextPinnedProjectIds = [...nextPinnedProjectIds, matchedProject.id];
          pinnedChanged = true;
        }
      }

      if (pinnedChanged) {
        pinnedProjectIdsRef.current = nextPinnedProjectIds;
        savePinnedProjectIds(nextPinnedProjectIds);
      }

      if (!hasUnresolvedLegacyProjects) {
        clearLegacyProjectsAfterMigration();
      }

      return nextProjects;
    },
    [migrateProjectResourceBinding],
  );

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listProjects();
      const legacyMigratedItems = await migrateLegacyProjects(result.items);
      const items = await migrateStoredProjectResourceBindings(
        legacyMigratedItems,
      );
      applyProjects(items);
    } catch (refreshError) {
      console.error(refreshError);
      setError("加载项目列表失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, [applyProjects, migrateLegacyProjects, migrateStoredProjectResourceBindings]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const addProject = useCallback(
    async (input: CreateProjectInput): Promise<AddProjectResult> => {
      const nextName = input.name.trim();
      const nextDescription = normalizeProjectDescription(input.description);
      if (!nextName) {
        return "empty";
      }

      const currentProjects = projectsRef.current;
      const exists = currentProjects.some(
        (project) => project.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (exists) {
        return "duplicate";
      }

      const resourceBinding = toProjectResourceBinding(input);
      const result = await createProjectRequest({
        name: nextName,
        description: nextDescription,
        ...resourceBinding,
      });
      upsertProject(result.project, { insertToTopOfRegular: true });
      return "added";
    },
    [upsertProject],
  );

  const updateProject = useCallback(
    async (input: UpdateProjectInput): Promise<UpdateProjectResult> => {
      const nextName = input.name.trim();
      const nextDescription = normalizeProjectDescription(input.description);
      if (!nextName) {
        return "empty";
      }

      const currentProjects = projectsRef.current;
      const currentProject = currentProjects.find(
        (project) => project.id === input.projectId,
      );
      if (!currentProject) {
        return "not_found";
      }

      const exists = currentProjects.some(
        (project) =>
          project.id !== input.projectId &&
          project.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (exists) {
        return "duplicate";
      }

      const resourceBinding = toProjectResourceBinding(input);
      const result = await updateProjectRequest(input.projectId, {
        name: nextName,
        description: nextDescription,
        ...resourceBinding,
      });
      upsertProject(result.project);
      return "updated";
    },
    [upsertProject],
  );

  const toggleProjectPin = useCallback(
    (projectId: string): ToggleProjectPinResult => {
      const currentProjects = projectsRef.current;
      const targetProject = currentProjects.find(
        (project) => project.id === projectId,
      );
      if (!targetProject) {
        return "not_found";
      }

      const remainingProjects = currentProjects.filter(
        (project) => project.id !== projectId,
      );
      const nextPinnedProjectIds = targetProject.isPinned
        ? pinnedProjectIdsRef.current.filter((item) => item !== projectId)
        : [
            projectId,
            ...pinnedProjectIdsRef.current.filter((item) => item !== projectId),
          ];
      pinnedProjectIdsRef.current = nextPinnedProjectIds;
      savePinnedProjectIds(nextPinnedProjectIds);

      if (targetProject.isPinned) {
        const pinnedProjects = remainingProjects.filter(
          (project) => project.isPinned,
        );
        const regularProjects = remainingProjects.filter(
          (project) => !project.isPinned,
        );
        const nextProjects = [
          ...pinnedProjects,
          { ...targetProject, isPinned: false },
          ...regularProjects,
        ];
        commitProjects(nextProjects);
        return "unpinned";
      }

      const nextProjects = [
        { ...targetProject, isPinned: true },
        ...remainingProjects,
      ];
      commitProjects(nextProjects);
      return "pinned";
    },
    [commitProjects],
  );

  const removeProjectFromState = useCallback(
    (projectId: string): boolean => {
      const currentProjects = projectsRef.current;
      if (!currentProjects.some((project) => project.id === projectId)) {
        return false;
      }

      pinnedProjectIdsRef.current = pinnedProjectIdsRef.current.filter(
        (item) => item !== projectId,
      );
      savePinnedProjectIds(pinnedProjectIdsRef.current);

      if (legacyProjectResourceBindingsRef.current[projectId]) {
        const remainingBindings = {
          ...legacyProjectResourceBindingsRef.current,
        };
        delete remainingBindings[projectId];
        legacyProjectResourceBindingsRef.current = remainingBindings;
        saveProjectResourceBindings(remainingBindings);
      }

      const nextProjects = currentProjects.filter(
        (project) => project.id !== projectId,
      );
      commitProjects(nextProjects);
      return true;
    },
    [commitProjects],
  );

  const deleteProject = useCallback(
    async (projectId: string): Promise<DeleteProjectResult> => {
      const currentProjects = projectsRef.current;
      if (!currentProjects.some((project) => project.id === projectId)) {
        return "not_found";
      }

      await deleteProjectRequest(projectId);

      removeProjectFromState(projectId);
      return "deleted";
    },
    [removeProjectFromState],
  );

  const removeProjectSnapshot = useCallback(
    (projectId: string) => {
      removeProjectFromState(projectId);
    },
    [removeProjectFromState],
  );

  const syncProject = useCallback(
    (project: ProjectResponse) => {
      upsertProject(project);
    },
    [upsertProject],
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
      loading,
      error,
      addProject,
      updateProject,
      toggleProjectPin,
      deleteProject,
      removeProjectSnapshot,
      getProjectById,
      refreshProjects,
      syncProject,
    };
  }, [
    projects,
    loading,
    error,
    addProject,
    updateProject,
    toggleProjectPin,
    deleteProject,
    removeProjectSnapshot,
    getProjectById,
    refreshProjects,
    syncProject,
  ]);

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};
