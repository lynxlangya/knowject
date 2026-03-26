import type {
  BubbleItemType,
  BubbleListProps,
  ConversationItemType,
} from '@ant-design/x';
import { Typography, type MenuProps } from 'antd';
import type { CSSProperties } from 'react';
import { createElement, type ReactNode } from 'react';
import i18n from '../../i18n';
import type { ConversationSummary } from '../../app/project/project.types';
import type {
  ProjectConversationCitationContent,
  ProjectConversationMessageResponse,
  ProjectConversationSourceResponse,
  ProjectConversationStreamSourcesSeedItem,
} from '../../api/projects';
import { KNOWJECT_BRAND } from '../../styles/brand';
import {
  type ProjectChatAssistantBubbleActions,
  ProjectChatAssistantFooter,
  ProjectChatAssistantMessage,
  type ProjectChatBubbleExtraInfo,
  type ProjectChatBubbleStatus,
  type ProjectChatUserBubbleActions,
  ProjectChatUserFooter,
  ProjectChatUserMessage,
} from './projectChatBubble.components';
import { tp } from './project.i18n';

const AI_BUBBLE_STYLE: CSSProperties = {
  padding: '14px 16px',
  borderRadius: 16,
  background: 'rgba(242, 253, 251, 0.88)',
  border: `1px solid ${KNOWJECT_BRAND.primaryBorder}`,
  boxShadow: '0 2px 12px rgba(15, 42, 38, 0.04)',
};

const USER_BUBBLE_STYLE: CSSProperties = {
  padding: '12px 14px',
  borderRadius: 16,
  background: KNOWJECT_BRAND.primarySurfaceStrong,
  border: `1px solid ${KNOWJECT_BRAND.primaryBorder}`,
  boxShadow: '0 2px 10px rgba(15, 42, 38, 0.05)',
};

interface ProjectConversationLabelProps {
  conversation: ConversationSummary;
  active: boolean;
  titleContent?: ReactNode;
}

const formatConversationUpdatedAt = (value: string): string => {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const ProjectConversationLabel = ({
  conversation,
  active,
  titleContent,
}: ProjectConversationLabelProps) => {
  const rootClassName = [
    'group relative w-full overflow-hidden rounded-3xl border px-4 py-4 text-left transition-colors duration-200 ease-out',
    active
      ? 'bg-white'
      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70',
  ].join(' ');
  const rootStyle = active
    ? {
        backgroundColor: KNOWJECT_BRAND.primarySurface,
        borderColor: KNOWJECT_BRAND.primaryBorder,
      }
    : undefined;
  const railClassName = [
    'absolute bottom-4 left-0 top-4 w-1 rounded-full transition-colors duration-200',
    active ? '' : 'bg-[#C2EDE6] group-hover:bg-[#28B8A0]/60',
  ].join(' ');
  const dotClassName = [
    'h-2.5 w-2.5 rounded-full transition-colors duration-200',
    active ? 'bg-emerald-400' : 'bg-[#C2EDE6] group-hover:bg-[#28B8A0]/70',
  ].join(' ');
  const labelClassName = [
    'text-caption font-semibold uppercase tracking-[0.18em]',
    active ? 'text-emerald-600' : 'text-slate-400',
  ].join(' ');
  const badgeClassName = [
    'shrink-0 rounded-full px-2.5 py-1 text-caption font-medium',
    active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
  ].join(' ');
  const titleClassName =
    '[display:-webkit-box] overflow-hidden text-body font-semibold leading-7 text-slate-800 [-webkit-box-orient:vertical] [-webkit-line-clamp:2]';

  return createElement(
    'div',
    {
      className: rootClassName,
      style: rootStyle,
    },
    createElement('span', {
      className: railClassName,
      style: active ? { backgroundColor: KNOWJECT_BRAND.primary } : undefined,
      'aria-hidden': 'true',
    }),
    createElement(
      'div',
      {
        className: 'pl-3',
      },
      createElement(
        'div',
        {
          className: 'mb-3 flex items-start justify-between gap-3',
        },
        createElement(
          'div',
          {
            className: 'min-w-0 flex-1',
          },
          createElement(
            'div',
            {
              className: 'mb-2 flex items-center gap-2',
            },
            createElement('span', {
              className: dotClassName,
              'aria-hidden': 'true',
            }),
            createElement(
              Typography.Text,
              {
                className: labelClassName,
              },
              active ? tp('conversation.active') : tp('conversation.recent'),
            ),
          ),
        ),
        createElement(
          'span',
          {
            className: badgeClassName,
          },
          formatConversationUpdatedAt(conversation.updatedAt),
        ),
      ),
      titleContent ??
        createElement(
          Typography.Text,
          {
            className: titleClassName,
          },
          conversation.title,
        ),
    ),
  );
};

export type ProjectConversationContextAction =
  | 'share'
  | 'knowledge'
  | 'resources'
  | 'rename'
  | 'delete';

export const buildProjectConversationItems = ({
  conversations,
  activeConversationId,
}: {
  conversations: ConversationSummary[];
  activeConversationId?: string;
}): ConversationItemType[] => {
  return conversations.map((conversation) => ({
    key: conversation.id,
    label: createElement(ProjectConversationLabel, {
      conversation,
      active: conversation.id === activeConversationId,
    }),
  }));
};

export const buildProjectChatBubbleItems = (
  messages: ProjectConversationMessageResponse[],
  options: {
    conversationId?: string;
    pendingUserMessage?: {
      conversationId: string;
      id: string;
      content: string;
      createdAt: string;
    } | null;
    draftAssistantMessage?: {
      conversationId: string;
      id: string;
      content: string;
      createdAt: string;
      status: ProjectChatBubbleStatus;
      sources?: ProjectConversationSourceResponse[];
      citationContent?: ProjectConversationCitationContent;
      sourceSeedEntries?: ProjectConversationStreamSourcesSeedItem[];
      onOpenSource?: (sourceKey: string) => void;
    } | null;
    getDraftAssistantMessageActions?: (draftMessage: {
      conversationId: string;
      id: string;
      content: string;
      createdAt: string;
      status: ProjectChatBubbleStatus;
    }) => ProjectChatAssistantBubbleActions | null;
    getUserMessageActions?: (
      message: ProjectConversationMessageResponse,
    ) => ProjectChatUserBubbleActions | null;
    getAssistantMessageActions?: (
      message: ProjectConversationMessageResponse,
    ) => ProjectChatAssistantBubbleActions | null;
  } = {},
): BubbleItemType[] => {
  const bubbleItems: BubbleItemType[] = messages.map((message) => ({
    key: message.id,
    role: message.role === 'assistant' ? 'ai' : 'user',
    content: message.content,
    extraInfo: {
      messageId: message.id,
      createdAt: message.createdAt,
      sources: message.sources ?? [],
      citationContent: message.citationContent,
      onOpenSource: undefined,
      ...(message.role === 'assistant'
        ? {
            assistantActions:
              options.getAssistantMessageActions?.(message) ?? undefined,
          }
        : {}),
      ...(message.role === 'user'
        ? {
            userActions:
              options.getUserMessageActions?.(message) ?? undefined,
          }
        : {}),
    } satisfies ProjectChatBubbleExtraInfo,
  }));

  if (
    options.pendingUserMessage?.conversationId === options.conversationId &&
    options.pendingUserMessage &&
    !messages.some((message) => message.id === options.pendingUserMessage?.id)
  ) {
    bubbleItems.push({
      key: options.pendingUserMessage.id,
      role: 'user',
      content: options.pendingUserMessage.content,
      extraInfo: {
        createdAt: options.pendingUserMessage.createdAt,
        sources: [],
        citationContent: undefined,
        onOpenSource: undefined,
      } satisfies ProjectChatBubbleExtraInfo,
    });
  }

  if (
    options.draftAssistantMessage &&
    options.draftAssistantMessage.conversationId === options.conversationId
  ) {
    bubbleItems.push({
      key: options.draftAssistantMessage.id,
      role: 'ai',
      content: options.draftAssistantMessage.content || tp('conversation.creatingDraft'),
      extraInfo: {
        createdAt: options.draftAssistantMessage.createdAt,
        sources: options.draftAssistantMessage.sources ?? [],
        citationContent: options.draftAssistantMessage.citationContent,
        sourceSeedEntries: options.draftAssistantMessage.sourceSeedEntries,
        status: options.draftAssistantMessage.status,
        onOpenSource: options.draftAssistantMessage.onOpenSource,
        assistantActions:
          options.getDraftAssistantMessageActions?.(
            options.draftAssistantMessage,
          ) ?? undefined,
      } satisfies ProjectChatBubbleExtraInfo,
    });
  }

  return bubbleItems;
};

export const buildProjectConversationContextMenuItems = ({
  conversationsCount,
  actionsLocked,
}: {
  conversationsCount: number;
  actionsLocked: boolean;
}): NonNullable<MenuProps['items']> => {
  return [
    {
      key: 'share',
      label: tp('conversation.menuShare'),
      disabled: actionsLocked,
    },
    {
      key: 'knowledge',
      label: tp('conversation.menuKnowledge'),
      disabled: actionsLocked,
    },
    {
      key: 'resources',
      label: tp('conversation.menuResources'),
      disabled: actionsLocked,
    },
    {
      type: 'divider',
    },
    {
      key: 'rename',
      label: tp('conversation.menuRename'),
      disabled: actionsLocked,
    },
    {
      key: 'delete',
      label: tp('conversation.actions.deleteConfirm'),
      danger: true,
      disabled: actionsLocked || conversationsCount <= 1,
    },
  ];
};

export const PROJECT_CHAT_BUBBLE_ROLES: BubbleListProps['role'] = {
  ai: {
    placement: 'start',
    variant: 'borderless',
    rootClassName: 'w-fit max-w-[calc(100%-0.5rem)] sm:max-w-[64rem]',
    styles: {
      content: AI_BUBBLE_STYLE,
    },
    contentRender: (content, info) =>
      createElement(ProjectChatAssistantMessage, {
        content: String(content),
        extraInfo: info.extraInfo as ProjectChatBubbleExtraInfo | undefined,
      }),
    footerPlacement: 'outer-start',
    footer: (content, info) =>
      createElement(ProjectChatAssistantFooter, {
        content: String(content),
        extraInfo: info.extraInfo as ProjectChatBubbleExtraInfo | undefined,
      }),
  },
  user: (item) => {
    const extraInfo = item.extraInfo as ProjectChatBubbleExtraInfo | undefined;
    const userActions = extraInfo?.userActions;

    return {
      placement: 'end',
      variant: 'borderless',
      rootClassName:
        'group mb-0! w-fit min-w-[16rem] max-w-[calc(100%-0.5rem)] sm:max-w-[64rem]',
      styles: {
        content: USER_BUBBLE_STYLE,
      },
      contentRender: (content) =>
        createElement(ProjectChatUserMessage, {
          content: String(content),
          extraInfo: extraInfo,
        }),
      editable: userActions
        ? {
            editing: userActions.editing,
            okText: tp('conversation.editSubmit'),
            cancelText: tp('conversation.actions.cancel'),
          }
        : false,
      onEditConfirm: userActions?.onEditConfirm,
      onEditCancel: userActions?.onEditCancel,
      footerPlacement: 'outer-end',
      footer: (_content, info) =>
        createElement(ProjectChatUserFooter, {
          extraInfo: info.extraInfo as ProjectChatBubbleExtraInfo | undefined,
        }),
    };
  },
};

export const PROJECT_CHAT_BUBBLE_LIST_CLASS_NAMES = {
  bubble: 'mb-6 last:mb-0',
  root: 'project-chat-bubble-list h-full',
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
