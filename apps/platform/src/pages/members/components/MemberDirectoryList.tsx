import { Avatar, Empty, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { MemberViewModel } from '../members.types';
import {
  getCollaborationRoleLabels,
  getInitials,
} from '../members.helpers';
import type { ProjectMemberStatus } from '@app/project/project.types';

interface MemberDirectoryListProps {
  members: MemberViewModel[];
  activeMemberId: string | null;
  onSelect: (memberId: string) => void;
}

const STATUS_MODIFIER: Record<ProjectMemberStatus, string> = {
  active:  'member-card--active',
  syncing: 'member-card--syncing',
  blocked: 'member-card--blocked',
  idle:    '',
};

const STATUS_DOT_MODIFIER: Record<ProjectMemberStatus, string> = {
  active:  'member-card__status-dot--active',
  syncing: 'member-card__status-dot--syncing',
  blocked: 'member-card__status-dot--blocked',
  idle:    'member-card__status-dot--idle',
};

export const MemberDirectoryList = ({
  members,
  activeMemberId,
  onSelect,
}: MemberDirectoryListProps) => {
  const { t } = useTranslation('pages');
  const collaborationRoleLabels = getCollaborationRoleLabels(t);

  if (members.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Empty description={t('members.directory.empty')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((member, index) => {
        const isActive = member.id === activeMemberId;
        const cardModifier = STATUS_MODIFIER[member.primaryStatus];
        const dotModifier = STATUS_DOT_MODIFIER[member.primaryStatus];
        const compactMeta = [
          t('members.directory.projectsCount', {
            count: member.visibleProjectCount,
          }),
          member.primaryRole
            ? collaborationRoleLabels[member.primaryRole]
            : null,
        ]
          .filter(Boolean)
          .join(' · ');

        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelect(member.id)}
            className={`member-card member-card-enter ${cardModifier}`}
            style={{ animationDelay: `${index * 40}ms` }}
            aria-pressed={isActive}
          >
            {/* Status dot — top right */}
            <span
              className={`member-card__status-dot ${dotModifier}`}
              aria-hidden="true"
            />

            {/* Avatar */}
            <Avatar
              size={32}
              src={member.avatarUrl}
              className="member-card__avatar"
            >
              {getInitials(member.name)}
            </Avatar>

            {/* Info */}
            <div className="min-w-0 flex-1 pr-4">
              <div className="flex items-center gap-2">
                <Typography.Text className="truncate text-label font-semibold text-[#1C2B2A]">
                  {member.name}
                </Typography.Text>
                {member.isCurrentUser ? (
                  <span className="member-card__me-badge">
                    {t('members.directory.me')}
                  </span>
                ) : null}
              </div>

              <Typography.Text className="mt-0.5 block truncate text-caption text-[#8AA8A4]">
                {compactMeta}
              </Typography.Text>
            </div>
          </button>
        );
      })}
    </div>
  );
};
