import {
  getCatalogMembers,
  getGlobalAssetById,
} from '../../app/project/project.catalog';
import type {
  ChatMessage,
  ConversationSummary,
  MemberProfile,
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

type ProjectMemberSnapshot = Omit<ProjectMember, 'id' | 'name' | 'avatarUrl'>;

const PROJECT_MEMBER_SNAPSHOTS_BY_PROJECT: Record<string, Record<string, ProjectMemberSnapshot>> = {
  'project-mobile-rebuild': {
    'member-alex': {
      isActive: true,
      role: 'owner',
      status: 'active',
      responsibilityTags: ['重构范围', '技术取舍', '里程碑推进'],
      focusSummary: '统筹移动端重构范围、关键取舍与迭代节奏，保证体验统一与技术债治理同步推进。',
      recentActivity: {
        type: 'delivery',
        summary: '确认导航收敛与移动端重构的阶段目标',
        occurredAt: '2026-03-09T09:20:00.000Z',
        displayTime: '刚刚',
      },
    },
    'member-yuki': {
      isActive: true,
      role: 'design',
      status: 'active',
      responsibilityTags: ['交互结构', '界面规范', '设计评审'],
      focusSummary: '负责收敛核心路径的交互结构与组件表达，减少页面风格与层级不一致的问题。',
      recentActivity: {
        type: 'review',
        summary: '完成首页按钮层级与信息架构评审',
        occurredAt: '2026-03-09T08:45:00.000Z',
        displayTime: '35 分钟前',
      },
    },
    'member-nina': {
      isActive: true,
      role: 'frontend',
      status: 'syncing',
      responsibilityTags: ['前端实现', '路由兼容', '状态编排'],
      focusSummary: '将新的项目信息架构落到页面实现，并持续处理布局链路、交互细节与兼容跳转。',
      recentActivity: {
        type: 'conversation',
        summary: '同步对话区铺满与项目页标签栏改造进展',
        occurredAt: '2026-03-09T07:10:00.000Z',
        displayTime: '2 小时前',
      },
    },
  },
  'project-api-v2': {
    'member-leo': {
      isActive: true,
      role: 'owner',
      status: 'active',
      responsibilityTags: ['迁移切流', '接口契约', '回滚策略'],
      focusSummary: '推动 API V2 分阶段切流，确保迁移窗口、监控阈值与回滚机制都可执行。',
      recentActivity: {
        type: 'delivery',
        summary: '确认 10% 到 100% 的灰度切流与观测窗口',
        occurredAt: '2026-03-09T13:28:00.000Z',
        displayTime: '今天 13:28',
      },
    },
    'member-iris': {
      isActive: false,
      role: 'backend',
      status: 'blocked',
      responsibilityTags: ['鉴权规范', '网关策略', '联调支持'],
      focusSummary: '负责统一 Bearer Token 约定与网关校验策略，目前等待切流方案与网关配置窗口对齐。',
      recentActivity: {
        type: 'review',
        summary: '输出 Bearer Token 规范与网关层校验建议',
        occurredAt: '2026-03-08T21:06:00.000Z',
        displayTime: '昨天 21:06',
      },
    },
  },
  'project-marketing-site': {
    'member-olivia': {
      isActive: true,
      role: 'owner',
      status: 'active',
      responsibilityTags: ['品牌定位', '页面策略', '转化路径'],
      focusSummary: '负责收敛营销站点的主叙事与转化结构，确保品牌表达与产品价值一致。',
      recentActivity: {
        type: 'conversation',
        summary: '调整首屏价值主张与 CTA 排序',
        occurredAt: '2026-03-08T16:11:00.000Z',
        displayTime: '昨天 16:11',
      },
    },
    'member-jason': {
      isActive: true,
      role: 'marketing',
      status: 'syncing',
      responsibilityTags: ['内容资产', '文案改写', '发布节奏'],
      focusSummary: '持续补齐站点内容资产与投放文案，保证营销页面上线节奏与素材供给同步。',
      recentActivity: {
        type: 'resource',
        summary: '整理品牌资产库并补充首页文案素材',
        occurredAt: '2026-03-08T11:40:00.000Z',
        displayTime: '昨天 11:40',
      },
    },
  },
};

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

const buildDefaultMemberSnapshot = (index: number): ProjectMemberSnapshot => {
  const defaultSnapshots: ProjectMemberSnapshot[] = [
    {
      isActive: true,
      role: 'owner',
      status: 'active',
      responsibilityTags: ['项目推进', '协作协调'],
      focusSummary: '负责当前项目的目标收敛与协作推进。',
      recentActivity: {
        type: 'delivery',
        summary: '完成项目成员关系初始化',
        occurredAt: '2026-03-09T09:00:00.000Z',
        displayTime: '刚刚',
      },
    },
    {
      isActive: true,
      role: 'product',
      status: 'syncing',
      responsibilityTags: ['需求梳理', '优先级同步'],
      focusSummary: '负责同步需求取舍与协作优先级。',
      recentActivity: {
        type: 'conversation',
        summary: '补充当前阶段的协作说明',
        occurredAt: '2026-03-09T08:20:00.000Z',
        displayTime: '40 分钟前',
      },
    },
    {
      isActive: true,
      role: 'design',
      status: 'idle',
      responsibilityTags: ['界面表达', '交互细节'],
      focusSummary: '负责保持页面表达与信息层级清晰一致。',
      recentActivity: {
        type: 'review',
        summary: '补齐项目成员页的展示建议',
        occurredAt: '2026-03-09T07:30:00.000Z',
        displayTime: '90 分钟前',
      },
    },
  ];

  return defaultSnapshots[index] ?? defaultSnapshots[defaultSnapshots.length - 1];
};

const buildFallbackMembers = (members: MemberProfile[]): ProjectMember[] => {
  return members.map((member, index) => ({
    ...member,
    ...buildDefaultMemberSnapshot(index),
  }));
};

const mapMemberIdsToMembers = (projectId: string, memberIds: string[]): ProjectMember[] => {
  const catalogMembers = getCatalogMembers();
  const members = memberIds
    .map((memberId) => catalogMembers.find((member) => member.id === memberId) ?? null)
    .filter((member): member is MemberProfile => member !== null);

  if (members.length === 0) {
    return buildFallbackMembers(DEFAULT_MEMBERS);
  }

  const projectSnapshots = PROJECT_MEMBER_SNAPSHOTS_BY_PROJECT[projectId] ?? {};

  return members.map((member, index) => ({
    ...member,
    ...(projectSnapshots[member.id] ?? buildDefaultMemberSnapshot(index)),
  }));
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
  project: Pick<ProjectSummary, 'id' | 'memberIds'>,
): ProjectMember[] => {
  return mapMemberIdsToMembers(project.id, project.memberIds);
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
