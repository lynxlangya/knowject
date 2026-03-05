import type { ProjectSummary } from './project.types';

const PROJECTS_STORAGE_KEY = 'knowject_projects';

const DEFAULT_PROJECTS: ProjectSummary[] = [
  {
    id: 'project-mobile-rebuild',
    name: '移动端应用重构',
    createdAt: '2026-03-05T09:00:00.000Z',
  },
  {
    id: 'project-api-v2',
    name: 'API V2 迁移',
    createdAt: '2026-03-05T09:10:00.000Z',
  },
  {
    id: 'project-marketing-site',
    name: '营销网站',
    createdAt: '2026-03-05T09:20:00.000Z',
  },
];

const normalizeProject = (value: unknown): ProjectSummary | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    createdAt: candidate.createdAt,
  };
};

export const loadProjects = (): ProjectSummary[] => {
  const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_PROJECTS;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_PROJECTS;
    }

    const normalized = parsed.map(normalizeProject).filter(Boolean) as ProjectSummary[];
    return normalized.length > 0 ? normalized : DEFAULT_PROJECTS;
  } catch (error) {
    console.error('解析项目缓存失败，已回退默认项目', error);
    return DEFAULT_PROJECTS;
  }
};

export const saveProjects = (projects: ProjectSummary[]): void => {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

export const createProjectSummary = (name: string): ProjectSummary => {
  const now = new Date().toISOString();
  return {
    id: `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: now,
  };
};

export { DEFAULT_PROJECTS };
