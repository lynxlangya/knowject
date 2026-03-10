import { Avatar, Empty, Typography } from 'antd';
import type { MemberViewModel } from '../members.types';
import { COLLABORATION_ROLE_LABELS, MEMBER_STATUS_META } from '../members.helpers';

interface MemberDirectoryListProps {
  members: MemberViewModel[];
  activeMemberId: string | null;
  onSelect: (memberId: string) => void;
}

const getInitials = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? '')
    .join('');
};

export const MemberDirectoryList = ({
  members,
  activeMemberId,
  onSelect,
}: MemberDirectoryListProps) => {
  if (members.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Empty description="没有符合条件的成员" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((member) => {
        const isActive = member.id === activeMemberId;
        const statusMeta = MEMBER_STATUS_META[member.primaryStatus];
        const compactMeta = `${member.visibleProjectCount} 个项目${
          member.primaryRole
            ? ` · ${COLLABORATION_ROLE_LABELS[member.primaryRole]}`
            : ''
        }`;

        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelect(member.id)}
            className={`w-full rounded-[16px] border px-3 py-2.5 text-left transition ${
              isActive
                ? 'border-emerald-200 bg-emerald-50/70 shadow-[0_12px_30px_rgba(20,184,166,0.08)]'
                : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar
                size={36}
                src={member.avatarUrl}
                className="shrink-0 bg-slate-200 text-slate-600"
              >
                {getInitials(member.name)}
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Typography.Text className="truncate text-[13px] font-semibold text-slate-800">
                    {member.name}
                  </Typography.Text>
                  {member.isCurrentUser ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      我
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <Typography.Text className="mt-1 block truncate text-[11px] text-slate-500">
                  @{member.username} · {compactMeta}
                </Typography.Text>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
