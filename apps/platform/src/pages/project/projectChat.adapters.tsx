import {
  CopyOutlined,
  EditOutlined,
  FileTextOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import type { CSSProperties, ReactNode } from 'react';
import {
  type BubbleItemType,
  type BubbleListProps,
  type ConversationItemType,
} from '@ant-design/x';
import {
  XMarkdown,
  type ComponentProps as XMarkdownComponentProps,
} from '@ant-design/x-markdown';
import { Popover, Typography } from 'antd';
import type { ConversationSummary } from '@app/project/project.types';
import type {
  ProjectConversationMessageResponse,
  ProjectConversationSourceResponse,
} from '@api/projects';
import { KNOWJECT_BRAND } from '@styles/brand';

interface ProjectChatBubbleExtraInfo {
  createdAt: string;
  sources: ProjectConversationSourceResponse[];
}

const AI_BUBBLE_STYLE: CSSProperties = {
  padding: 18,
  borderRadius: 4,
};

const USER_BUBBLE_STYLE: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 4,
  background: KNOWJECT_BRAND.primarySurface,
};

const joinClassName = (...classNames: Array<string | undefined>) => {
  return classNames.filter(Boolean).join(' ');
};

const formatConversationUpdatedAt = (value: string): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatMessageTime = (value: string): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatSourceDistance = (value: number | null): string | null => {
  if (value === null) {
    return null;
  }

  return `distance ${value.toFixed(2)}`;
};

const renderMarkdownParagraph = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <p
      {...rest}
      className={joinClassName(
        'mb-3 text-sm leading-7 text-slate-700 last:mb-0',
        className,
      )}
    >
      {children}
    </p>
  );
};

const renderMarkdownHeading1 = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <h1
      {...rest}
      className={joinClassName(
        'mb-3 text-xl font-semibold text-slate-900',
        className,
      )}
    >
      {children}
    </h1>
  );
};

const renderMarkdownHeading2 = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <h2
      {...rest}
      className={joinClassName(
        'mb-3 text-lg font-semibold text-slate-900',
        className,
      )}
    >
      {children}
    </h2>
  );
};

const renderMarkdownHeading3 = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <h3
      {...rest}
      className={joinClassName(
        'mb-3 text-base font-semibold text-slate-900',
        className,
      )}
    >
      {children}
    </h3>
  );
};

const renderMarkdownList = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <ul
      {...rest}
      className={joinClassName(
        'mb-3 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700 last:mb-0',
        className,
      )}
    >
      {children}
    </ul>
  );
};

const renderMarkdownOrderedList = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <ol
      {...rest}
      className={joinClassName(
        'mb-3 list-decimal space-y-1 pl-5 text-sm leading-7 text-slate-700 last:mb-0',
        className,
      )}
    >
      {children}
    </ol>
  );
};

const renderMarkdownListItem = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <li
      {...rest}
      className={joinClassName('text-sm leading-7 text-slate-700', className)}
    >
      {children}
    </li>
  );
};

const renderMarkdownPre = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <pre
      {...rest}
      className={joinClassName(
        'mb-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100 last:mb-0',
        className,
      )}
    >
      {children}
    </pre>
  );
};

const renderMarkdownCode = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  block,
  ...rest
}: XMarkdownComponentProps) => {
  if (block) {
    return (
      <code
        {...rest}
        className={joinClassName(
          'font-mono text-[12px] leading-6 text-slate-100',
          className,
        )}
      >
        {children}
      </code>
    );
  }

  return (
    <code
      {...rest}
      className={joinClassName(
        'rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-700',
        className,
      )}
    >
      {children}
    </code>
  );
};

const renderMarkdownLink = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <a
      {...rest}
      className={joinClassName(
        'font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-3 hover:text-emerald-800',
        className,
      )}
    >
      {children}
    </a>
  );
};

const renderMarkdownBlockquote = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  return (
    <blockquote
      {...rest}
      className={joinClassName(
        'mb-3 border-l-3 border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm leading-7 text-slate-700 last:mb-0',
        className,
      )}
    >
      {children}
    </blockquote>
  );
};

const renderMarkdownImage = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  src,
  alt,
  title,
  className,
}: XMarkdownComponentProps<{
  alt?: string;
  src?: string;
  title?: string;
}>) => {
  const fallbackLabel = alt?.trim() || title?.trim() || '外部图片';

  return (
    <span
      className={joinClassName(
        'mb-3 inline-flex max-w-full flex-col gap-1 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900 last:mb-0',
        className,
      )}
    >
      <span className="font-semibold">已拦截外部图片加载</span>
      <span>{fallbackLabel}</span>
      {src ? (
        <span className="break-all text-[11px] leading-5 text-amber-700">
          {src}
        </span>
      ) : null}
    </span>
  );
};

const renderAssistantMessage = (content: string) => {
  return (
    <div className="text-[15px] text-slate-700">
      <XMarkdown
        content={content}
        openLinksInNewTab
        escapeRawHtml
        components={{
          p: renderMarkdownParagraph,
          h1: renderMarkdownHeading1,
          h2: renderMarkdownHeading2,
          h3: renderMarkdownHeading3,
          ul: renderMarkdownList,
          ol: renderMarkdownOrderedList,
          li: renderMarkdownListItem,
          pre: renderMarkdownPre,
          code: renderMarkdownCode,
          a: renderMarkdownLink,
          img: renderMarkdownImage,
          blockquote: renderMarkdownBlockquote,
        }}
      />
    </div>
  );
};

const renderUserMessage = (content: string) => {
  return (
    <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-[15px]! leading-7! text-slate-800!">
      {content}
    </Typography.Paragraph>
  );
};

const renderBubbleTimestamp = ({ createdAt }: { createdAt: string }) => {
  return (
    <Typography.Text className="text-[11px] font-medium tracking-[0.02em] text-slate-400">
      {formatMessageTime(createdAt)}
    </Typography.Text>
  );
};

export const renderProjectConversationLabel = ({
  conversation,
  active,
  titleContent,
}: {
  conversation: ConversationSummary;
  active: boolean;
  titleContent?: ReactNode;
}) => {
  return (
    <div
      className={[
        'group relative w-full overflow-hidden rounded-[24px] border px-4 py-4 text-left transition-colors duration-200 ease-out',
        active
          ? 'bg-white'
          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70',
      ].join(' ')}
      style={
        active
          ? {
              backgroundColor: KNOWJECT_BRAND.primarySurface,
              borderColor: KNOWJECT_BRAND.primaryBorder,
            }
          : undefined
      }
    >
      <span
        className={[
          'absolute bottom-4 left-0 top-4 w-1 rounded-full transition-colors duration-200',
          active ? '' : 'bg-slate-200/70 group-hover:bg-slate-300/80',
        ].join(' ')}
        style={active ? { backgroundColor: KNOWJECT_BRAND.primary } : undefined}
        aria-hidden="true"
      />

      <div className="pl-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={[
                  'h-2.5 w-2.5 rounded-full transition-colors duration-200',
                  active
                    ? 'bg-emerald-400'
                    : 'bg-slate-300 group-hover:bg-slate-400',
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

        {titleContent ?? (
          <Typography.Text className="block [display:-webkit-box] overflow-hidden text-[15px] font-semibold leading-7 text-slate-800 [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {conversation.title}
          </Typography.Text>
        )}
      </div>
    </div>
  );
};

const ProjectConversationSources = ({
  sources,
}: {
  sources: ProjectConversationSourceResponse[];
}) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source, index) => {
        const fileName =
          source.source.split(/[\\/]/).filter(Boolean).pop() || source.source;

        return (
          <Popover
            key={`${source.knowledgeId}:${source.documentId}:${source.chunkId}:${source.chunkIndex}`}
            trigger={['hover', 'focus']}
            placement="topLeft"
            mouseEnterDelay={0.12}
            overlayClassName="max-w-[420px]"
            content={
              <div className="max-w-[360px] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Typography.Text className="block truncate text-sm font-semibold text-slate-800">
                      {fileName}
                    </Typography.Text>
                    {source.source !== fileName ? (
                      <Typography.Text className="block text-[11px] leading-5 text-slate-400">
                        {source.source}
                      </Typography.Text>
                    ) : null}
                  </div>
                  {formatSourceDistance(source.distance) ? (
                    <Typography.Text className="shrink-0 text-[11px] text-slate-400">
                      {formatSourceDistance(source.distance)}
                    </Typography.Text>
                  ) : null}
                </div>
                <Typography.Paragraph className="mb-0! text-xs! leading-6! text-slate-600!">
                  {source.snippet}
                </Typography.Paragraph>
              </div>
            }
          >
            <span
              tabIndex={0}
              className="inline-flex max-w-full cursor-default items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/80 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
            >
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1 text-[11px] font-semibold text-slate-500">
                {index + 1}
              </span>
              <FileTextOutlined className="text-[12px] text-slate-400" />
              <span className="max-w-[13rem] truncate">{fileName}</span>
            </span>
          </Popover>
        );
      })}
    </div>
  );
};

const renderAssistantFooter = (extraInfo?: ProjectChatBubbleExtraInfo) => {
  if (!extraInfo) {
    return null;
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2.5">
      {extraInfo.sources.length > 0 ? (
        <ProjectConversationSources sources={extraInfo.sources} />
      ) : null}
      {renderBubbleTimestamp({
        createdAt: extraInfo.createdAt,
      })}
    </div>
  );
};

const renderUserFooter = (extraInfo?: ProjectChatBubbleExtraInfo) => {
  if (!extraInfo) {
    return null;
  }

  return (
    <div className="mt-1.5 h-6">
      <div className="invisible flex h-full items-center justify-end gap-1 pr-0.5 text-slate-400 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100">
        {renderBubbleTimestamp({
          createdAt: extraInfo.createdAt,
        })}

        <button
          type="button"
          aria-label="重新发起请求"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600"
          onClick={(event) => event.preventDefault()}
        >
          <RedoOutlined className="text-[12px]" />
        </button>
        <button
          type="button"
          aria-label="编辑消息"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600"
          onClick={(event) => event.preventDefault()}
        >
          <EditOutlined className="text-[12px]" />
        </button>
        <button
          type="button"
          aria-label="复制消息"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600"
          onClick={(event) => event.preventDefault()}
        >
          <CopyOutlined className="text-[12px]" />
        </button>
      </div>
    </div>
  );
};

export const buildProjectConversationItems = ({
  conversations,
  activeConversationId,
}: {
  conversations: ConversationSummary[];
  activeConversationId?: string;
}): ConversationItemType[] => {
  return conversations.map((conversation) => ({
    key: conversation.id,
    label: renderProjectConversationLabel({
      conversation,
      active: conversation.id === activeConversationId,
    }),
  }));
};

export const buildProjectChatBubbleItems = (
  messages: ProjectConversationMessageResponse[],
): BubbleItemType[] => {
  return messages.map((message) => ({
    key: message.id,
    role: message.role === 'assistant' ? 'ai' : 'user',
    content: message.content,
    extraInfo: {
      createdAt: message.createdAt,
      sources: message.sources ?? [],
    } satisfies ProjectChatBubbleExtraInfo,
  }));
};

export const PROJECT_CHAT_BUBBLE_ROLES: BubbleListProps['role'] = {
  ai: {
    placement: 'start',
    variant: 'borderless',
    rootClassName: 'w-fit max-w-[calc(100%-0.5rem)] sm:max-w-[64rem]',
    styles: {
      content: AI_BUBBLE_STYLE,
    },
    contentRender: (content) => renderAssistantMessage(String(content)),
    footerPlacement: 'outer-start',
    footer: (_content, info) =>
      renderAssistantFooter(
        info.extraInfo as ProjectChatBubbleExtraInfo | undefined,
      ),
  },
  user: {
    placement: 'end',
    variant: 'borderless',
    rootClassName:
      'group mb-0! w-fit min-w-[16rem] max-w-[calc(100%-0.5rem)] sm:max-w-[64rem]',
    styles: {
      content: USER_BUBBLE_STYLE,
    },
    contentRender: (content) => renderUserMessage(String(content)),
    footerPlacement: 'outer-end',
    footer: (_content, info) =>
      renderUserFooter(
        info.extraInfo as ProjectChatBubbleExtraInfo | undefined,
      ),
  },
};

export const PROJECT_CHAT_BUBBLE_LIST_CLASS_NAMES = {
  bubble: 'mb-6 last:mb-0',
  root: 'h-full',
  scroll: 'pr-1 sm:pr-2',
} as const;

export const PROJECT_CHAT_BUBBLE_LIST_STYLES = {
  root: {
    height: '100%',
  },
  scroll: {
    padding: '8px 0 24px',
  },
} satisfies Partial<Record<'root' | 'scroll', CSSProperties>>;
