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
  getProjectResourceBinding,
  isProjectResourceBindingEmpty,
  loadLegacyProjectsForMigration,
  loadPinnedProjectIds,
  loadProjectResourceBindings,
  prunePinnedProjectIds,
  pruneProjectResourceBindings,
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

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const projectsRef = useRef(projects);
  const pinnedProjectIdsRef = useRef<string[]>(loadPinnedProjectIds());
  const projectResourceBindingsRef = useRef<
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

    const nextProjectResourceBindings = pruneProjectResourceBindings(
      projectResourceBindingsRef.current,
      validProjectIds,
    );
    projectResourceBindingsRef.current = nextProjectResourceBindings;
    saveProjectResourceBindings(nextProjectResourceBindings);
  }, []);

  const toProjectSummary = useCallback(
    (project: ProjectResponse): ProjectSummary => {
      const resourceBinding = getProjectResourceBinding(
        projectResourceBindingsRef.current,
        project.id,
      );

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

      for (const legacyProject of legacyProjects) {
        const projectKey = normalizeProjectNameKey(legacyProject.name);
        if (projectsByName.has(projectKey)) {
          continue;
        }

        const result = await createProjectRequest({
          name: legacyProject.name,
          description: legacyProject.description,
        });
        nextProjects.push(result.project);
        projectsByName.set(projectKey, result.project);
      }

      let nextPinnedProjectIds = pinnedProjectIdsRef.current;
      let nextProjectResourceBindings = projectResourceBindingsRef.current;
      let pinnedChanged = false;
      let resourceBindingsChanged = false;

      for (const legacyProject of legacyProjects) {
        const matchedProject = projectsByName.get(
          normalizeProjectNameKey(legacyProject.name),
        );
        if (!matchedProject) {
          continue;
        }

        if (
          legacyProject.isPinned &&
          !nextPinnedProjectIds.includes(matchedProject.id)
        ) {
          nextPinnedProjectIds = [...nextPinnedProjectIds, matchedProject.id];
          pinnedChanged = true;
        }

        if (isProjectResourceBindingEmpty(legacyProject.resourceBinding)) {
          continue;
        }

        const currentBinding = getProjectResourceBinding(
          nextProjectResourceBindings,
          matchedProject.id,
        );
        if (!isProjectResourceBindingEmpty(currentBinding)) {
          continue;
        }

        nextProjectResourceBindings = {
          ...nextProjectResourceBindings,
          [matchedProject.id]: legacyProject.resourceBinding,
        };
        resourceBindingsChanged = true;
      }

      if (pinnedChanged) {
        pinnedProjectIdsRef.current = nextPinnedProjectIds;
        savePinnedProjectIds(nextPinnedProjectIds);
      }

      if (resourceBindingsChanged) {
        projectResourceBindingsRef.current = nextProjectResourceBindings;
        saveProjectResourceBindings(nextProjectResourceBindings);
      }

      clearLegacyProjectsAfterMigration();

      return nextProjects;
    },
    [],
  );

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listProjects();
      const items = await migrateLegacyProjects(result.items);
      applyProjects(items);
    } catch (refreshError) {
      console.error(refreshError);
      setError("加载项目列表失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, [applyProjects, migrateLegacyProjects]);

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
      });

      projectResourceBindingsRef.current = {
        ...projectResourceBindingsRef.current,
        [result.project.id]: resourceBinding,
      };
      saveProjectResourceBindings(projectResourceBindingsRef.current);
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
      });

      projectResourceBindingsRef.current = {
        ...projectResourceBindingsRef.current,
        [input.projectId]: resourceBinding,
      };
      saveProjectResourceBindings(projectResourceBindingsRef.current);
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

      const { [projectId]: _removedBinding, ...remainingBindings } =
        projectResourceBindingsRef.current;
      projectResourceBindingsRef.current = remainingBindings;
      saveProjectResourceBindings(remainingBindings);

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
