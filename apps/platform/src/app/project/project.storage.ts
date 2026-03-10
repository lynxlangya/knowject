import type { ProjectResourceBinding } from "./project.types";

const PROJECT_PINS_STORAGE_KEY = "knowject_project_pins";
const PROJECT_RESOURCE_BINDINGS_STORAGE_KEY =
  "knowject_project_resource_bindings";
const LEGACY_PROJECTS_STORAGE_KEY = "knowject_projects";

interface LegacyProjectRecord {
  id: string;
  name: string;
  description: string;
  isPinned: boolean;
  knowledgeBaseIds: string[];
  agentIds: string[];
  skillIds: string[];
}

export interface LegacyProjectMigrationRecord {
  name: string;
  description: string;
  isPinned: boolean;
  resourceBinding: ProjectResourceBinding;
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeBoolean = (value: unknown): boolean => value === true;
const normalizeString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const createEmptyProjectResourceBinding = (): ProjectResourceBinding => ({
  knowledgeBaseIds: [],
  agentIds: [],
  skillIds: [],
});

const normalizeProjectResourceBinding = (
  value: unknown,
): ProjectResourceBinding | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return {
    knowledgeBaseIds: normalizeStringArray(candidate.knowledgeBaseIds),
    agentIds: normalizeStringArray(candidate.agentIds),
    skillIds: normalizeStringArray(candidate.skillIds),
  };
};

const normalizeLegacyProjectRecord = (
  value: unknown,
): LegacyProjectRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    description: normalizeString(candidate.description),
    isPinned: normalizeBoolean(candidate.isPinned),
    knowledgeBaseIds: normalizeStringArray(candidate.knowledgeBaseIds),
    agentIds: normalizeStringArray(candidate.agentIds),
    skillIds: normalizeStringArray(candidate.skillIds),
  };
};

export const loadPinnedProjectIds = (): string[] => {
  const raw = localStorage.getItem(PROJECT_PINS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeStringArray(parsed);
  } catch (error) {
    console.error("解析项目置顶偏好失败，已回退为空", error);
    return [];
  }
};

export const savePinnedProjectIds = (projectIds: string[]): void => {
  localStorage.setItem(PROJECT_PINS_STORAGE_KEY, JSON.stringify(projectIds));
};

export const loadLegacyProjectsForMigration =
  (): LegacyProjectMigrationRecord[] => {
    const raw = localStorage.getItem(LEGACY_PROJECTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => normalizeLegacyProjectRecord(item))
        .filter((item): item is LegacyProjectRecord => item !== null)
        .map((project) => ({
          name: project.name,
          description: project.description,
          isPinned: project.isPinned,
          resourceBinding: {
            knowledgeBaseIds: project.knowledgeBaseIds,
            agentIds: project.agentIds,
            skillIds: project.skillIds,
          },
        }));
    } catch (error) {
      console.error("解析历史项目缓存失败，已跳过迁移", error);
      return [];
    }
  };

export const clearLegacyProjectsAfterMigration = (): void => {
  localStorage.removeItem(LEGACY_PROJECTS_STORAGE_KEY);
};

export const loadProjectResourceBindings = (): Record<
  string,
  ProjectResourceBinding
> => {
  const raw = localStorage.getItem(PROJECT_RESOURCE_BINDINGS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const entries = Object.entries(parsed as Record<string, unknown>)
      .map(([projectId, value]) => {
        const binding = normalizeProjectResourceBinding(value);
        return binding ? ([projectId, binding] as const) : null;
      })
      .filter(
        (entry): entry is readonly [string, ProjectResourceBinding] =>
          entry !== null,
      );

    return Object.fromEntries(entries);
  } catch (error) {
    console.error("解析项目资源绑定失败，已回退为空", error);
    return {};
  }
};

export const saveProjectResourceBindings = (
  bindingsByProjectId: Record<string, ProjectResourceBinding>,
): void => {
  localStorage.setItem(
    PROJECT_RESOURCE_BINDINGS_STORAGE_KEY,
    JSON.stringify(bindingsByProjectId),
  );
};

export const getProjectResourceBinding = (
  bindingsByProjectId: Record<string, ProjectResourceBinding>,
  projectId: string,
): ProjectResourceBinding => {
  return bindingsByProjectId[projectId] ?? createEmptyProjectResourceBinding();
};

export const createDefaultProjectResourceBinding =
  (): ProjectResourceBinding => {
    return createEmptyProjectResourceBinding();
  };

export const isProjectResourceBindingEmpty = (
  binding: ProjectResourceBinding,
): boolean => {
  return (
    binding.knowledgeBaseIds.length === 0 &&
    binding.agentIds.length === 0 &&
    binding.skillIds.length === 0
  );
};

export const prunePinnedProjectIds = (
  projectIds: string[],
  validProjectIds: string[],
): string[] => {
  const validProjectIdSet = new Set(validProjectIds);
  return projectIds.filter((projectId) => validProjectIdSet.has(projectId));
};

export const pruneProjectResourceBindings = (
  bindingsByProjectId: Record<string, ProjectResourceBinding>,
  validProjectIds: string[],
): Record<string, ProjectResourceBinding> => {
  const validProjectIdSet = new Set(validProjectIds);

  return Object.fromEntries(
    Object.entries(bindingsByProjectId).filter(([projectId]) =>
      validProjectIdSet.has(projectId),
    ),
  );
};
