export const PATHS = {
  login: '/login',
  home: '/home',
  knowledge: '/knowledge',
  skills: '/skills',
  agents: '/agents',
  analytics: '/analytics',
  settings: '/settings',
  workspace: '/workspace',
} as const;

export const ROUTE_PATTERNS = {
  homeProject: `${PATHS.home}/project/:projectId`,
  homeProjectChat: `${PATHS.home}/project/:projectId/chat/:chatId`,
} as const;

export const buildHomeProjectPath = (projectId: string): string => {
  return `${PATHS.home}/project/${encodeURIComponent(projectId)}`;
};

export const buildHomeProjectChatPath = (projectId: string, chatId: string): string => {
  return `${buildHomeProjectPath(projectId)}/chat/${encodeURIComponent(chatId)}`;
};
