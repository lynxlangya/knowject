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
  projectChat: `${PATHS.project}/:projectId/chat`,
  projectChatDetail: `${PATHS.project}/:projectId/chat/:chatId`,
  projectKnowledge: `${PATHS.project}/:projectId/knowledge`,
  projectMembers: `${PATHS.project}/:projectId/members`,
  projectAgents: `${PATHS.project}/:projectId/agents`,
  projectSkills: `${PATHS.project}/:projectId/skills`,
  legacyHomeProject: `${PATHS.home}/project/:projectId`,
  legacyHomeProjectChat: `${PATHS.home}/project/:projectId/chat/:chatId`,
} as const;

export const buildProjectPath = (projectId: string): string => {
  return `${PATHS.project}/${encodeURIComponent(projectId)}`;
};

export const buildProjectChatPath = (projectId: string, chatId?: string): string => {
  const chatPath = `${buildProjectPath(projectId)}/chat`;
  if (!chatId) {
    return chatPath;
  }

  return `${chatPath}/${encodeURIComponent(chatId)}`;
};

export const buildProjectKnowledgePath = (projectId: string): string => {
  return `${buildProjectPath(projectId)}/knowledge`;
};

export const buildProjectMembersPath = (projectId: string): string => {
  return `${buildProjectPath(projectId)}/members`;
};

export const buildProjectAgentsPath = (projectId: string): string => {
  return `${buildProjectPath(projectId)}/agents`;
};

export const buildProjectSkillsPath = (projectId: string): string => {
  return `${buildProjectPath(projectId)}/skills`;
};
