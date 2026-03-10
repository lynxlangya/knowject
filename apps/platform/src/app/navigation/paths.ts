import type {
  ProjectResourceFocus,
  ProjectSectionKey,
} from '@app/project/project.types';

export const PATHS = {
  login: '/login',
  home: '/home',
  project: '/project',
  knowledge: '/knowledge',
  skills: '/skills',
  agents: '/agents',
  members: '/members',
  analytics: '/analytics',
  settings: '/settings',
  workspace: '/workspace',
} as const;

export const ROUTE_PATTERNS = {
  project: `${PATHS.project}/:projectId`,
  projectOverview: `${PATHS.project}/:projectId/overview`,
  projectChat: `${PATHS.project}/:projectId/chat`,
  projectChatDetail: `${PATHS.project}/:projectId/chat/:chatId`,
  projectResources: `${PATHS.project}/:projectId/resources`,
  projectMembers: `${PATHS.project}/:projectId/members`,
  projectKnowledgeLegacy: `${PATHS.project}/:projectId/knowledge`,
  projectAgentsLegacy: `${PATHS.project}/:projectId/agents`,
  projectSkillsLegacy: `${PATHS.project}/:projectId/skills`,
  legacyHomeProject: `${PATHS.home}/project/:projectId`,
  legacyHomeProjectChat: `${PATHS.home}/project/:projectId/chat`,
  legacyHomeProjectChatDetail: `${PATHS.home}/project/:projectId/chat/:chatId`,
} as const;

const PROJECT_ROOT_SEGMENT = PATHS.project.slice(1);

const PROJECT_SECTION_KEYS = ['overview', 'chat', 'resources', 'members'] as const;

export const buildProjectPath = (projectId: string): string => {
  return `${PATHS.project}/${encodeURIComponent(projectId)}`;
};

export const buildProjectOverviewPath = (projectId: string): string => {
  return `${buildProjectPath(projectId)}/overview`;
};

export const buildProjectChatPath = (projectId: string, chatId?: string): string => {
  const chatPath = `${buildProjectPath(projectId)}/chat`;
  if (!chatId) {
    return chatPath;
  }

  return `${chatPath}/${encodeURIComponent(chatId)}`;
};

export const buildProjectMembersPath = (projectId: string): string => {
  return `${buildProjectPath(projectId)}/members`;
};

const PROJECT_SECTION_PATH_BUILDERS: Record<ProjectSectionKey, (projectId: string) => string> = {
  overview: buildProjectOverviewPath,
  chat: (projectId) => buildProjectChatPath(projectId),
  resources: (projectId) => buildProjectResourcesPath(projectId),
  members: buildProjectMembersPath,
};

export const buildProjectSectionPath = (
  projectId: string,
  section: ProjectSectionKey,
): string => {
  return PROJECT_SECTION_PATH_BUILDERS[section](projectId);
};

export const buildProjectResourcesPath = (
  projectId: string,
  focus?: ProjectResourceFocus,
): string => {
  const basePath = `${buildProjectPath(projectId)}/resources`;
  if (!focus) {
    return basePath;
  }

  return `${basePath}?focus=${encodeURIComponent(focus)}`;
};

export const getProjectIdFromPathname = (pathname: string): string | null => {
  const [, rootSegment, rawProjectId] = pathname.split('/');
  if (rootSegment !== PROJECT_ROOT_SEGMENT || !rawProjectId) {
    return null;
  }

  return decodeURIComponent(rawProjectId);
};

// 项目页 canonical section 固定在第三段，避免页面层继续写 includes 补丁判断。
export const getProjectSectionFromPathname = (pathname: string): ProjectSectionKey => {
  const [, rootSegment, , section] = pathname.split('/');
  if (rootSegment !== PROJECT_ROOT_SEGMENT) {
    return 'overview';
  }

  if (PROJECT_SECTION_KEYS.includes(section as ProjectSectionKey)) {
    return section as ProjectSectionKey;
  }

  return 'overview';
};
