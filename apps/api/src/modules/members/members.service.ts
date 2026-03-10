import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { AuthUserProfile } from '@modules/auth/auth.types.js';
import type { ProjectsRepository } from '@modules/projects/projects.repository.js';
import { buildProjectMemberProfileMap } from '@modules/projects/projects.shared.js';
import type { ProjectDocument } from '@modules/projects/projects.types.js';
import type {
  MemberOverviewResponseItem,
  MemberVisibleProjectResponse,
  MembersCommandContext,
  MembersOverviewResponse,
} from './members.types.js';

export interface MembersService {
  listVisibleMembers(context: MembersCommandContext): Promise<MembersOverviewResponse>;
}

interface MemberAggregate {
  profile: AuthUserProfile;
  firstCollaborationAt: Date | null;
  lastProjectActivityAt: Date | null;
  visibleProjects: MemberVisibleProjectResponse[];
}

interface SortableMemberOverviewItem extends MemberOverviewResponseItem {
  isCurrentUser: boolean;
}

const createUnknownMemberProfile = (userId: string): AuthUserProfile => {
  return {
    id: userId,
    username: 'unknown',
    name: '未知成员',
  };
};

const sortProjects = (
  left: MemberVisibleProjectResponse,
  right: MemberVisibleProjectResponse,
): number => {
  const updatedDelta =
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  return left.name.localeCompare(right.name, 'zh-CN');
};

const sortMembers = (
  left: SortableMemberOverviewItem,
  right: SortableMemberOverviewItem,
): number => {
  if (left.isCurrentUser && !right.isCurrentUser) {
    return -1;
  }

  if (!left.isCurrentUser && right.isCurrentUser) {
    return 1;
  }

  if (left.visibleProjectCount !== right.visibleProjectCount) {
    return right.visibleProjectCount - left.visibleProjectCount;
  }

  const leftActivityTime = left.lastProjectActivityAt
    ? new Date(left.lastProjectActivityAt).getTime()
    : 0;
  const rightActivityTime = right.lastProjectActivityAt
    ? new Date(right.lastProjectActivityAt).getTime()
    : 0;

  if (leftActivityTime !== rightActivityTime) {
    return rightActivityTime - leftActivityTime;
  }

  return left.name.localeCompare(right.name, 'zh-CN');
};

const toMemberOverviewItem = (
  aggregate: MemberAggregate,
  actorId: string,
): SortableMemberOverviewItem => {
  const visibleProjects = aggregate.visibleProjects.toSorted(sortProjects);
  const adminProjectCount = visibleProjects.filter(
    (project) => project.role === 'admin',
  ).length;
  const memberProjectCount = visibleProjects.length - adminProjectCount;

  return {
    id: aggregate.profile.id,
    username: aggregate.profile.username,
    name: aggregate.profile.name,
    firstCollaborationAt: aggregate.firstCollaborationAt?.toISOString() ?? null,
    lastProjectActivityAt: aggregate.lastProjectActivityAt?.toISOString() ?? null,
    visibleProjectCount: visibleProjects.length,
    adminProjectCount,
    memberProjectCount,
    visibleProjects,
    isCurrentUser: aggregate.profile.id === actorId,
  };
};

const toMembersOverviewResponseItem = (
  item: SortableMemberOverviewItem,
): MemberOverviewResponseItem => {
  return {
    id: item.id,
    username: item.username,
    name: item.name,
    firstCollaborationAt: item.firstCollaborationAt,
    lastProjectActivityAt: item.lastProjectActivityAt,
    visibleProjectCount: item.visibleProjectCount,
    adminProjectCount: item.adminProjectCount,
    memberProjectCount: item.memberProjectCount,
    visibleProjects: item.visibleProjects,
  };
};

const ensureActorAggregate = async (
  authRepository: AuthRepository,
  actorId: string,
  memberAggregateMap: Map<string, MemberAggregate>,
): Promise<void> => {
  if (memberAggregateMap.has(actorId)) {
    return;
  }

  const [actorProfile] = await authRepository.findProfilesByIds([actorId]);
  if (!actorProfile) {
    return;
  }

  memberAggregateMap.set(actorId, {
    profile: actorProfile,
    firstCollaborationAt: null,
    lastProjectActivityAt: null,
    visibleProjects: [],
  });
};

const upsertMemberAggregate = (
  memberAggregateMap: Map<string, MemberAggregate>,
  project: Pick<ProjectDocument, 'name' | 'description' | 'updatedAt' | 'members'> & {
    _id: NonNullable<ProjectDocument['_id']>;
  },
  userId: string,
  profile: AuthUserProfile,
): void => {
  const projectMembership = project.members.find((member) => member.userId === userId);
  if (!projectMembership) {
    return;
  }

  const currentAggregate = memberAggregateMap.get(userId) ?? {
    profile,
    firstCollaborationAt: null,
    lastProjectActivityAt: null,
    visibleProjects: [],
  };

  currentAggregate.firstCollaborationAt =
    !currentAggregate.firstCollaborationAt ||
    projectMembership.joinedAt < currentAggregate.firstCollaborationAt
      ? projectMembership.joinedAt
      : currentAggregate.firstCollaborationAt;
  currentAggregate.lastProjectActivityAt =
    !currentAggregate.lastProjectActivityAt ||
    project.updatedAt > currentAggregate.lastProjectActivityAt
      ? project.updatedAt
      : currentAggregate.lastProjectActivityAt;
  currentAggregate.profile = profile;
  currentAggregate.visibleProjects.push({
    id: project._id.toHexString(),
    name: project.name,
    description: project.description,
    role: projectMembership.role,
    joinedAt: projectMembership.joinedAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });

  memberAggregateMap.set(userId, currentAggregate);
};

export const createMembersService = ({
  authRepository,
  projectsRepository,
}: {
  authRepository: AuthRepository;
  projectsRepository: ProjectsRepository;
}): MembersService => {
  return {
    listVisibleMembers: async ({ actor }) => {
      const visibleProjects = await projectsRepository.listByMemberUserId(actor.id);
      const memberProfileMap = await buildProjectMemberProfileMap(
        authRepository,
        visibleProjects,
      );
      const memberAggregateMap = new Map<string, MemberAggregate>();

      visibleProjects.forEach((project) => {
        project.members.forEach((member) => {
          const profile =
            memberProfileMap.get(member.userId) ??
            createUnknownMemberProfile(member.userId);

          upsertMemberAggregate(memberAggregateMap, project, member.userId, profile);
        });
      });

      await ensureActorAggregate(authRepository, actor.id, memberAggregateMap);

      const items = Array.from(memberAggregateMap.values())
        .map((aggregate) => toMemberOverviewItem(aggregate, actor.id))
        .sort(sortMembers)
        .map(toMembersOverviewResponseItem);

      return {
        total: items.length,
        items,
      };
    },
  };
};
