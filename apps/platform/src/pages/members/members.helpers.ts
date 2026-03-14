import type { MemberOverviewResponseItem } from '@api/members';
import type { ProjectRole } from '@api/projects';
import {
  GLOBAL_ASSET_TITLES,
  getCatalogMembers,
  getGlobalAssetById,
} from '@app/project/project.catalog';
import type {
  GlobalAssetItem,
  ProjectMember,
  ProjectMemberRecentActivity,
  ProjectMemberRole,
  ProjectResourceFocus,
  ProjectMemberStatus,
  ProjectSummary,
} from '@app/project/project.types';
import { getProjectMembers } from '@pages/project/project.mock';
import type {
  MemberAssetSummary,
  MemberFiltersState,
  MemberProjectViewModel,
  MemberViewModel,
} from './members.types';

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
});

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const MEMBER_STATUS_META: Record<
  ProjectMemberStatus,
  { label: string; className: string }
> = {
  active: {
    label: '活跃中',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  syncing: {
    label: '同步中',
    className:
      'border-sky-200 bg-sky-50 text-sky-700',
  },
  blocked: {
    label: '有阻塞',
    className:
      'border-rose-200 bg-rose-50 text-rose-700',
  },
  idle: {
    label: '空闲',
    className:
      'border-slate-200 bg-slate-100 text-slate-600',
  },
};

export const PROJECT_ACCESS_ROLE_LABELS: Record<ProjectRole, string> = {
  admin: '项目管理员',
  member: '项目成员',
};

export const COLLABORATION_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: '负责人',
  product: '产品',
  design: '设计',
  frontend: '前端',
  backend: '后端',
  marketing: '市场',
};

const STATUS_ORDER: ProjectMemberStatus[] = [
  'active',
  'syncing',
  'blocked',
  'idle',
];

const buildFallbackFocusSummary = (
  item: Pick<
    MemberOverviewResponseItem,
    'visibleProjectCount' | 'adminProjectCount'
  >,
): string => {
  if (item.visibleProjectCount === 0) {
    return '当前账号还没有加入可见项目，可先在项目成员页完成成员加入。';
  }

  if (item.adminProjectCount > 0) {
    return `当前参与 ${item.visibleProjectCount} 个可见项目，其中 ${item.adminProjectCount} 个项目具备管理员权限。`;
  }

  return `当前参与 ${item.visibleProjectCount} 个可见项目，主要以协作成员身份参与推进。`;
};

const buildFallbackProjectFocusSummary = (projectName: string): string => {
  return `当前已加入 ${projectName}，该项目的详细协作快照待补充。`;
};

const getActivityTimestamp = (
  activity: ProjectMemberRecentActivity | null,
): number => {
  if (!activity) {
    return 0;
  }

  return new Date(activity.occurredAt).getTime();
};

const getFallbackStatus = (
  snapshots: Array<Pick<ProjectMember, 'status'>>,
): ProjectMemberStatus => {
  for (const status of STATUS_ORDER) {
    if (snapshots.some((snapshot) => snapshot.status === status)) {
      return status;
    }
  }

  return 'idle';
};

const pickPrimaryProject = (
  projects: MemberProjectViewModel[],
): MemberProjectViewModel | null => {
  if (projects.length === 0) {
    return null;
  }

  const sortedProjects = [...projects].sort((left, right) => {
    const activityDelta =
      getActivityTimestamp(right.recentActivity) -
      getActivityTimestamp(left.recentActivity);

    if (activityDelta !== 0) {
      return activityDelta;
    }

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });

  return sortedProjects[0] ?? null;
};

const buildUnknownAssetItem = (
  type: ProjectResourceFocus,
  id: string,
): GlobalAssetItem => {
  return {
    id,
    type,
    name: `未知资源（${id}）`,
    description: `该${GLOBAL_ASSET_TITLES[type]}已绑定到当前成员可见项目，但本地尚未拿到完整元数据。`,
    updatedAt: '未记录',
    owner: '未指定',
    usageCount: 0,
  };
};

const resolveMemberAsset = (
  type: ProjectResourceFocus,
  id: string,
): GlobalAssetItem => {
  return getGlobalAssetById(type, id) ?? buildUnknownAssetItem(type, id);
};

const dedupeAssets = (items: GlobalAssetItem[]): GlobalAssetItem[] => {
  const assetMap = new Map<string, GlobalAssetItem>();

  items.forEach((item) => {
    assetMap.set(item.id, item);
  });

  return Array.from(assetMap.values());
};

const buildProjectSnapshotIndex = (
  projects: ProjectSummary[],
): Map<string, ProjectMember> => {
  const snapshotIndex = new Map<string, ProjectMember>();

  projects.forEach((project) => {
    getProjectMembers(project).forEach((member) => {
      snapshotIndex.set(`${project.id}:${member.id}`, member);
    });
  });

  return snapshotIndex;
};

const buildMemberProjects = (
  item: MemberOverviewResponseItem,
  projects: ProjectSummary[],
  snapshotIndex: Map<string, ProjectMember>,
): MemberProjectViewModel[] => {
  const projectMap = new Map(projects.map((project) => [project.id, project] as const));

  return item.visibleProjects.map((visibleProject) => {
    const project = projectMap.get(visibleProject.id) ?? null;
    const snapshot =
      snapshotIndex.get(`${visibleProject.id}:${item.id}`) ?? null;

    return {
      id: visibleProject.id,
      name: visibleProject.name,
      description: visibleProject.description,
      projectRole: visibleProject.role,
      joinedAt: visibleProject.joinedAt,
      updatedAt: visibleProject.updatedAt,
      knowledgeCount: project?.knowledgeBaseIds.length ?? 0,
      skillCount: project?.skillIds.length ?? 0,
      agentCount: project?.agentIds.length ?? 0,
      collaborationRole: snapshot?.role ?? null,
      status: snapshot?.status ?? 'idle',
      focusSummary:
        snapshot?.focusSummary ??
        buildFallbackProjectFocusSummary(visibleProject.name),
      responsibilityTags: snapshot?.responsibilityTags ?? [],
      recentActivity: snapshot?.recentActivity ?? null,
    };
  });
};

const buildMemberAssets = (
  memberProjects: MemberProjectViewModel[],
  projects: ProjectSummary[],
): MemberAssetSummary => {
  const projectMap = new Map(projects.map((project) => [project.id, project] as const));
  const knowledgeIds = new Set<string>();
  const skillIds = new Set<string>();
  const agentIds = new Set<string>();

  memberProjects.forEach((memberProject) => {
    const project = projectMap.get(memberProject.id);
    if (!project) {
      return;
    }

    project.knowledgeBaseIds.forEach((id) => {
      knowledgeIds.add(id);
    });
    project.skillIds.forEach((id) => {
      skillIds.add(id);
    });
    project.agentIds.forEach((id) => {
      agentIds.add(id);
    });
  });

  return {
    knowledge: dedupeAssets(
      Array.from(knowledgeIds).map((id) => resolveMemberAsset('knowledge', id)),
    ),
    skills: dedupeAssets(
      Array.from(skillIds).map((id) => resolveMemberAsset('skills', id)),
    ),
    agents: dedupeAssets(
      Array.from(agentIds).map((id) => resolveMemberAsset('agents', id)),
    ),
  };
};

export const buildMemberViewModels = ({
  items,
  projects,
  currentUserId,
}: {
  items: MemberOverviewResponseItem[];
  projects: ProjectSummary[];
  currentUserId: string | null;
}): MemberViewModel[] => {
  const avatarMap = new Map(
    getCatalogMembers().map((member) => [member.id, member.avatarUrl] as const),
  );
  const snapshotIndex = buildProjectSnapshotIndex(projects);

  return items.map((item) => {
    const memberProjects = buildMemberProjects(item, projects, snapshotIndex);
    const primaryProject = pickPrimaryProject(memberProjects);
    const assets = buildMemberAssets(memberProjects, projects);
    const responsibilityTags = Array.from(
      new Set(memberProjects.flatMap((project) => project.responsibilityTags)),
    ).slice(0, 6);
    const statusBreakdown = memberProjects.reduce(
      (result, project) => {
        result[project.status] += 1;
        return result;
      },
      {
        active: 0,
        syncing: 0,
        blocked: 0,
        idle: 0,
      } as Record<ProjectMemberStatus, number>,
    );

    return {
      ...item,
      avatarUrl: avatarMap.get(item.id),
      isCurrentUser: currentUserId === item.id,
      primaryStatus:
        primaryProject?.status ?? getFallbackStatus(memberProjects),
      primaryRole: primaryProject?.collaborationRole ?? null,
      focusSummary:
        primaryProject?.focusSummary ?? buildFallbackFocusSummary(item),
      responsibilityTags,
      recentActivity: primaryProject?.recentActivity ?? null,
      activeProjectCount: statusBreakdown.active,
      syncingProjectCount: statusBreakdown.syncing,
      blockedProjectCount: statusBreakdown.blocked,
      idleProjectCount: statusBreakdown.idle,
      projects: memberProjects,
      assets,
    };
  });
};

const getMemberActivitySortValue = (member: MemberViewModel): number => {
  if (member.recentActivity) {
    return new Date(member.recentActivity.occurredAt).getTime();
  }

  if (member.lastProjectActivityAt) {
    return new Date(member.lastProjectActivityAt).getTime();
  }

  return 0;
};

const getMemberJoinedSortValue = (member: MemberViewModel): number => {
  if (!member.firstCollaborationAt) {
    return 0;
  }

  return new Date(member.firstCollaborationAt).getTime();
};

export const filterMemberViewModels = (
  members: MemberViewModel[],
  filters: MemberFiltersState,
): MemberViewModel[] => {
  const normalizedQuery = filters.query.trim().toLowerCase();

  const filteredMembers = members.filter((member) => {
    const matchesQuery =
      !normalizedQuery ||
      member.name.toLowerCase().includes(normalizedQuery) ||
      member.username.toLowerCase().includes(normalizedQuery) ||
      member.projects.some((project) =>
        project.name.toLowerCase().includes(normalizedQuery),
      );

    if (!matchesQuery) {
      return false;
    }

    if (filters.status !== 'all' && member.primaryStatus !== filters.status) {
      return false;
    }

    if (filters.adminScope === 'admin' && member.adminProjectCount === 0) {
      return false;
    }

    if (filters.adminScope === 'member' && member.adminProjectCount > 0) {
      return false;
    }

    if (
      filters.projectId !== 'all' &&
      !member.projects.some((project) => project.id === filters.projectId)
    ) {
      return false;
    }

    return true;
  });

  return [...filteredMembers].sort((left, right) => {
    if (filters.sortBy === 'projects') {
      if (left.visibleProjectCount !== right.visibleProjectCount) {
        return right.visibleProjectCount - left.visibleProjectCount;
      }
    }

    if (filters.sortBy === 'joined') {
      const joinedDelta =
        getMemberJoinedSortValue(right) - getMemberJoinedSortValue(left);

      if (joinedDelta !== 0) {
        return joinedDelta;
      }
    }

    const activityDelta =
      getMemberActivitySortValue(right) - getMemberActivitySortValue(left);

    if (activityDelta !== 0) {
      return activityDelta;
    }

    return left.name.localeCompare(right.name, 'zh-CN');
  });
};

export const formatDisplayDate = (value: string | null): string => {
  if (!value) {
    return '—';
  }

  return dateFormatter.format(new Date(value));
};

export const formatDisplayDateTime = (value: string | null): string => {
  if (!value) {
    return '—';
  }

  return dateTimeFormatter.format(new Date(value));
};

export const getAssetGroupTitle = (
  key: keyof MemberAssetSummary,
): string => {
  if (key === 'knowledge') {
    return GLOBAL_ASSET_TITLES.knowledge;
  }

  if (key === 'skills') {
    return GLOBAL_ASSET_TITLES.skills;
  }

  return GLOBAL_ASSET_TITLES.agents;
};
