import { Empty, Typography } from 'antd';
import type { ConversationSummary } from '@app/project/project.types';
import { KNOWJECT_BRAND } from '@styles/brand';

interface ProjectConversationListProps {
  conversations: ConversationSummary[];
  activeConversationId?: string;
  onSelect: (conversationId: string) => void;
}

const formatConversationUpdatedAt = (value: string): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const ProjectConversationList = ({
  conversations,
  activeConversationId,
  onSelect,
}: ProjectConversationListProps) => {
  if (conversations.length === 0) {
    return (
      <div className="grid h-full place-items-center px-3">
        <div className="w-full rounded-[28px] border border-dashed border-slate-200 bg-white/75 px-6 py-10 text-center shadow-[0_12px_28px_rgba(15,23,42,0.035)]">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该项目暂无对话" />
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {conversations.map((conversation) => {
        const active = conversation.id === activeConversationId;

        return (
          <li key={conversation.id}>
            <button
              type="button"
              className={[
                'group relative w-full overflow-hidden rounded-[24px] border px-4 py-4 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:-translate-y-0.5',
                active
                  ? 'bg-white shadow-[0_14px_30px_rgba(15,23,42,0.045)]'
                  : 'border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:bg-slate-50/70',
              ].join(' ')}
              style={
                active
                  ? {
                      borderColor: KNOWJECT_BRAND.primaryBorder,
                      boxShadow: `0 12px 28px ${KNOWJECT_BRAND.primaryGlow}`,
                    }
                  : undefined
              }
              onClick={() => onSelect(conversation.id)}
            >
              <span
                className={[
                  'absolute bottom-4 left-0 top-4 w-1 rounded-full transition-colors duration-200',
                  active ? '' : 'bg-slate-200/70 group-hover:bg-slate-300/80',
                ].join(' ')}
                style={
                  active
                    ? { backgroundColor: KNOWJECT_BRAND.primary }
                    : undefined
                }
                aria-hidden="true"
              />

              <div className="pl-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={[
                          'h-2.5 w-2.5 rounded-full transition-colors duration-200',
                          active ? 'bg-emerald-400' : 'bg-slate-300 group-hover:bg-slate-400',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                      <Typography.Text
                        className={[
                          'text-[11px] font-semibold uppercase tracking-[0.18em]',
                          active ? 'text-emerald-600' : 'text-slate-400',
                        ].join(' ')}
                      >
                        {active ? '当前线程' : '最近活跃'}
                      </Typography.Text>
                    </div>
                  </div>

                  <span
                    className={[
                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                      active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {formatConversationUpdatedAt(conversation.updatedAt)}
                  </span>
                </div>

                <Typography.Text className="block [display:-webkit-box] overflow-hidden text-[15px] font-semibold leading-7 text-slate-800 [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {conversation.title}
                </Typography.Text>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
