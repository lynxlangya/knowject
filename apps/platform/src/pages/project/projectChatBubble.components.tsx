import {
  CopyOutlined,
  EditOutlined,
  FileTextOutlined,
  RedoOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { Drawer, Typography } from 'antd';
import React from 'react';
import type { MouseEvent } from 'react';
import i18n from '../../i18n';
import type {
  ProjectConversationCitationContent,
  ProjectConversationSourceResponse,
} from '../../api/projects';
import { ProjectChatMarkdown } from './projectChat.markdown';
import {
  buildProjectChatCitationViewModel,
  canUseProjectChatCitationMode,
  type ProjectChatCitationDocumentEntryViewModel,
} from './projectChatCitations';
import { PROJECT_CHAT_STAR_CLASS_NAMES } from './projectChatStar.styles';
import { tp } from './project.i18n';

export interface ProjectChatUserBubbleActions {
  editing: boolean;
  disabled: boolean;
  onRetry: () => void;
  onEditStart: () => void;
  onEditConfirm: (content: string) => void;
  onEditCancel: () => void;
  onCopy: () => void;
}

export interface ProjectChatAssistantBubbleActions {
  copyDisabled: boolean;
  retryDisabled: boolean;
  starDisabled: boolean;
  starring: boolean;
  starred: boolean;
  onCopy: () => void;
  onRetry: () => void;
  onToggleStar: () => void;
}

export interface ProjectChatBubbleExtraInfo {
  createdAt: string;
  sources: ProjectConversationSourceResponse[];
  citationContent?: ProjectConversationCitationContent;
  messageId?: string;
  status?: ProjectChatBubbleStatus;
  assistantActions?: ProjectChatAssistantBubbleActions;
  userActions?: ProjectChatUserBubbleActions;
}

export type ProjectChatBubbleStatus = 'streaming' | 'reconciling';

void React;

const formatMessageTime = (value: string): string => {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatSourceDistance = (value: number | null): string | null => {
  if (value === null) {
    return null;
  }

  return tp('conversation.sourceDistance', { value: value.toFixed(2) });
};

const getProjectChatBubbleStatusLabel = (status: ProjectChatBubbleStatus): string => {
  return tp(`conversation.status.${status}`);
};

const getProjectChatSourceFileName = (sourceLabel: string): string => {
  return sourceLabel.split(/[\\/]/).filter(Boolean).pop() || sourceLabel;
};

interface ProjectConversationSourceDocumentGroup {
  id: string;
  sourceLabel: string;
  entries: ProjectChatCitationDocumentEntryViewModel[];
}

const buildProjectConversationSourceDocumentGroups = (
  sources: ProjectConversationSourceResponse[],
): ProjectConversationSourceDocumentGroup[] => {
  const documentGroupById = new Map<string, ProjectConversationSourceDocumentGroup>();
  const documentGroups: ProjectConversationSourceDocumentGroup[] = [];

  sources.forEach((source) => {
    const documentGroupId = `${source.knowledgeId}:${source.documentId}`;
    let documentGroup = documentGroupById.get(documentGroupId);

    if (!documentGroup) {
      documentGroup = {
        id: documentGroupId,
        sourceLabel: source.source,
        entries: [],
      };
      documentGroupById.set(documentGroupId, documentGroup);
      documentGroups.push(documentGroup);
    }

    if (!documentGroup.entries.some((entry) => entry.id === source.id)) {
      documentGroup.entries.push({
        id: source.id,
        snippet: source.snippet,
        distance: source.distance,
      });
    }
  });

  return documentGroups;
};

const ProjectConversationSourceDetailCard = ({
  documentGroup,
}: {
  documentGroup: ProjectConversationSourceDocumentGroup;
}) => {
  const fileName = getProjectChatSourceFileName(documentGroup.sourceLabel);

  return (
    <div
      data-conversation-source-detail={documentGroup.id}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <FileTextOutlined className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <Typography.Text className="block truncate text-sm font-semibold text-slate-800">
              {fileName}
            </Typography.Text>
            {documentGroup.sourceLabel !== fileName ? (
              <Typography.Text className="mt-0.5 block text-caption leading-5 text-slate-400">
                {documentGroup.sourceLabel}
              </Typography.Text>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          {documentGroup.entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
            >
              {formatSourceDistance(entry.distance) ? (
                <Typography.Text className="mb-1 block text-[11px] font-medium text-slate-400">
                  {formatSourceDistance(entry.distance)}
                </Typography.Text>
              ) : null}
              <Typography.Paragraph className="mb-0! text-xs! leading-6! text-slate-600!">
                {entry.snippet}
              </Typography.Paragraph>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProjectConversationSourcesPanel = ({
  documentGroups,
  activeDocumentGroupId,
  onSelectDocumentGroup,
}: {
  documentGroups: ProjectConversationSourceDocumentGroup[];
  activeDocumentGroupId: string | null;
  onSelectDocumentGroup: (documentGroupId: string) => void;
}) => {
  const activeDocumentGroup =
    documentGroups.find((documentGroup) => documentGroup.id === activeDocumentGroupId) ??
    documentGroups[0];

  if (!activeDocumentGroup) {
    return null;
  }

  return (
    <div
      data-conversation-sources-panel="true"
      className="space-y-4"
    >
      {documentGroups.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {documentGroups.map((documentGroup) => {
            const fileName = getProjectChatSourceFileName(documentGroup.sourceLabel);
            const active = documentGroup.id === activeDocumentGroup.id;

            return (
              <button
                key={documentGroup.id}
                type="button"
                data-conversation-source-switch={documentGroup.id}
                className={[
                  'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                  active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800',
                ].join(' ')}
                onClick={() => onSelectDocumentGroup(documentGroup.id)}
              >
                <FileTextOutlined className="text-xs" />
                <span className="max-w-52 truncate">{fileName}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <ProjectConversationSourceDetailCard documentGroup={activeDocumentGroup} />
    </div>
  );
};

const ProjectConversationSourcesDrawerTrigger = ({
  sources,
  renderTrigger,
}: {
  sources: ProjectConversationSourceResponse[];
  renderTrigger: (args: {
    openDrawer: (documentGroupId?: string) => void;
    open: boolean;
  }) => React.ReactNode;
}) => {
  const documentGroups = buildProjectConversationSourceDocumentGroups(sources);
  const [sourcesDrawerOpen, setSourcesDrawerOpen] = React.useState(false);
  const [activeDocumentGroupId, setActiveDocumentGroupId] = React.useState<string | null>(
    documentGroups[0]?.id ?? null,
  );

  React.useEffect(() => {
    if (documentGroups.length === 0) {
      setActiveDocumentGroupId(null);
      return;
    }

    if (
      activeDocumentGroupId &&
      documentGroups.some((documentGroup) => documentGroup.id === activeDocumentGroupId)
    ) {
      return;
    }

    setActiveDocumentGroupId(documentGroups[0]?.id ?? null);
  }, [activeDocumentGroupId, documentGroups]);

  if (documentGroups.length === 0) {
    return null;
  }

  const openDrawer = (documentGroupId?: string) => {
    setActiveDocumentGroupId(documentGroupId ?? documentGroups[0]?.id ?? null);
    setSourcesDrawerOpen(true);
  };

  return (
    <>
      {renderTrigger({
        openDrawer,
        open: sourcesDrawerOpen,
      })}
      <Drawer
        open={sourcesDrawerOpen}
        size={480}
        placement="right"
        title={tp('conversation.references')}
        destroyOnClose={false}
        onClose={() => setSourcesDrawerOpen(false)}
      >
        <ProjectConversationSourcesPanel
          documentGroups={documentGroups}
          activeDocumentGroupId={activeDocumentGroupId}
          onSelectDocumentGroup={setActiveDocumentGroupId}
        />
      </Drawer>
    </>
  );
};

const BubbleTimestamp = ({ createdAt }: { createdAt: string }) => {
  return (
    <Typography.Text className="text-caption font-medium tracking-[0.02em] text-slate-400">
      {formatMessageTime(createdAt)}
    </Typography.Text>
  );
};

export const ProjectChatAssistantMessage = ({
  content,
  extraInfo,
}: {
  content: string;
  extraInfo?: ProjectChatBubbleExtraInfo;
}) => {
  const citationViewModel = buildProjectChatCitationViewModel(
    extraInfo?.citationContent,
    extraInfo?.sources ?? [],
  );
  const useSentenceCitationMode = canUseProjectChatCitationMode({
    content,
    citationViewModel,
  });

  return (
    <div
      id={getProjectChatMessageDomId(extraInfo?.messageId)}
      className="text-body text-slate-700"
    >
      {useSentenceCitationMode ? (
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {citationViewModel.sentences.map((sentence) => (
            <span
              key={sentence.id}
              data-citation-sentence={sentence.id}
              data-grounded={sentence.grounded ? 'true' : 'false'}
            >
              {sentence.text}
            </span>
          ))}
        </div>
      ) : (
        <ProjectChatMarkdown content={content} />
      )}
    </div>
  );
};

const getProjectChatMessageDomId = (messageId?: string) => {
  return messageId ? `project-chat-message-${messageId}` : undefined;
};

export const ProjectChatUserMessage = ({
  content,
  extraInfo,
}: {
  content: string;
  extraInfo?: ProjectChatBubbleExtraInfo;
}) => {
  return (
    <Typography.Paragraph
      id={getProjectChatMessageDomId(extraInfo?.messageId)}
      className="mb-0! whitespace-pre-wrap text-body! leading-7! text-slate-800!"
    >
      {content}
    </Typography.Paragraph>
  );
};

export const ProjectChatAssistantFooter = ({
  extraInfo,
}: {
  content?: string;
  extraInfo?: ProjectChatBubbleExtraInfo;
}) => {
  if (!extraInfo) {
    return null;
  }

  const assistantActions = extraInfo.assistantActions;
  const copyDisabled = assistantActions?.copyDisabled ?? true;
  const retryDisabled = assistantActions?.retryDisabled ?? true;
  const starDisabled =
    (assistantActions?.starDisabled ?? true) || assistantActions?.starring === true;

  const handleActionClick = (
    event: MouseEvent<HTMLButtonElement>,
    disabled: boolean,
    action?: () => void,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled || !action) {
      return;
    }

    action();
  };

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      {extraInfo.status ? (
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-caption font-medium text-emerald-700">
          {getProjectChatBubbleStatusLabel(extraInfo.status)}
        </span>
      ) : null}
      <div className="flex items-center gap-1 text-slate-400">
        <button
          type="button"
          aria-label={tp('conversation.copyReply')}
          aria-disabled={copyDisabled}
          tabIndex={copyDisabled ? -1 : 0}
          className={[
            'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600',
            copyDisabled
              ? 'cursor-not-allowed text-slate-300 hover:bg-transparent hover:text-slate-300'
              : '',
          ].join(' ')}
          onClick={(event) =>
            handleActionClick(event, copyDisabled, assistantActions?.onCopy)
          }
        >
          <CopyOutlined className="text-xs" />
        </button>
        <button
          type="button"
          aria-label={assistantActions?.starred ? tp('conversation.unstar') : tp('conversation.star')}
          aria-disabled={starDisabled}
          tabIndex={starDisabled ? -1 : 0}
          className={[
            'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200',
            assistantActions?.starred
              ? [
                  PROJECT_CHAT_STAR_CLASS_NAMES.buttonActive,
                  starDisabled
                    ? 'cursor-not-allowed'
                    : '',
                ].join(' ')
              : starDisabled
                ? PROJECT_CHAT_STAR_CLASS_NAMES.buttonDisabledInactive
                : PROJECT_CHAT_STAR_CLASS_NAMES.buttonInactive,
          ].join(' ')}
          onClick={(event) =>
            handleActionClick(
              event,
              starDisabled,
              assistantActions?.onToggleStar,
            )
          }
        >
          {assistantActions?.starred ? (
            <StarFilled
              className={[
                'text-xs',
                PROJECT_CHAT_STAR_CLASS_NAMES.iconActive,
              ].join(' ')}
            />
          ) : (
            <StarOutlined className="text-xs" />
          )}
        </button>
        <button
          type="button"
          aria-label={tp('conversation.retryReply')}
          aria-disabled={retryDisabled}
          tabIndex={retryDisabled ? -1 : 0}
          className={[
            'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600',
            retryDisabled
              ? 'cursor-not-allowed text-slate-300 hover:bg-transparent hover:text-slate-300'
              : '',
          ].join(' ')}
          onClick={(event) =>
            handleActionClick(event, retryDisabled, assistantActions?.onRetry)
          }
        >
          <RedoOutlined className="text-xs" />
        </button>
      </div>
      <ProjectConversationSourcesDrawerTrigger
        sources={extraInfo.sources}
        renderTrigger={({ openDrawer, open }) => (
          <button
            type="button"
            aria-label={tp('conversation.viewSources')}
            aria-expanded={open}
            aria-haspopup="dialog"
            data-conversation-sources-trigger="true"
            className={[
              'inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3.5 text-xs font-medium text-slate-600 transition-colors duration-200',
              'hover:border-slate-300 hover:bg-slate-200/80 hover:text-slate-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200',
            ].join(' ')}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openDrawer();
            }}
          >
            <FileTextOutlined className="text-xs" />
            <span>{tp('conversation.sources')}</span>
          </button>
        )}
      />
    </div>
  );
};

export const ProjectChatUserFooter = ({
  extraInfo,
}: {
  extraInfo?: ProjectChatBubbleExtraInfo;
}) => {
  if (!extraInfo) {
    return null;
  }

  if (!extraInfo.userActions) {
    return (
      <div className="mt-1.5 flex h-6 items-center justify-end pr-0.5">
        <BubbleTimestamp createdAt={extraInfo.createdAt} />
      </div>
    );
  }

  const { userActions } = extraInfo;
  const handleActionClick = (
    event: MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (userActions.disabled) {
      return;
    }

    action();
  };

  return (
    <div className="mt-1.5 h-6">
      <div className="invisible flex h-full items-center justify-end gap-1 pr-0.5 text-slate-400 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100">
        <BubbleTimestamp createdAt={extraInfo.createdAt} />

        <button
          type="button"
          aria-label={tp('conversation.retryRequest')}
          disabled={userActions.disabled}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
          onClick={(event) => handleActionClick(event, userActions.onRetry)}
        >
          <RedoOutlined className="text-xs" />
        </button>
        <button
          type="button"
          aria-label={tp('conversation.editMessage')}
          disabled={userActions.disabled}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
          onClick={(event) =>
            handleActionClick(event, userActions.onEditStart)
          }
        >
          <EditOutlined className="text-xs" />
        </button>
        <button
          type="button"
          aria-label={tp('conversation.copyMessage')}
          disabled={userActions.disabled}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
          onClick={(event) => handleActionClick(event, userActions.onCopy)}
        >
          <CopyOutlined className="text-xs" />
        </button>
      </div>
    </div>
  );
};
