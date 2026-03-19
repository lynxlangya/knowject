import { getCatalogMembers } from '@app/project/project.catalog';
import type {
  ProjectMember,
  ProjectSummary,
  ProjectWorkspaceMeta,
  ProjectWorkspaceSnapshot,
} from '@app/project/project.types';

type ProjectMemberSnapshot = Omit<ProjectMember, 'id' | 'name' | 'avatarUrl'>;

const PROJECT_MEMBER_SNAPSHOTS_BY_PROJECT: Record<
  string,
  Record<string, ProjectMemberSnapshot>
> = {
  'project-mobile-rebuild': {
    'member-alex': {
      isActive: true,
      role: 'owner',
      status: 'active',
      responsibilityTags: ['重构范围', '技术取舍', '里程碑推进'],
      focusSummary:
        '统筹移动端重构范围、关键取舍与迭代节奏，保证体验统一与技术债治理同步推进。',
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
      focusSummary:
        '负责收敛核心路径的交互结构与组件表达，减少页面风格与层级不一致的问题。',
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
      focusSummary:
        '将新的项目信息架构落到页面实现，并持续处理布局链路、交互细节与兼容跳转。',
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
      focusSummary:
        '推动 API V2 分阶段切流，确保迁移窗口、监控阈值与回滚机制都可执行。',
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
      focusSummary:
        '负责统一 Bearer Token 约定与网关校验策略，目前等待切流方案与网关配置窗口对齐。',
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
      focusSummary:
        '负责收敛营销站点的主叙事与转化结构，确保品牌表达与产品价值一致。',
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
      focusSummary:
        '持续补齐站点内容资产与投放文案，保证营销页面上线节奏与素材供给同步。',
      recentActivity: {
        type: 'resource',
        summary: '整理品牌资产库并补充首页文案素材',
        occurredAt: '2026-03-08T11:40:00.000Z',
        displayTime: '昨天 11:40',
      },
    },
  },
};

const DEFAULT_PROJECT_SUMMARY =
  '聚焦当前项目的知识沉淀、协作过程和 AI 能力接入。';

const PROJECT_META_BY_ID: Record<string, Pick<ProjectWorkspaceMeta, 'iconUrl'>> =
  {
    'project-mobile-rebuild': {
      iconUrl: '/icon-128.png',
    },
    'project-api-v2': {
      iconUrl: '/icon-128.png',
    },
    'project-marketing-site': {
      iconUrl: '/icon-128.png',
    },
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

const resolveCatalogMemberAvatar = (name: string): string | undefined => {
  const catalogMembers = getCatalogMembers();
  return catalogMembers.find((member) => member.name === name)?.avatarUrl;
};

const mapProjectRosterMembers = (
  projectId: string,
  rosterMembers: ProjectSummary['members'],
): ProjectMember[] => {
  const projectSnapshots = PROJECT_MEMBER_SNAPSHOTS_BY_PROJECT[projectId] ?? {};

  return rosterMembers.map((member, index) => ({
    id: member.userId,
    name: member.name,
    avatarUrl: resolveCatalogMemberAvatar(member.name),
    ...(projectSnapshots[member.userId] ?? buildDefaultMemberSnapshot(index)),
  }));
};

const getProjectMeta = (
  project: Pick<ProjectSummary, 'id' | 'description'>,
): ProjectWorkspaceMeta => {
  return {
    iconUrl: PROJECT_META_BY_ID[project.id]?.iconUrl ?? '/icon-128.png',
    summary: project.description.trim() || DEFAULT_PROJECT_SUMMARY,
  };
};

export const getProjectMembers = (
  project: Pick<ProjectSummary, 'id' | 'members'>,
): ProjectMember[] => {
  return mapProjectRosterMembers(project.id, project.members);
};

export const getProjectWorkspaceSnapshot = (
  project: Pick<
    ProjectSummary,
    'id' | 'description' | 'knowledgeBaseIds' | 'skillIds' | 'agentIds' | 'members'
  >,
  conversationCount: number,
  options: {
    projectKnowledgeCount?: number;
  } = {},
): ProjectWorkspaceSnapshot => {
  const members = getProjectMembers(project);
  const projectKnowledgeCount = options.projectKnowledgeCount ?? 0;

  return {
    members,
    meta: getProjectMeta(project),
    stats: {
      activeMembers: members.filter((member) => member.isActive).length,
      conversationCount,
      knowledgeCount: project.knowledgeBaseIds.length + projectKnowledgeCount,
      agentCount: project.agentIds.length,
      skillCount: project.skillIds.length,
    },
  };
};
