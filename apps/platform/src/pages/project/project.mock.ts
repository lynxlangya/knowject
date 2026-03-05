import type {
  ChatMessage,
  ConversationSummary,
  ProjectMember,
  ProjectTabKey,
  ProjectWorkspaceSectionItem,
} from '../../app/project/project.types';

export interface ProjectWorkspaceMeta {
  iconUrl: string;
  members: ProjectMember[];
}

const AVATAR_ALEX = 'https://i.pravatar.cc/80?img=12';
const AVATAR_MIA = 'https://i.pravatar.cc/80?img=32';
const AVATAR_RYAN = 'https://i.pravatar.cc/80?img=51';
const AVATAR_YUKI = 'https://i.pravatar.cc/80?img=23';
const AVATAR_NINA = 'https://i.pravatar.cc/80?img=24';
const AVATAR_EVAN = 'https://i.pravatar.cc/80?img=66';
const AVATAR_LUNA = 'https://i.pravatar.cc/80?img=18';
const AVATAR_KAI = 'https://i.pravatar.cc/80?img=68';
const AVATAR_IRIS = 'https://i.pravatar.cc/80?img=48';
const AVATAR_LEO = 'https://i.pravatar.cc/80?img=14';
const AVATAR_TINA = 'https://i.pravatar.cc/80?img=37';
const AVATAR_OLIVIA = 'https://i.pravatar.cc/80?img=5';
const AVATAR_JASON = 'https://i.pravatar.cc/80?img=63';

const DEFAULT_MEMBERS: ProjectMember[] = [
  {
    id: 'member-fallback-1',
    name: 'Alex Chen',
    avatarUrl: AVATAR_ALEX,
    isActive: true,
  },
  {
    id: 'member-fallback-2',
    name: 'Mia Lin',
    avatarUrl: AVATAR_MIA,
    isActive: true,
  },
  {
    id: 'member-fallback-3',
    name: 'Ryan Wu',
    avatarUrl: AVATAR_RYAN,
    isActive: true,
  },
];

const PROJECT_META_BY_ID: Record<string, ProjectWorkspaceMeta> = {
  'project-mobile-rebuild': {
    iconUrl: '/icon-128.png',
    members: [
      {
        id: 'member-mobile-1',
        name: 'Alex Chen',
        avatarUrl: AVATAR_ALEX,
        isActive: true,
      },
      {
        id: 'member-mobile-2',
        name: 'Yuki Zhang',
        avatarUrl: AVATAR_YUKI,
        isActive: true,
      },
      {
        id: 'member-mobile-3',
        name: 'Nina Song',
        avatarUrl: AVATAR_NINA,
        isActive: true,
      },
      {
        id: 'member-mobile-4',
        name: 'Evan He',
        avatarUrl: AVATAR_EVAN,
        isActive: true,
      },
      {
        id: 'member-mobile-5',
        name: 'Luna Xu',
        avatarUrl: AVATAR_LUNA,
        isActive: true,
      },
      {
        id: 'member-mobile-6',
        name: 'Kai Jiang',
        avatarUrl: AVATAR_KAI,
        isActive: true,
      },
    ],
  },
  'project-api-v2': {
    iconUrl: '/icon-128.png',
    members: [
      {
        id: 'member-api-1',
        name: 'Iris Wang',
        avatarUrl: AVATAR_IRIS,
        isActive: true,
      },
      {
        id: 'member-api-2',
        name: 'Leo Zhou',
        avatarUrl: AVATAR_LEO,
        isActive: true,
      },
      {
        id: 'member-api-3',
        name: 'Tina Fan',
        avatarUrl: AVATAR_TINA,
        isActive: false,
      },
    ],
  },
  'project-marketing-site': {
    iconUrl: '/icon-128.png',
    members: [
      {
        id: 'member-marketing-1',
        name: 'Olivia Gu',
        avatarUrl: AVATAR_OLIVIA,
        isActive: true,
      },
      {
        id: 'member-marketing-2',
        name: 'Jason Fu',
        avatarUrl: AVATAR_JASON,
        isActive: true,
      },
    ],
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

const PLACEHOLDER_ITEMS: Record<ProjectTabKey, Record<string, ProjectWorkspaceSectionItem[]>> = {
  chat: {},
  knowledge: {
    'project-mobile-rebuild': [
      {
        id: 'kb-mobile-1',
        title: 'schema.sql 规范',
        description: '用户表与身份表拆分设计说明。',
        updatedAt: '今天',
      },
      {
        id: 'kb-mobile-2',
        title: 'UI 设计令牌',
        description: '颜色、圆角、间距 token 基线。',
        updatedAt: '昨天',
      },
    ],
    default: [
      {
        id: 'kb-default-1',
        title: '知识文档占位',
        description: '该项目的知识条目将在这里展示。',
        updatedAt: '待接入',
      },
    ],
  },
  members: {
    default: [
      {
        id: 'member-default-1',
        title: '成员列表占位',
        description: '成员详情与角色权限将在此展示。',
      },
    ],
  },
  agents: {
    default: [
      {
        id: 'agent-default-1',
        title: '智能体占位',
        description: '项目智能体配置与运行记录将在此展示。',
      },
    ],
  },
  skills: {
    default: [
      {
        id: 'skill-default-1',
        title: '技能占位',
        description: '项目技能资产将在此展示。',
      },
    ],
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

export const getProjectMeta = (projectId: string): ProjectWorkspaceMeta => {
  return (
    PROJECT_META_BY_ID[projectId] ?? {
      iconUrl: '/icon-128.png',
      members: DEFAULT_MEMBERS,
    }
  );
};

export const getProjectMembers = (projectId: string): ProjectMember[] => {
  return getProjectMeta(projectId).members;
};

export const getConversationsByProject = (projectId: string): ConversationSummary[] => {
  return CONVERSATIONS_BY_PROJECT[projectId] ?? buildFallbackConversations(projectId);
};

export const getMessagesByConversation = (conversationId: string): ChatMessage[] => {
  return MESSAGES_BY_CONVERSATION[conversationId] ?? [];
};

export const getWorkspaceSectionItems = (
  projectId: string,
  tab: ProjectTabKey,
): ProjectWorkspaceSectionItem[] => {
  if (tab === 'members') {
    const members = getProjectMembers(projectId);
    return members.map((member) => ({
      id: member.id,
      title: member.name,
      description: member.isActive ? '活跃成员' : '离线成员',
    }));
  }

  const map = PLACEHOLDER_ITEMS[tab];
  if (!map) {
    return [];
  }

  return map[projectId] ?? map.default ?? [];
};
