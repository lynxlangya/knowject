import type { TFunction } from 'i18next';
import type { MemberOverviewResponseItem } from '@api/members';
import type { ProjectRole } from '@api/projects';
import type { SkillSummaryResponse } from '@api/skills';
import {
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
import { getProjectMembers } from '@pages/project/projectWorkspaceSnapshot.mock';
import type {
  MemberAssetSummary,
  MemberFiltersState,
  MemberProjectViewModel,
  MemberViewModel,
} from './members.types';

export const getMemberStatusMeta = (
  t: TFunction<'pages'>,
): Record<
  ProjectMemberStatus,
  { label: string; className: string }
> => ({
  active: {
    label: t('members.status.active'),
    className: 'border-[#C2EDE6] bg-[#F2FDFB] text-[#1A8A77]',
  },
  syncing: {
    label: t('members.status.syncing'),
    className: 'border-[#B8D4E8] bg-[#EDF9FD] text-[#1E6A8A]',
  },
  blocked: {
    label: t('members.status.blocked'),
    className: 'border-[#FECDD3] bg-[#FFF1F2] text-[#9F1239]',
  },
  idle: {
    label: t('members.status.idle'),
    className: 'border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]',
  },
});

export const getProjectAccessRoleLabels = (
  t: TFunction<'pages'>,
): Record<ProjectRole, string> => ({
  admin: t('members.accessRole.admin'),
  member: t('members.accessRole.member'),
});

export const getCollaborationRoleLabels = (
  t: TFunction<'pages'>,
): Record<ProjectMemberRole, string> => ({
  owner: t('members.collaborationRole.owner'),
  product: t('members.collaborationRole.product'),
  design: t('members.collaborationRole.design'),
  frontend: t('members.collaborationRole.frontend'),
  backend: t('members.collaborationRole.backend'),
  marketing: t('members.collaborationRole.marketing'),
});

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
  t: TFunction<'pages'>,
): string => {
  if (item.visibleProjectCount === 0) {
    return t('members.focus.noVisibleProject');
  }

  if (item.adminProjectCount > 0) {
    return t('members.focus.adminProjects', {
      visibleProjectCount: item.visibleProjectCount,
      adminProjectCount: item.adminProjectCount,
    });
  }

  return t('members.focus.memberProjects', {
    visibleProjectCount: item.visibleProjectCount,
  });
};

const buildFallbackProjectFocusSummary = (
  projectName: string,
  t: TFunction<'pages'>,
): string => {
  return t('members.focus.projectFallback', {
    projectName,
  });
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
  t: TFunction<'pages'>,
): GlobalAssetItem => {
  const typeLabel = getAssetGroupTitle(t, type === 'knowledge' ? 'knowledge' : type);

  return {
    id,
    type,
    name: t('members.assets.unknownName', { id }),
    description: t('members.assets.unknownDescription', { typeLabel }),
    updatedAt: t('members.assets.notRecorded'),
    owner: t('members.assets.unspecifiedOwner'),
    usageCount: 0,
  };
};

const resolveMemberAsset = (
  type: ProjectResourceFocus,
  id: string,
  t: TFunction<'pages'>,
): GlobalAssetItem => {
  return getGlobalAssetById(type, id) ?? buildUnknownAssetItem(type, id, t);
};

const resolveSkillAsset = (
  id: string,
  skillsCatalog: SkillSummaryResponse[],
  t: TFunction<'pages'>,
  locale: string,
): GlobalAssetItem => {
  const skill = skillsCatalog.find((item) => item.id === id);

  if (!skill) {
    return buildUnknownAssetItem('skills', id, t);
  }

  return {
    id: skill.id,
    type: 'skills',
    name: skill.name,
    description: skill.description,
    updatedAt: formatDisplayDateTime(skill.updatedAt, locale, t),
    owner:
      skill.source === 'system'
        ? t('members.assets.system')
        : skill.source === 'imported'
          ? t('members.assets.imported')
          : t('members.assets.team'),
    usageCount: 0,
  };
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
  t: TFunction<'pages'>,
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
        buildFallbackProjectFocusSummary(visibleProject.name, t),
      responsibilityTags: snapshot?.responsibilityTags ?? [],
      recentActivity: snapshot?.recentActivity ?? null,
    };
  });
};

const buildMemberAssets = (
  memberProjects: MemberProjectViewModel[],
  projects: ProjectSummary[],
  skillsCatalog: SkillSummaryResponse[],
  t: TFunction<'pages'>,
  locale: string,
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
      Array.from(knowledgeIds).map((id) => resolveMemberAsset('knowledge', id, t)),
    ),
    skills: dedupeAssets(
      Array.from(skillIds).map((id) => resolveSkillAsset(id, skillsCatalog, t, locale)),
    ),
    agents: dedupeAssets(
      Array.from(agentIds).map((id) => resolveMemberAsset('agents', id, t)),
    ),
  };
};

export const buildMemberViewModels = ({
  items,
  projects,
  currentUserId,
  skillsCatalog,
  t,
  locale,
}: {
  items: MemberOverviewResponseItem[];
  projects: ProjectSummary[];
  currentUserId: string | null;
  skillsCatalog: SkillSummaryResponse[];
  t: TFunction<'pages'>;
  locale: string;
}): MemberViewModel[] => {
  const avatarMap = new Map(
    getCatalogMembers().map((member) => [member.id, member.avatarUrl] as const),
  );
  const snapshotIndex = buildProjectSnapshotIndex(projects);

  return items.map((item) => {
    const memberProjects = buildMemberProjects(item, projects, snapshotIndex, t);
    const primaryProject = pickPrimaryProject(memberProjects);
    const assets = buildMemberAssets(memberProjects, projects, skillsCatalog, t, locale);
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
        primaryProject?.focusSummary ?? buildFallbackFocusSummary(item, t),
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

// ── Shared helpers ──────────────────────────────────────────────────────────────

export const getInitials = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? '')
    .join('');
};

export const formatDisplayDate = (
  value: string | null,
  locale: string,
  t: TFunction<'pages'>,
): string => {
  if (!value) {
    return t('members.date.empty');
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(new Date(value));
};

export const formatDisplayDateTime = (
  value: string | null,
  locale: string,
  t: TFunction<'pages'>,
): string => {
  if (!value) {
    return t('members.date.empty');
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export const getAssetGroupTitle = (
  t: TFunction<'pages'>,
  key: keyof MemberAssetSummary,
): string => {
  if (key === 'knowledge') {
    return t('members.assets.knowledge');
  }

  if (key === 'skills') {
    return t('members.assets.skills');
  }

  return t('members.assets.agents');
};
