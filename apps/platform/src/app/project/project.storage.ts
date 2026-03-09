import type { CreateProjectInput, ProjectSummary } from './project.types';

const PROJECTS_STORAGE_KEY = 'knowject_projects';

const DEFAULT_PROJECTS: ProjectSummary[] = [
  {
    id: 'project-mobile-rebuild',
    name: '移动端应用重构',
    description: '聚焦移动端应用重构、体验统一与技术债梳理。',
    createdAt: '2026-03-05T09:00:00.000Z',
    isPinned: false,
    knowledgeBaseIds: ['kb-arch', 'kb-mobile-ui'],
    memberIds: ['member-alex', 'member-yuki', 'member-nina'],
    agentIds: ['agent-requirement', 'agent-code-review'],
    skillIds: ['skill-typescript', 'skill-routes'],
  },
  {
    id: 'project-api-v2',
    name: 'API V2 迁移',
    description: '推进 API V2 迁移切流、鉴权一致性和接口治理。',
    createdAt: '2026-03-05T09:10:00.000Z',
    isPinned: false,
    knowledgeBaseIds: ['kb-api'],
    memberIds: ['member-leo', 'member-iris'],
    agentIds: ['agent-api-design'],
    skillIds: ['skill-api-contract'],
  },
  {
    id: 'project-marketing-site',
    name: '营销网站',
    description: '围绕品牌表达、转化路径和内容资产进行协作。',
    createdAt: '2026-03-05T09:20:00.000Z',
    isPinned: false,
    knowledgeBaseIds: ['kb-brand'],
    memberIds: ['member-olivia', 'member-jason'],
    agentIds: ['agent-copywriter'],
    skillIds: ['skill-brand-story'],
  },
];

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const normalizeBoolean = (value: unknown): boolean => value === true;
const normalizeString = (value: unknown): string => (typeof value === 'string' ? value : '');

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
    description: normalizeString(candidate.description),
    createdAt: candidate.createdAt,
    isPinned: normalizeBoolean(candidate.isPinned),
    knowledgeBaseIds: normalizeStringArray(candidate.knowledgeBaseIds),
    memberIds: normalizeStringArray(candidate.memberIds),
    agentIds: normalizeStringArray(candidate.agentIds),
    skillIds: normalizeStringArray(candidate.skillIds),
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

export const createProjectSummary = (input: CreateProjectInput): ProjectSummary => {
  const now = new Date().toISOString();
  return {
    id: `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    description: input.description,
    createdAt: now,
    isPinned: false,
    knowledgeBaseIds: input.knowledgeBaseIds,
    memberIds: input.memberIds,
    agentIds: input.agentIds,
    skillIds: input.skillIds,
  };
};

export { DEFAULT_PROJECTS };
