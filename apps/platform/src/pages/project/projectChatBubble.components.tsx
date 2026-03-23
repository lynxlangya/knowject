import {
  CopyOutlined,
  EditOutlined,
  FileTextOutlined,
  RedoOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { Popover, Typography } from 'antd';
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
  rewriteProjectChatMarkdownEvidenceBlocks,
  suppressProjectChatTrailingPseudoCitations,
  simplifyProjectChatSourceLabel,
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

const buildProjectChatSourceTagLabel = (
  documentGroups: ProjectConversationSourceDocumentGroup[],
): string | null => {
  const primaryDocumentGroup = documentGroups[0];
  if (!primaryDocumentGroup) {
    return null;
  }

  const primaryLabel = simplifyProjectChatSourceLabel(primaryDocumentGroup.sourceLabel);
  const overflowCount = documentGroups.length - 1;

  return overflowCount > 0 ? `${primaryLabel} +${overflowCount}` : primaryLabel;
};

const resolveProjectChatSourceTagGroupsByIndexes = ({
  documentGroups,
  sourceIndexes,
}: {
  documentGroups: ProjectConversationSourceDocumentGroup[];
  sourceIndexes: number[];
}): ProjectConversationSourceDocumentGroup[] => {
  return sourceIndexes
    .map((sourceIndex) =>
      documentGroups.find(
        (documentGroup) => documentGroup.markerNumber === sourceIndex,
      ) ?? null,
    )
    .filter((documentGroup): documentGroup is ProjectConversationSourceDocumentGroup =>
      documentGroup !== null,
    );
};

interface ProjectConversationSourceDocumentGroup {
  id: string;
  markerNumber: number;
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
        markerNumber: documentGroups.length + 1,
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
  const [activeEntryId, setActiveEntryId] = React.useState<string | null>(
    documentGroup.entries[0]?.id ?? null,
  );
  const sourceDisplayLabel = simplifyProjectChatSourceLabel(
    documentGroup.sourceLabel,
  );
  const sourceFileName = getProjectChatSourceFileName(documentGroup.sourceLabel);
  const activeEntry =
    documentGroup.entries.find((entry) => entry.id === activeEntryId) ??
    documentGroup.entries[0];

  React.useEffect(() => {
    setActiveEntryId(documentGroup.entries[0]?.id ?? null);
  }, [documentGroup.id, documentGroup.entries]);

  if (!activeEntry) {
    return null;
  }

  return (
    <div
      data-conversation-source-detail={documentGroup.id}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="space-y-3.5">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <FileTextOutlined className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <Typography.Text className="block truncate text-sm font-semibold text-slate-800">
              {sourceDisplayLabel}
            </Typography.Text>
            {documentGroup.sourceLabel !== sourceDisplayLabel ? (
              <Typography.Text className="mt-0.5 block text-caption leading-5 text-slate-400">
                {sourceFileName}
              </Typography.Text>
            ) : null}
          </div>
        </div>
        {documentGroup.entries.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {documentGroup.entries.map((entry, index) => {
              const active = entry.id === activeEntry.id;

              return (
                <button
                  key={entry.id}
                  type="button"
                  data-conversation-source-entry-switch={entry.id}
                  className={[
                    'inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-200',
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-800',
                  ].join(' ')}
                  onClick={() => setActiveEntryId(entry.id)}
                >
                  #{index + 1}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          {formatSourceDistance(activeEntry.distance) ? (
            <Typography.Text className="mb-1 block text-[11px] font-medium text-slate-400">
              {formatSourceDistance(activeEntry.distance)}
            </Typography.Text>
          ) : null}
          <Typography.Paragraph className="mb-0! text-xs! leading-6! text-slate-600!">
            {activeEntry.snippet}
          </Typography.Paragraph>
        </div>
      </div>
    </div>
  );
};

const ProjectConversationSourcesPanel = ({
  documentGroups,
  activeDocumentGroupId,
  visibleDocumentGroupIds,
  onSelectDocumentGroup,
}: {
  documentGroups: ProjectConversationSourceDocumentGroup[];
  activeDocumentGroupId: string | null;
  visibleDocumentGroupIds?: string[];
  onSelectDocumentGroup: (documentGroupId: string) => void;
}) => {
  const visibleDocumentGroups =
    visibleDocumentGroupIds && visibleDocumentGroupIds.length > 0
      ? documentGroups.filter((documentGroup) =>
          visibleDocumentGroupIds.includes(documentGroup.id),
        )
      : documentGroups;
  const activeDocumentGroup =
    visibleDocumentGroups.find(
      (documentGroup) => documentGroup.id === activeDocumentGroupId,
    ) ?? visibleDocumentGroups[0];

  if (!activeDocumentGroup) {
    return null;
  }

  return (
    <div
      data-conversation-sources-panel="true"
      className="w-[min(22rem,calc(100vw-3rem))] space-y-3.5"
    >
      <div className="space-y-1">
        <Typography.Text className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {tp('conversation.references')}
        </Typography.Text>
        <Typography.Text className="block truncate text-sm font-semibold text-slate-800">
          {simplifyProjectChatSourceLabel(activeDocumentGroup.sourceLabel)}
        </Typography.Text>
      </div>
      {visibleDocumentGroups.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {visibleDocumentGroups.map((documentGroup) => {
            const displayLabel = simplifyProjectChatSourceLabel(
              documentGroup.sourceLabel,
            );
            const active = documentGroup.id === activeDocumentGroup.id;

            return (
              <button
                key={documentGroup.id}
                type="button"
                data-conversation-source-switch={documentGroup.id}
                className={[
                  'inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800',
                ].join(' ')}
                onClick={() => onSelectDocumentGroup(documentGroup.id)}
              >
                <FileTextOutlined className="text-xs" />
                <span className="max-w-52 truncate">{displayLabel}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <ProjectConversationSourceDetailCard documentGroup={activeDocumentGroup} />
    </div>
  );
};

const ProjectConversationSourcesPopoverTrigger = ({
  documentGroups,
  visibleDocumentGroupIds,
  defaultDocumentGroupId,
  renderTrigger,
}: {
  documentGroups: ProjectConversationSourceDocumentGroup[];
  visibleDocumentGroupIds?: string[];
  defaultDocumentGroupId?: string;
  renderTrigger: (args: {
    openPopover: (documentGroupId?: string) => void;
    open: boolean;
  }) => React.ReactNode;
}) => {
  const visibleDocumentGroups =
    visibleDocumentGroupIds && visibleDocumentGroupIds.length > 0
      ? documentGroups.filter((documentGroup) =>
          visibleDocumentGroupIds.includes(documentGroup.id),
        )
      : documentGroups;
  const [sourcesPopoverOpen, setSourcesPopoverOpen] = React.useState(false);
  const [activeDocumentGroupId, setActiveDocumentGroupId] = React.useState<string | null>(
    defaultDocumentGroupId ?? visibleDocumentGroups[0]?.id ?? null,
  );

  React.useEffect(() => {
    if (visibleDocumentGroups.length === 0) {
      setActiveDocumentGroupId(null);
      return;
    }

    if (
      activeDocumentGroupId &&
      visibleDocumentGroups.some(
        (documentGroup) => documentGroup.id === activeDocumentGroupId,
      )
    ) {
      return;
    }

    setActiveDocumentGroupId(defaultDocumentGroupId ?? visibleDocumentGroups[0]?.id ?? null);
  }, [
    activeDocumentGroupId,
    defaultDocumentGroupId,
    visibleDocumentGroups,
  ]);

  if (visibleDocumentGroups.length === 0) {
    return null;
  }

  const openPopover = (documentGroupId?: string) => {
    setActiveDocumentGroupId(
      documentGroupId ?? defaultDocumentGroupId ?? visibleDocumentGroups[0]?.id ?? null,
    );
    setSourcesPopoverOpen(true);
  };

  return (
    <Popover
      trigger="click"
      open={sourcesPopoverOpen}
      destroyOnHidden={false}
      onOpenChange={(nextOpen) => {
        setSourcesPopoverOpen(nextOpen);

        if (nextOpen) {
          setActiveDocumentGroupId(
            defaultDocumentGroupId ?? visibleDocumentGroups[0]?.id ?? null,
          );
        }
      }}
      content={
        <ProjectConversationSourcesPanel
          documentGroups={documentGroups}
          visibleDocumentGroupIds={visibleDocumentGroupIds}
          activeDocumentGroupId={activeDocumentGroupId}
          onSelectDocumentGroup={setActiveDocumentGroupId}
        />
      }
    >
      {renderTrigger({
        openPopover,
        open: sourcesPopoverOpen,
      })}
    </Popover>
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
  const sanitizedContent =
    extraInfo && extraInfo.sources.length > 0
      ? suppressProjectChatTrailingPseudoCitations(content)
      : content;
  const rewrittenMarkdownContent =
    extraInfo && extraInfo.sources.length > 0
      ? rewriteProjectChatMarkdownEvidenceBlocks(sanitizedContent)
      : sanitizedContent;
  const useSentenceCitationMode = canUseProjectChatCitationMode({
    content: sanitizedContent,
    citationViewModel,
  });
  const sourceDocumentGroups =
    citationViewModel.mode === 'citation'
      ? citationViewModel.documentGroups.map((documentGroup) => ({
          id: documentGroup.id,
          markerNumber: documentGroup.markerNumber,
          sourceLabel: documentGroup.sourceLabel,
          entries: documentGroup.entries,
        }))
      : buildProjectConversationSourceDocumentGroups(extraInfo?.sources ?? []);
  const sourceTagLabel = buildProjectChatSourceTagLabel(sourceDocumentGroups);

  return (
    <div
      id={getProjectChatMessageDomId(extraInfo?.messageId)}
      className="text-body text-slate-700"
    >
      {useSentenceCitationMode ? (
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
          <span>{sanitizedContent}</span>
          {sourceTagLabel && sourceDocumentGroups.length > 0 ? (
            <ProjectConversationSourcesPopoverTrigger
              documentGroups={sourceDocumentGroups}
              defaultDocumentGroupId={sourceDocumentGroups[0]?.id}
              renderTrigger={({ openPopover, open }) => (
                <button
                  type="button"
                  aria-label={tp('conversation.viewSources')}
                  aria-expanded={open}
                  aria-haspopup="dialog"
                  data-conversation-source-tag="true"
                  className={[
                    'ml-1.5 inline-flex h-5 items-center rounded-full border border-slate-200/90 bg-slate-100/70 px-2 align-middle text-[8px] font-medium tracking-[0.01em] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-200',
                    'hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200',
                  ].join(' ')}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openPopover(sourceDocumentGroups[0]?.id);
                  }}
                >
                  {sourceTagLabel}
                </button>
              )}
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <ProjectChatMarkdown
            content={rewrittenMarkdownContent}
            renderInlineSourceTag={(sourceIndexes) => {
              const inlineSourceDocumentGroups =
                resolveProjectChatSourceTagGroupsByIndexes({
                  documentGroups: sourceDocumentGroups,
                  sourceIndexes,
                });
              const inlineSourceTagLabel = buildProjectChatSourceTagLabel(
                inlineSourceDocumentGroups,
              );

              if (
                inlineSourceDocumentGroups.length === 0 ||
                !inlineSourceTagLabel
              ) {
                return null;
              }

              return (
                <ProjectConversationSourcesPopoverTrigger
                  documentGroups={sourceDocumentGroups}
                  visibleDocumentGroupIds={inlineSourceDocumentGroups.map(
                    (documentGroup) => documentGroup.id,
                  )}
                  defaultDocumentGroupId={inlineSourceDocumentGroups[0]?.id}
                  renderTrigger={({ openPopover, open }) => (
                    <button
                      type="button"
                      aria-label={tp('conversation.viewSources')}
                      aria-expanded={open}
                      aria-haspopup="dialog"
                      data-conversation-source-tag="true"
                      className={[
                        'ml-1.5 inline-flex h-5 items-center rounded-full border border-slate-200/90 bg-slate-100/70 px-2 align-middle text-[8px] font-medium tracking-[0.01em] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-200',
                        'hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200',
                      ].join(' ')}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openPopover(inlineSourceDocumentGroups[0]?.id);
                      }}
                    >
                      {inlineSourceTagLabel}
                    </button>
                  )}
                />
              );
            }}
          />
          {sourceTagLabel &&
          sourceDocumentGroups.length > 0 &&
          !rewrittenMarkdownContent.includes('[[SOURCE_TAG:') ? (
            <ProjectConversationSourcesPopoverTrigger
              documentGroups={sourceDocumentGroups}
              defaultDocumentGroupId={sourceDocumentGroups[0]?.id}
              renderTrigger={({ openPopover, open }) => (
                <button
                  type="button"
                  aria-label={tp('conversation.viewSources')}
                  aria-expanded={open}
                  aria-haspopup="dialog"
                  data-conversation-source-tag="true"
                  className={[
                    'inline-flex h-5 items-center rounded-full border border-slate-200/90 bg-slate-100/70 px-2 text-[8px] font-medium tracking-[0.01em] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-200',
                    'hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200',
                  ].join(' ')}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openPopover(sourceDocumentGroups[0]?.id);
                  }}
                >
                  {sourceTagLabel}
                </button>
              )}
            />
          ) : null}
        </div>
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
  content,
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
  const citationViewModel = buildProjectChatCitationViewModel(
    extraInfo.citationContent,
    extraInfo.sources,
  );
  void content;
  void citationViewModel;

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
