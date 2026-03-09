import {
  getCatalogMembers,
  getGlobalAssetById,
} from '../../app/project/project.catalog';
import type {
  ChatMessage,
  ConversationSummary,
  ProjectMember,
  ProjectOverviewStats,
  ProjectResourceFocus,
  ProjectResourceGroup,
  ProjectResourceItem,
  ProjectSummary,
} from '../../app/project/project.types';

export interface ProjectWorkspaceMeta {
  iconUrl: string;
  summary: string;
}

const DEFAULT_MEMBERS = getCatalogMembers().slice(0, 3);

const PROJECT_META_BY_ID: Record<string, ProjectWorkspaceMeta> = {
  'project-mobile-rebuild': {
    iconUrl: '/icon-128.png',
    summary: '聚焦移动端应用重构、体验统一与技术债梳理。',
  },
  'project-api-v2': {
    iconUrl: '/icon-128.png',
    summary: '推进 API V2 迁移切流、鉴权一致性和接口治理。',
  },
  'project-marketing-site': {
    iconUrl: '/icon-128.png',
    summary: '围绕品牌表达、转化路径和内容资产进行协作。',
  },
};

const CONVERSATIONS_BY_PROJECT: Record<string, ConversationSummary[]> = {
  'project-mobile-rebuild': [
    {
      id: 'chat-mobile-schema',
      projectId: 'project-mobile-rebuild',
      title: '数据库架构优化',
      updatedAt: '刚刚',
      preview: '根据 schema.sql 文件，我们应该规范化用户表以处理多个身份验证提供商。',
    },
    {
      id: 'chat-mobile-ui',
      projectId: 'project-mobile-rebuild',
      title: 'UI组件库检查',
      updatedAt: '2小时前',
      preview: '你能分析一下我们当前的按钮变体吗？',
    },
    {
      id: 'chat-mobile-api',
      projectId: 'project-mobile-rebuild',
      title: 'API接口结构',
      updatedAt: '昨天',
      preview: '评估新接口的 REST 与 GraphQL 方案。',
    },
  ],
  'project-api-v2': [
    {
      id: 'chat-api-cutover',
      projectId: 'project-api-v2',
      title: '迁移切流策略',
      updatedAt: '今天',
      preview: '确认灰度比例、监控阈值与回滚机制。',
    },
    {
      id: 'chat-api-auth',
      projectId: 'project-api-v2',
      title: '鉴权规范统一',
      updatedAt: '昨天',
      preview: '统一 token/header 的字段约定。',
    },
  ],
  'project-marketing-site': [
    {
      id: 'chat-marketing-copy',
      projectId: 'project-marketing-site',
      title: '首页文案改写',
      updatedAt: '昨天',
      preview: '聚焦价值表达与转化路径。',
    },
  ],
};

const MESSAGES_BY_CONVERSATION: Record<string, ChatMessage[]> = {
  'chat-mobile-schema': [
    {
      id: 'msg-mobile-schema-1',
      conversationId: 'chat-mobile-schema',
      role: 'user',
      content:
        '我正在看你新移动应用的 schema.sql。我们需要同时支持传统邮箱密码和 OAuth（Google、Apple）。我们应该如何构建用户和身份验证表来干净地落地这个问题？',
      createdAt: '17:20',
    },
    {
      id: 'msg-mobile-schema-2',
      conversationId: 'chat-mobile-schema',
      role: 'assistant',
      content:
        '建议拆分成 users、user_identities、user_credentials 三张表，把“账号主体”和“登录方式”解耦，后续新增登录提供商也不需要改动主用户结构。',
      createdAt: '17:21',
    },
    {
      id: 'msg-mobile-schema-3',
      conversationId: 'chat-mobile-schema',
      role: 'assistant',
      content:
        '这样还能保证同一用户绑定多种身份提供商，密码登录与第三方登录共存，并且具备明确的唯一约束。',
      createdAt: '17:21',
    },
  ],
  'chat-mobile-ui': [
    {
      id: 'msg-mobile-ui-1',
      conversationId: 'chat-mobile-ui',
      role: 'assistant',
      content:
        '当前按钮体系主要问题是语义层次不统一，建议先建立 primary/secondary/ghost 三层，再补齐尺寸与状态 token。',
      createdAt: '15:02',
    },
  ],
  'chat-mobile-api': [
    {
      id: 'msg-mobile-api-1',
      conversationId: 'chat-mobile-api',
      role: 'assistant',
      content: 'REST 适合标准 CRUD，GraphQL 适合聚合查询；建议以 REST 为主，关键聚合场景单点引入 GraphQL。',
      createdAt: '昨天 19:10',
    },
  ],
  'chat-api-cutover': [
    {
      id: 'msg-api-cutover-1',
      conversationId: 'chat-api-cutover',
      role: 'assistant',
      content: '按租户灰度切流 10% -> 30% -> 60% -> 100%，每阶段设置 30 分钟观测窗口。',
      createdAt: '13:28',
    },
  ],
  'chat-api-auth': [
    {
      id: 'msg-api-auth-1',
      conversationId: 'chat-api-auth',
      role: 'assistant',
      content: '统一 Bearer Token，并在网关层做 token 前缀与过期校验，可显著降低联调分歧。',
      createdAt: '昨天 21:06',
    },
  ],
  'chat-marketing-copy': [
    {
      id: 'msg-marketing-copy-1',
      conversationId: 'chat-marketing-copy',
      role: 'assistant',
      content: '建议首页第一屏先清晰回答“我们是谁、解决什么问题、为什么现在可信”。',
      createdAt: '昨天 16:11',
    },
  ],
};

const RESOURCE_GROUP_COPY: Record<
  ProjectResourceFocus,
  { title: string; description: string }
> = {
  knowledge: {
    title: '知识库',
    description: '项目已接入的全局知识资产，可作为对话和协作的上下文基础。',
  },
  skills: {
    title: '技能',
    description: '项目当前启用的全局技能能力，用于复用成熟工作流。',
  },
  agents: {
    title: '智能体',
    description: '项目已绑定的全局智能体，可参与分析、审查和执行协作。',
  },
};

const buildFallbackConversations = (projectId: string): ConversationSummary[] => {
  return [
    {
      id: `chat-${projectId}-default`,
      projectId,
      title: '默认项目对话',
      updatedAt: '刚刚',
      preview: '这是新建项目的默认会话占位。',
    },
  ];
};

const mapMemberIdsToMembers = (memberIds: string[]): ProjectMember[] => {
  const catalogMembers = getCatalogMembers();
  const members = memberIds
    .map((memberId) => catalogMembers.find((member) => member.id === memberId) ?? null)
    .filter((member): member is ProjectMember => member !== null);

  if (members.length > 0) {
    return members;
  }

  return DEFAULT_MEMBERS;
};

const getResourceIdsByFocus = (
  project: Pick<ProjectSummary, 'knowledgeBaseIds' | 'skillIds' | 'agentIds'>,
  focus: ProjectResourceFocus,
): string[] => {
  if (focus === 'knowledge') {
    return project.knowledgeBaseIds;
  }

  if (focus === 'skills') {
    return project.skillIds;
  }

  return project.agentIds;
};

const mapProjectResources = (
  project: Pick<ProjectSummary, 'knowledgeBaseIds' | 'skillIds' | 'agentIds'>,
  focus: ProjectResourceFocus,
): ProjectResourceItem[] => {
  return getResourceIdsByFocus(project, focus)
    .map((resourceId) => getGlobalAssetById(focus, resourceId))
    .filter((resource): resource is ProjectResourceItem | Exclude<typeof resource, null> => resource !== null)
    .map((resource) => ({
      ...resource,
      source: 'global' as const,
    }));
};

export const getProjectMeta = (projectId: string): ProjectWorkspaceMeta => {
  return (
    PROJECT_META_BY_ID[projectId] ?? {
      iconUrl: '/icon-128.png',
      summary: '聚焦当前项目的知识沉淀、协作过程和 AI 能力接入。',
    }
  );
};

export const getProjectMembers = (
  project: Pick<ProjectSummary, 'memberIds'>,
): ProjectMember[] => {
  return mapMemberIdsToMembers(project.memberIds);
};

export const getConversationsByProject = (projectId: string): ConversationSummary[] => {
  return CONVERSATIONS_BY_PROJECT[projectId] ?? buildFallbackConversations(projectId);
};

export const getMessagesByConversation = (conversationId: string): ChatMessage[] => {
  return MESSAGES_BY_CONVERSATION[conversationId] ?? [];
};

export const getProjectResourceGroups = (
  project: Pick<ProjectSummary, 'knowledgeBaseIds' | 'skillIds' | 'agentIds'>,
): ProjectResourceGroup[] => {
  return (['knowledge', 'skills', 'agents'] as const).map((focus) => ({
    key: focus,
    title: RESOURCE_GROUP_COPY[focus].title,
    description: RESOURCE_GROUP_COPY[focus].description,
    items: mapProjectResources(project, focus),
  }));
};

export const getProjectOverviewStats = (
  project: Pick<ProjectSummary, 'id' | 'knowledgeBaseIds' | 'skillIds' | 'agentIds' | 'memberIds'>,
): ProjectOverviewStats => {
  const members = getProjectMembers(project);
  const conversations = getConversationsByProject(project.id);

  return {
    activeMembers: members.filter((member) => member.isActive).length,
    conversationCount: conversations.length,
    knowledgeCount: project.knowledgeBaseIds.length,
    agentCount: project.agentIds.length,
    skillCount: project.skillIds.length,
  };
};

export const getRecentProjectConversations = (
  projectId: string,
  limit = 3,
): ConversationSummary[] => {
  return getConversationsByProject(projectId).slice(0, limit);
};

export const getRecentProjectResources = (
  project: Pick<ProjectSummary, 'knowledgeBaseIds' | 'skillIds' | 'agentIds'>,
  limit = 4,
): ProjectResourceItem[] => {
  return getProjectResourceGroups(project)
    .flatMap((group) => group.items)
    .slice(0, limit);
};
