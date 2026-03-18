import { Dropdown, Empty, Input, type MenuProps } from 'antd';
import type { ConversationSummary } from '@app/project/project.types';
import {
  renderProjectConversationLabel,
} from '../projectChat.adapters';

export type ProjectConversationContextAction =
  | 'share'
  | 'knowledge'
  | 'resources'
  | 'rename'
  | 'delete';

interface ProjectConversationListProps {
  conversations: ConversationSummary[];
  activeConversationId?: string;
  onSelect: (conversationId: string) => void;
  onAction: (
    action: ProjectConversationContextAction,
    conversation: ConversationSummary,
  ) => void;
  actionsLocked?: boolean;
  editingConversationId?: string;
  editingTitleDraft: string;
  renamingConversation?: boolean;
  onEditingTitleDraftChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}

export const ProjectConversationList = ({
  conversations,
  activeConversationId,
  onSelect,
  onAction,
  actionsLocked = false,
  editingConversationId,
  editingTitleDraft,
  renamingConversation = false,
  onEditingTitleDraftChange,
  onRenameSubmit,
  onRenameCancel,
}: ProjectConversationListProps) => {
  if (conversations.length === 0) {
    return (
      <div className="grid h-full place-items-center px-3">
        <div className="w-full rounded-[28px] border border-dashed border-slate-200 bg-white/75 px-6 py-10 text-center">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该项目暂无对话" />
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {conversations.map((conversation) => {
        const active = conversation.id === activeConversationId;
        const editing = conversation.id === editingConversationId;
        const menuItems: NonNullable<MenuProps['items']> = [
          {
            key: 'share',
            label: '分享',
            disabled: actionsLocked,
          },
          {
            key: 'knowledge',
            label: '沉淀为知识',
            disabled: actionsLocked,
          },
          {
            key: 'resources',
            label: '查看相关资源',
            disabled: actionsLocked,
          },
          {
            type: 'divider',
          },
          {
            key: 'rename',
            label: '重命名',
            disabled: actionsLocked,
          },
          {
            key: 'delete',
            label: '删除',
            danger: true,
            disabled: actionsLocked || conversations.length <= 1,
          },
        ];
        const label = renderProjectConversationLabel({
          conversation,
          active,
          titleContent: editing ? (
            <div className="space-y-1">
              <Input
                autoFocus
                size="middle"
                maxLength={80}
                value={editingTitleDraft}
                disabled={renamingConversation}
                placeholder="输入线程标题"
                className="rounded-[10px]! border-slate-200! bg-white!"
                onChange={(event) =>
                  onEditingTitleDraftChange(event.target.value)
                }
                onPressEnter={(event) => {
                  if (event.nativeEvent.isComposing) {
                    return;
                  }

                  event.preventDefault();
                  onRenameSubmit();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    onRenameCancel();
                  }
                }}
              />
            </div>
          ) : undefined,
        });

        return (
          <li key={conversation.id}>
            {editing ? (
              <div className="rounded-[24px]">{label}</div>
            ) : (
              <Dropdown
                trigger={['contextMenu']}
                menu={{
                  items: menuItems,
                  onClick: ({ key, domEvent }) => {
                    domEvent.preventDefault();
                    domEvent.stopPropagation();
                    onAction(key as ProjectConversationContextAction, conversation);
                  },
                }}
              >
                <button
                  type="button"
                  title="左键打开，右键更多操作"
                  className="block w-full rounded-[24px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100 focus-visible:ring-offset-2"
                  aria-pressed={active}
                  onClick={() => onSelect(conversation.id)}
                >
                  {label}
                </button>
              </Dropdown>
            )}
          </li>
        );
      })}
    </ul>
  );
};
