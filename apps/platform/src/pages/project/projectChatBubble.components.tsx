import {
  CopyOutlined,
  EditOutlined,
  LinkOutlined,
  RedoOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
import React from 'react';
import type { MouseEvent } from 'react';
import i18n from '../../i18n';
import type {
  ProjectConversationCitationContent,
  ProjectConversationSourceResponse,
  ProjectConversationStreamSourcesSeedItem,
} from '../../api/projects';
import { ProjectChatMarkdown } from './projectChat.markdown';
import {
  buildProjectChatCitationViewModel,
  canUseProjectChatCitationMode,
  rewriteProjectChatMarkdownEvidenceBlocks,
  shouldProjectChatFallbackToLegacyMarkdown,
  suppressProjectChatTrailingPseudoCitations,
  simplifyProjectChatSourceLabel,
} from './projectChatCitations';
import {
  buildProjectChatSourceEntries,
  resolveCitationSentenceSourceKeys,
  resolveDraftSourceTokens,
  type ProjectChatDraftSourceToken,
  type ProjectChatSourceEntry,
} from './projectChatSources';
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
  sourceSeedEntries?: ProjectConversationStreamSourcesSeedItem[];
  messageId?: string;
  status?: ProjectChatBubbleStatus;
  assistantActions?: ProjectChatAssistantBubbleActions;
  userActions?: ProjectChatUserBubbleActions;
  onOpenSource?: (sourceKey: string) => void;
}

export type ProjectChatBubbleStatus = 'streaming' | 'reconciling';

void React;

const formatMessageTime = (value: string): string => {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getProjectChatBubbleStatusLabel = (status: ProjectChatBubbleStatus): string => {
  return tp(`conversation.status.${status}`);
};

const PROJECT_CHAT_SOURCE_TAG_CLASS_NAME = [
  'group/source ml-1.5 inline-flex h-5.5 w-5.5 items-center justify-center rounded-full border border-[#cfe4de] bg-white/92 align-middle shadow-[0_2px_8px_rgba(31,122,103,0.08)] transition-all duration-200',
  'hover:-translate-y-px hover:border-[#9cd4c8] hover:bg-[#f7fcfa] hover:shadow-[0_6px_14px_rgba(31,122,103,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b0e6dc] focus-visible:ring-offset-2',
].join(' ');

const PROJECT_CHAT_SOURCE_TAG_ICON_CLASS_NAME = [
  'inline-flex items-center justify-center text-[11px] text-[#5a8077]',
  'transition-colors duration-200 group-hover/source:text-[#18463d]',
].join(' ');

const buildLegacySourceTagLabelMap = (
  sourceEntries: ProjectChatSourceEntry[],
): Map<string, string> => {
  const labelsBySourceKey = new Map<string, string>();

  sourceEntries.forEach((entry) => {
    if (labelsBySourceKey.has(entry.sourceKey)) {
      return;
    }

    labelsBySourceKey.set(
      entry.sourceKey,
      simplifyProjectChatSourceLabel(entry.sourceLabel),
    );
  });

  return labelsBySourceKey;
};

const renderProjectConversationSourceTag = ({
  label,
  onOpenSource,
  sourceKey,
}: {
  label: string;
  onOpenSource?: (sourceKey: string) => void;
  sourceKey: string;
}) => {
  return (
    <button
      key={sourceKey}
      type="button"
      aria-label={tp('conversation.viewSources')}
      aria-haspopup="dialog"
      data-conversation-source-tag="true"
      data-conversation-source-tag-shell="true"
      data-conversation-source-key={sourceKey}
      className={PROJECT_CHAT_SOURCE_TAG_CLASS_NAME}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenSource?.(sourceKey);
      }}
    >
      <span
        aria-hidden="true"
        data-conversation-source-tag-icon="true"
        className={PROJECT_CHAT_SOURCE_TAG_ICON_CLASS_NAME}
      >
        <LinkOutlined />
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
};

const renderProjectConversationSourceTagList = ({
  labelsBySourceKey,
  onOpenSource,
  sourceKeys,
}: {
  labelsBySourceKey?: Map<string, string>;
  onOpenSource?: (sourceKey: string) => void;
  sourceKeys: string[];
}) => {
  if (sourceKeys.length === 0) {
    return null;
  }

  return sourceKeys.map((sourceKey) =>
    renderProjectConversationSourceTag({
      label: labelsBySourceKey?.get(sourceKey) ?? sourceKey,
      onOpenSource,
      sourceKey,
    }),
  );
};

const renderProjectConversationPlainTextWithSourceTags = ({
  content,
  renderToken,
}: {
  content: string;
  renderToken: (
    sourceKeys: string[],
    token: ProjectChatDraftSourceToken,
  ) => React.ReactNode | null;
}) => {
  const tokens = resolveDraftSourceTokens(content);

  if (tokens.length === 0) {
    return <span>{content}</span>;
  }

  const fragments: React.ReactNode[] = [];
  let lastIndex = 0;

  tokens.forEach((token) => {
    const renderedToken = renderToken(token.sourceKeys, token);
    const trailingPunctuation = content[token.end];
    const shouldMoveTrailingPunctuation =
      renderedToken !== null &&
      trailingPunctuation !== undefined && /[。！？!?]/u.test(trailingPunctuation);

    if (token.start > lastIndex) {
      const textBeforeToken = content.slice(lastIndex, token.start);

      fragments.push(
        shouldMoveTrailingPunctuation
          ? textBeforeToken.replace(/\s+$/u, '')
          : textBeforeToken,
      );
    }

    if (shouldMoveTrailingPunctuation) {
      fragments.push(trailingPunctuation);
    }

    fragments.push(renderedToken ?? token.rawText);
    lastIndex = token.end + (shouldMoveTrailingPunctuation ? 1 : 0);
  });

  if (lastIndex < content.length) {
    fragments.push(content.slice(lastIndex));
  }

  return <span>{fragments}</span>;
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
  const sourceEntries = buildProjectChatSourceEntries(extraInfo?.sources ?? []);
  const availableSourceKeys = new Set(
    sourceEntries.map((entry) => entry.sourceKey),
  );
  const seededSourceKeys = new Set(
    extraInfo?.sourceSeedEntries?.map((entry) => entry.sourceKey) ?? [],
  );
  const legacyLabelsBySourceKey = buildLegacySourceTagLabelMap(sourceEntries);
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
  const parsedSourceTokens = resolveDraftSourceTokens(rewrittenMarkdownContent);
  const hasInlineSourceTokens = parsedSourceTokens.length > 0;
  const markdownComparableContent =
    parsedSourceTokens.length === 0
      ? rewrittenMarkdownContent
      : parsedSourceTokens.reduce(
          (result, token, index) => {
            const nextToken = parsedSourceTokens[index + 1];

            return `${result}${rewrittenMarkdownContent.slice(
              token.end,
              nextToken?.start ?? undefined,
            )}`;
          },
          rewrittenMarkdownContent.slice(0, parsedSourceTokens[0]?.start ?? 0),
        );
  const shouldUseLegacyMarkdownRenderer =
    !extraInfo?.citationContent &&
    shouldProjectChatFallbackToLegacyMarkdown(markdownComparableContent);
  const shouldRenderLegacySummaryTag = Boolean(extraInfo?.citationContent);
  const renderSourceKeyToken = (
    sourceKeys: string[],
    token: ProjectChatDraftSourceToken,
  ) => {
    const resolvedSourceKeys =
      token.kind === 'draft'
        ? (
            seededSourceKeys.size > 0
              ? sourceKeys.filter((sourceKey) => seededSourceKeys.has(sourceKey))
              : sourceKeys.filter((sourceKey) => availableSourceKeys.has(sourceKey))
          )
        : sourceKeys.filter((sourceKey) => availableSourceKeys.has(sourceKey));

    if (resolvedSourceKeys.length === 0) {
      return null;
    }

    return renderProjectConversationSourceTagList({
      onOpenSource: extraInfo?.onOpenSource,
      sourceKeys: resolvedSourceKeys,
    });
  };
  const renderLegacyToken = (
    sourceKeys: string[],
    token: ProjectChatDraftSourceToken,
  ) => {
    const resolvedSourceKeys =
      token.kind === 'draft'
        ? sourceKeys.filter((sourceKey) => seededSourceKeys.has(sourceKey))
        : sourceKeys.filter((sourceKey) => availableSourceKeys.has(sourceKey));

    if (resolvedSourceKeys.length === 0) {
      return null;
    }

    return renderProjectConversationSourceTagList({
      labelsBySourceKey:
        token.kind === 'draft' ? undefined : legacyLabelsBySourceKey,
      onOpenSource: extraInfo?.onOpenSource,
      sourceKeys: resolvedSourceKeys,
    });
  };
  const summarySourceKey = sourceEntries[0]?.sourceKey ?? null;
  const summarySourceLabel =
    summarySourceKey ? legacyLabelsBySourceKey.get(summarySourceKey) ?? null : null;

  return (
    <div
      id={getProjectChatMessageDomId(extraInfo?.messageId)}
      className="text-body text-slate-700"
    >
      {useSentenceCitationMode ? (
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {extraInfo?.citationContent?.sentences.map((sentence) => (
            <React.Fragment key={sentence.id}>
              <span>{sentence.text}</span>
              {renderProjectConversationSourceTagList({
                onOpenSource: extraInfo?.onOpenSource,
                sourceKeys: resolveCitationSentenceSourceKeys(
                  sentence,
                  extraInfo?.sources ?? [],
                ),
              })}
            </React.Fragment>
          ))}
        </div>
      ) : shouldUseLegacyMarkdownRenderer ? (
        <div className="space-y-2">
          <ProjectChatMarkdown
            content={rewrittenMarkdownContent}
            renderInlineSourceTag={renderSourceKeyToken}
          />
          {!hasInlineSourceTokens && summarySourceKey
            ? renderProjectConversationSourceTag({
                label: summarySourceKey,
                onOpenSource: extraInfo?.onOpenSource,
                sourceKey: summarySourceKey,
              })
            : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {renderProjectConversationPlainTextWithSourceTags({
              content: rewrittenMarkdownContent,
              renderToken: shouldRenderLegacySummaryTag
                ? renderLegacyToken
                : renderSourceKeyToken,
            })}
          </div>
          {!hasInlineSourceTokens && summarySourceKey
            ? renderProjectConversationSourceTag({
                label: shouldRenderLegacySummaryTag
                  ? summarySourceLabel ?? summarySourceKey
                  : summarySourceKey,
                onOpenSource: extraInfo?.onOpenSource,
                sourceKey: summarySourceKey,
              })
            : null}
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
  void content;

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
        <span
          className="rounded-full border px-2.5 py-1 text-caption font-medium"
          style={{
            borderColor: 'rgba(40,184,160,0.3)',
            backgroundColor: 'rgba(40,184,160,0.08)',
            color: '#1A8A77',
          }}
        >
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
