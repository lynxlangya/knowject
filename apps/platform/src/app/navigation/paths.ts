export const PATHS = {
  login: '/login',
  home: '/home',
  project: '/project',
  knowledge: '/knowledge',
  skills: '/skills',
  agents: '/agents',
  analytics: '/analytics',
  settings: '/settings',
  workspace: '/workspace',
} as const;

export const ROUTE_PATTERNS = {
  project: `${PATHS.project}/:projectId`,
  projectChat: `${PATHS.project}/:projectId/chat/:chatId`,
  legacyHomeProject: `${PATHS.home}/project/:projectId`,
  legacyHomeProjectChat: `${PATHS.home}/project/:projectId/chat/:chatId`,
} as const;

export const buildProjectPath = (projectId: string): string => {
  return `${PATHS.project}/${encodeURIComponent(projectId)}`;
};

export const buildProjectChatPath = (projectId: string, chatId: string): string => {
  return `${buildProjectPath(projectId)}/chat/${encodeURIComponent(chatId)}`;
};
