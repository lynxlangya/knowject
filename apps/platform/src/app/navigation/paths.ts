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

export const buildProjectResourcesPath = (
  projectId: string,
  focus?: 'knowledge' | 'skills' | 'agents',
): string => {
  const basePath = `${buildProjectPath(projectId)}/resources`;
  if (!focus) {
    return basePath;
  }

  return `${basePath}?focus=${encodeURIComponent(focus)}`;
};
