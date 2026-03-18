import type { CSSProperties } from 'react';
import {
  type BubbleItemType,
  type BubbleListProps,
  type ConversationItemType,
} from '@ant-design/x';
import {
  XMarkdown,
  type ComponentProps as XMarkdownComponentProps,
} from '@ant-design/x-markdown';
import { Typography } from 'antd';
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
  padding: 16,
  borderRadius: 20,
  backgroundColor: '#ffffff',
  border: '1px solid rgba(226,232,240,1)',
  boxShadow: '0 10px 24px rgba(15,23,42,0.035)',
};

const USER_BUBBLE_STYLE: CSSProperties = {
  padding: 16,
  borderRadius: 20,
  backgroundColor: '#3b82f6',
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
      className={joinClassName('mb-3 text-xl font-semibold text-slate-900', className)}
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
      className={joinClassName('mb-3 text-lg font-semibold text-slate-900', className)}
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
      className={joinClassName('mb-3 text-base font-semibold text-slate-900', className)}
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
        <span className="break-all text-[11px] leading-5 text-amber-700">{src}</span>
      ) : null}
    </span>
  );
};

const renderAssistantMessage = (content: string) => {
  return (
    <div className="text-sm text-slate-700">
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
    <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-sm! leading-6! text-white!">
      {content}
    </Typography.Paragraph>
  );
};

const renderBubbleTimestamp = ({
  createdAt,
  tone,
}: {
  createdAt: string;
  tone: 'user' | 'assistant';
}) => {
  return (
    <Typography.Text
      className={
        tone === 'user' ? 'text-[11px] text-blue-100' : 'text-[11px] text-slate-400'
      }
    >
      {formatMessageTime(createdAt)}
    </Typography.Text>
  );
};

const renderConversationLabel = ({
  conversation,
  active,
}: {
  conversation: ConversationSummary;
  active: boolean;
}) => {
  return (
    <div
      className={[
        'group relative w-full overflow-hidden rounded-[24px] border px-4 py-4 text-left transition-all duration-200 ease-out',
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
    <section className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          来源引用
        </Typography.Text>
        <Typography.Text className="text-[11px] text-slate-400">
          {sources.length} 条
        </Typography.Text>
      </div>

      <div className="space-y-2">
        {sources.map((source) => (
          <article
            key={`${source.knowledgeId}:${source.documentId}:${source.chunkId}:${source.chunkIndex}`}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <Typography.Text className="block truncate text-xs font-semibold text-slate-700">
                {source.source}
              </Typography.Text>
              {formatSourceDistance(source.distance) ? (
                <Typography.Text className="shrink-0 text-[11px] text-slate-400">
                  {formatSourceDistance(source.distance)}
                </Typography.Text>
              ) : null}
            </div>
            <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-6! text-slate-600!">
              {source.snippet}
            </Typography.Paragraph>
          </article>
        ))}
      </div>
    </section>
  );
};

const renderAssistantFooter = (extraInfo?: ProjectChatBubbleExtraInfo) => {
  if (!extraInfo) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      {renderBubbleTimestamp({
        createdAt: extraInfo.createdAt,
        tone: 'assistant',
      })}
      {extraInfo.sources.length > 0 ? (
        <ProjectConversationSources sources={extraInfo.sources} />
      ) : null}
    </div>
  );
};

const renderUserFooter = (extraInfo?: ProjectChatBubbleExtraInfo) => {
  if (!extraInfo) {
    return null;
  }

  return (
    <div className="mt-2 flex justify-end">
      {renderBubbleTimestamp({
        createdAt: extraInfo.createdAt,
        tone: 'user',
      })}
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
    label: renderConversationLabel({
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
    rootClassName: 'max-w-[85%]',
    styles: {
      body: AI_BUBBLE_STYLE,
    },
    contentRender: (content) => renderAssistantMessage(String(content)),
    footerPlacement: 'inner-start',
    footer: (_content, info) =>
      renderAssistantFooter(info.extraInfo as ProjectChatBubbleExtraInfo | undefined),
  },
  user: {
    placement: 'end',
    variant: 'borderless',
    rootClassName: 'max-w-[85%]',
    styles: {
      body: USER_BUBBLE_STYLE,
    },
    contentRender: (content) => renderUserMessage(String(content)),
    footerPlacement: 'inner-end',
    footer: (_content, info) =>
      renderUserFooter(info.extraInfo as ProjectChatBubbleExtraInfo | undefined),
  },
};

export const PROJECT_CHAT_BUBBLE_LIST_CLASS_NAMES = {
  bubble: 'mb-3 last:mb-0',
  root: 'h-full',
  scroll: 'pr-1',
} as const;

export const PROJECT_CHAT_BUBBLE_LIST_STYLES = {
  root: {
    height: '100%',
  },
} satisfies Record<'root', CSSProperties>;
