import { Empty, Typography } from 'antd';
import type { ConversationSummary } from '@app/project/project.types';
import { KNOWJECT_BRAND } from '@styles/brand';

interface ProjectConversationListProps {
  conversations: ConversationSummary[];
  activeConversationId?: string;
  onSelect: (conversationId: string) => void;
}

export const ProjectConversationList = ({
  conversations,
  activeConversationId,
  onSelect,
}: ProjectConversationListProps) => {
  if (conversations.length === 0) {
    return (
      <div className="grid h-full place-items-center">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该项目暂无对话" />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {conversations.map((conversation) => {
        const active = conversation.id === activeConversationId;

        return (
          <li key={conversation.id}>
            <button
              type="button"
              className={[
                'w-full rounded-r-[18px] border-l-2 px-4 py-4 text-left transition-colors',
                active
                  ? 'bg-white/90 shadow-[0_8px_20px_rgba(15,23,42,0.035)]'
                  : 'border-l-transparent hover:bg-white/85',
              ].join(' ')}
              style={active ? { borderLeftColor: KNOWJECT_BRAND.primary } : undefined}
              onClick={() => onSelect(conversation.id)}
            >
              <div className="mb-1 flex items-start justify-between gap-3">
                <Typography.Text className="truncate text-base font-semibold text-slate-800">
                  {conversation.title}
                </Typography.Text>
                <Typography.Text className="shrink-0 text-xs text-slate-400">
                  {conversation.updatedAt}
                </Typography.Text>
              </div>
              <Typography.Text className="block text-sm text-slate-600">
                {conversation.preview}
              </Typography.Text>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
