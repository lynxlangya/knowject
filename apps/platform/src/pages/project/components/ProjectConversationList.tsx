import { Empty } from 'antd';
import type { ConversationSummary } from '@app/project/project.types';
import {
  buildProjectConversationItems,
} from '../projectChat.adapters';

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
  const items = buildProjectConversationItems({
    conversations,
    activeConversationId,
  });

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
      {items.map((item) => {
        const active = String(item.key) === activeConversationId;

        return (
          <li key={item.key}>
            <button
              type="button"
              className="block w-full rounded-[24px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100 focus-visible:ring-offset-2"
              aria-pressed={active}
              onClick={() => onSelect(String(item.key))}
            >
              {item.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
};
