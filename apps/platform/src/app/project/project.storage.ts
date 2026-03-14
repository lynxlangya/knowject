const PROJECT_PINS_STORAGE_KEY = "knowject_project_pins";

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
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

export const prunePinnedProjectIds = (
  projectIds: string[],
  validProjectIds: string[],
): string[] => {
  const validProjectIdSet = new Set(validProjectIds);
  return projectIds.filter((projectId) => validProjectIdSet.has(projectId));
};
