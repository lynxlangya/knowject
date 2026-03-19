import type {
  BubbleItemType,
  BubbleListProps,
  ConversationItemType,
} from '@ant-design/x';
import type { MenuProps } from 'antd';
import type { CSSProperties } from 'react';
import { createElement } from 'react';
import type { ConversationSummary } from '@app/project/project.types';
import type { ProjectConversationMessageResponse } from '@api/projects';
import { KNOWJECT_BRAND } from '@styles/brand';
import {
  ProjectChatAssistantFooter,
  ProjectChatAssistantMessage,
  type ProjectChatBubbleExtraInfo,
  ProjectChatUserFooter,
  ProjectChatUserMessage,
} from './projectChatBubble.components';
import { ProjectConversationLabel } from './projectChat.components';

const AI_BUBBLE_STYLE: CSSProperties = {
  padding: 18,
  borderRadius: 4,
};

const USER_BUBBLE_STYLE: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 4,
  background: KNOWJECT_BRAND.primarySurface,
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
    contentRender: (content) =>
      createElement(ProjectChatAssistantMessage, {
        content: String(content),
      }),
    footerPlacement: 'outer-start',
    footer: (_content, info) =>
      createElement(ProjectChatAssistantFooter, {
        extraInfo: info.extraInfo as ProjectChatBubbleExtraInfo | undefined,
      }),
  },
  user: {
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
      }),
    footerPlacement: 'outer-end',
    footer: (_content, info) =>
      createElement(ProjectChatUserFooter, {
        extraInfo: info.extraInfo as ProjectChatBubbleExtraInfo | undefined,
      }),
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
