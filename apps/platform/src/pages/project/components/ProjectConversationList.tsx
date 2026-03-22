import { Dropdown, Empty, Input } from 'antd';
import type { ConversationSummary } from '@app/project/project.types';
import {
  buildProjectConversationContextMenuItems,
  type ProjectConversationContextAction,
} from '../projectChat.adapters';
import {
  ProjectConversationLabel,
} from '../projectChat.components';
import { tp } from '../project.i18n';

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
        <div className="w-full rounded-hero border border-dashed border-slate-200 bg-white/75 px-6 py-10 text-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={tp('conversation.empty')}
          />
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {conversations.map((conversation) => {
        const active = conversation.id === activeConversationId;
        const editing = conversation.id === editingConversationId;
        const label = (
          <ProjectConversationLabel
            conversation={conversation}
            active={active}
            titleContent={
              editing ? (
                <div className="space-y-1">
                  <Input
                    autoFocus
                    size="middle"
                    maxLength={80}
                    value={editingTitleDraft}
                    disabled={renamingConversation}
                    placeholder={tp('conversation.renamePlaceholder')}
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
              ) : undefined
            }
          />
        );

        return (
          <li key={conversation.id}>
            {editing ? (
              <div className="rounded-3xl">{label}</div>
            ) : (
              <Dropdown
                trigger={['contextMenu']}
                menu={{
                  items: buildProjectConversationContextMenuItems({
                    conversationsCount: conversations.length,
                    actionsLocked,
                  }),
                  onClick: ({ key, domEvent }) => {
                    domEvent.preventDefault();
                    domEvent.stopPropagation();
                    onAction(key as ProjectConversationContextAction, conversation);
                  },
                }}
              >
                <button
                  type="button"
                  title={tp('conversation.openOrMenu')}
                  className="block w-full rounded-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100 focus-visible:ring-offset-2"
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
