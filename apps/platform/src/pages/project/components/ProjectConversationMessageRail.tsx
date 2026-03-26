import {
  BookOutlined,
  CheckSquareOutlined,
  CloseOutlined,
  FileMarkdownOutlined,
  MenuFoldOutlined,
  PushpinOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Empty,
  Typography,
} from 'antd';
import React, { type CSSProperties, type ReactNode } from 'react';
import i18n from '../../../i18n';
import type { ProjectConversationMessageResponse } from '@api/projects';
import { PROJECT_CHAT_STAR_CLASS_NAMES } from '../projectChatStar.styles';
import type { ProjectConversationMessageRailMode } from '../useProjectConversationMessageRail';
import { tp } from '../project.i18n';

void React;

const DESKTOP_RAIL_GUTTER_WIDTH_CLASS_NAME = 'w-[72px]';
const DESKTOP_RAIL_PANEL_WIDTH_CLASS_NAME = 'w-[320px]';
const MESSAGE_PREVIEW_STYLE: CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
};

type ProjectConversationMessageRailVariant = 'desktop' | 'mobile';

interface ProjectConversationMessageRailProps {
  variant?: ProjectConversationMessageRailVariant;
  messages: ProjectConversationMessageResponse[];
  mode: ProjectConversationMessageRailMode;
  expanded: boolean;
  selectedMessageIds: string[];
  selectableMessageIds: string[];
  starringMessageId?: string | null;
  exportDisabled: boolean;
  knowledgeDraftDisabled: boolean;
  onExpandedChange?: (nextExpanded: boolean) => void;
  onModeChange: (mode: ProjectConversationMessageRailMode) => void;
  onToggleSelectedMessageId: (messageId: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onToggleMessageStar: (
    message: ProjectConversationMessageResponse,
    nextStarred: boolean,
  ) => void;
  onExportMarkdown: () => void;
  onGenerateKnowledgeDraft: () => void;
}

const formatMessageTime = (value: string): string => {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const buildMessagePreview = (content: string): string => {
  const normalized = content.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return tp('conversation.messageEmpty');
  }

  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized;
};

const MODE_META: Record<
  ProjectConversationMessageRailMode,
  {
    icon: ReactNode;
    label: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  browse: {
    icon: <PushpinOutlined />,
    label: tp('conversation.browse.label'),
    description: tp('conversation.browse.description'),
    emptyTitle: tp('conversation.browse.emptyTitle'),
    emptyDescription: tp('conversation.browse.emptyDescription'),
  },
  starred: {
    icon: <StarOutlined />,
    label: tp('conversation.starred.label'),
    description: tp('conversation.starred.description'),
    emptyTitle: tp('conversation.starred.emptyTitle'),
    emptyDescription: tp('conversation.starred.emptyDescription'),
  },
  selection: {
    icon: <CheckSquareOutlined />,
    label: tp('conversation.selection.label'),
    description: tp('conversation.selection.description'),
    emptyTitle: tp('conversation.selection.emptyTitle'),
    emptyDescription: tp('conversation.selection.emptyDescription'),
  },
};

const RailModeButton = ({
  active,
  icon,
  activeIcon,
  label,
  onClick,
  activeClassName,
  inactiveClassName,
}: {
  active: boolean;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  onClick: () => void;
  activeClassName?: string;
  inactiveClassName?: string;
}) => {
  const resolvedIcon = active && activeIcon ? activeIcon : icon;

  return (
    <Button
      type="text"
      icon={resolvedIcon}
      size="small"
      onClick={onClick}
      className={[
        'h-7! rounded-full! border-0! px-2.5! text-xs! font-medium! shadow-none!',
        active
          ? (activeClassName ??
            'bg-white! text-slate-800! shadow-[0_6px_18px_rgba(15,23,42,0.08)]!')
          : (inactiveClassName ?? 'text-slate-500!'),
      ].join(' ')}
    >
      {label}
    </Button>
  );
};

const RailCountBadge = ({
  value,
  tone = 'neutral',
}: {
  value: string;
  tone?: 'neutral' | 'selection';
}) => {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-caption font-medium',
        tone === 'selection'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-500',
      ].join(' ')}
    >
      {value}
    </span>
  );
};

const RailBulkActionButton = ({
  icon,
  children,
  readOnly = false,
  disabled = false,
  variant = 'secondary',
  onClick,
}: {
  icon: ReactNode;
  children: ReactNode;
  readOnly?: boolean;
  disabled?: boolean;
  variant?: 'secondary' | 'primary';
  onClick: () => void;
}) => {
  const handleClick = () => {
    if (readOnly || disabled) {
      return;
    }

    onClick();
  };

  return (
    <Button
      type={variant === 'primary' && !readOnly ? 'primary' : 'default'}
      icon={icon}
      disabled={disabled && !readOnly}
      aria-disabled={readOnly ? true : undefined}
      tabIndex={readOnly ? -1 : undefined}
      onClick={handleClick}
      className={[
        'h-10! justify-start! rounded-2xl! px-4! text-sm! font-medium! shadow-none! transition-colors',
        readOnly
          ? 'cursor-not-allowed! border-slate-200! bg-white! text-slate-400! opacity-100! hover:border-slate-200! hover:bg-white! hover:text-slate-400!'
          : variant === 'primary'
            ? 'border-emerald-500! bg-emerald-500! text-white! hover:border-emerald-600! hover:bg-emerald-600! hover:text-white! disabled:border-slate-200! disabled:bg-slate-100! disabled:text-slate-400!'
            : 'border-slate-200! bg-white! text-slate-700! hover:border-slate-300! hover:bg-slate-50/80! hover:text-slate-800! disabled:border-slate-200! disabled:bg-white! disabled:text-slate-400!',
      ].join(' ')}
    >
      {children}
    </Button>
  );
};

const RailContent = ({
  messages,
  mode,
  expanded: _expanded,
  selectedMessageIds,
  selectableMessageIds,
  starringMessageId,
  exportDisabled,
  knowledgeDraftDisabled,
  onExpandedChange,
  onModeChange,
  onToggleSelectedMessageId,
  onScrollToMessage,
  onToggleMessageStar,
  onExportMarkdown,
  onGenerateKnowledgeDraft,
}: Omit<ProjectConversationMessageRailProps, 'variant'>) => {
  const selectableMessageIdSet = new Set(selectableMessageIds);
  const selectedMessageIdSet = new Set(selectedMessageIds);
  const visibleMessages =
    mode === 'starred'
      ? messages.filter((message) => message.starred)
      : messages;
  const activeModeMeta = MODE_META[mode];
  const hasVisibleRows = visibleMessages.length > 0;
  const countLabel =
    mode === 'selection'
      ? tp('conversation.selectedCount', { count: selectedMessageIds.length })
      : tp('conversation.messageCount', { count: visibleMessages.length });
  const bulkActionsReadOnly = mode === 'selection' && selectedMessageIds.length <= 0;
  const canCollapse = Boolean(onExpandedChange) && mode !== 'selection';
  const headerEyebrow =
    mode === 'selection' ? tp('conversation.railBatchTitle') : tp('conversation.railTitle');
  const handleMessageAction = ({
    messageId,
    selectable,
  }: {
    messageId: string;
    selectable: boolean;
  }) => {
    if (mode === 'selection') {
      if (selectable) {
        onToggleSelectedMessageId(messageId);
      }
      return;
    }

    onScrollToMessage(messageId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        data-project-chat-message-rail-header="true"
        className="border-b border-[#e1ebe7] bg-[linear-gradient(180deg,rgba(248,252,251,0.98),rgba(243,247,245,0.96))] px-4 py-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Typography.Text className="text-caption font-semibold uppercase tracking-[0.18em] text-slate-400">
              {headerEyebrow}
            </Typography.Text>
            <Typography.Title level={5} className="mb-0! mt-1! text-slate-800!">
              {activeModeMeta.label}
            </Typography.Title>
            <Typography.Paragraph className="mb-0! mt-1.5 text-xs! leading-5! text-slate-500!">
              {activeModeMeta.description}
            </Typography.Paragraph>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <RailCountBadge
              value={countLabel}
              tone={mode === 'selection' ? 'selection' : 'neutral'}
            />
            {canCollapse ? (
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                aria-label={tp('conversation.railCollapse')}
                className="h-8! w-8! rounded-full! border border-slate-200! bg-white! text-slate-500! shadow-none!"
                onClick={() => onExpandedChange?.(false)}
              />
            ) : null}
          </div>
        </div>

        <div
          data-project-chat-message-rail-toolbar="true"
          className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-[#dbe7e2] bg-white/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
        >
          {mode === 'selection' ? (
            <div className="flex w-full items-center justify-between gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
              <div className="min-w-0">
                <Typography.Text className="block text-xs font-medium text-emerald-700">
                  {tp('conversation.railSelectionTitle')}
                </Typography.Text>
                {/* <Typography.Text className="block text-[11px] text-emerald-700/80">
                  点击条目勾选消息，底部操作保持原有导出与知识草稿流程。
                </Typography.Text> */}
              </div>
              <Button
                size="small"
                onClick={() => onModeChange('browse')}
                className="rounded-full! border-emerald-200! bg-white! px-3! text-xs! font-medium! text-emerald-700! shadow-none!"
              >
                {tp('conversation.railBack')}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex rounded-[14px] bg-transparent p-0.5">
                <RailModeButton
                  active={mode === 'browse'}
                  icon={MODE_META.browse.icon}
                  label={tp('conversation.railAll')}
                  onClick={() => onModeChange('browse')}
                />
                <RailModeButton
                  active={mode === 'starred'}
                  icon={MODE_META.starred.icon}
                  activeIcon={
                    <StarFilled
                      className={PROJECT_CHAT_STAR_CLASS_NAMES.iconActive}
                    />
                  }
                  label={tp('conversation.railStarred')}
                  onClick={() => onModeChange('starred')}
                  activeClassName={
                    PROJECT_CHAT_STAR_CLASS_NAMES.buttonActiveAntd
                  }
                  inactiveClassName={[
                    'text-slate-500!',
                    PROJECT_CHAT_STAR_CLASS_NAMES.buttonHoverAntd,
                  ].join(' ')}
                />
              </div>

              <Button
                size="small"
                icon={<CheckSquareOutlined />}
                onClick={() => onModeChange('selection')}
                className="h-9! rounded-full! border-slate-200! bg-white! px-3.5! text-xs! font-medium! text-slate-700! shadow-none! hover:border-slate-300! hover:bg-slate-50/80! hover:text-slate-800!"
              >
                {tp('conversation.railSelect')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        data-project-chat-message-rail-list="true"
        className="project-chat-rail-scroll relative min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-4"
      >
        {hasVisibleRows ? (
          <div
            data-project-chat-message-rail-spine="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex w-6 justify-center"
          >
            <div className="h-full w-px bg-[linear-gradient(180deg,rgba(46,139,118,0.16),rgba(148,163,184,0.12))]" />
          </div>
        ) : null}

        {!hasVisibleRows ? (
          <div className="grid h-full place-items-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="space-y-1 text-center">
                  <Typography.Text className="block text-sm font-medium text-slate-700">
                    {activeModeMeta.emptyTitle}
                  </Typography.Text>
                  <Typography.Text className="text-xs text-slate-500">
                    {activeModeMeta.emptyDescription}
                  </Typography.Text>
                </div>
              }
            />
          </div>
        ) : (
          <div className="relative space-y-1.5">
            {visibleMessages.map((message) => {
              const selectable = selectableMessageIdSet.has(message.id);
              const selected = selectedMessageIdSet.has(message.id);
              const showSelectionAffordance = mode === 'selection';
              const disableSelectionAffordance =
                showSelectionAffordance && !selectable;
              const rowState =
                selected ? 'selected' : disableSelectionAffordance ? 'disabled' : 'default';

              return (
                <article
                  key={message.id}
                  data-project-chat-message-rail-row="true"
                  data-rail-row-state={rowState}
                  tabIndex={0}
                  className={[
                    'group relative ml-2 rounded-[18px] py-3 pl-2.5 transition-[background-color,border-color,box-shadow,color,opacity] outline-none',
                    'before:absolute before:-left-2 before:top-[20px] before:h-px before:w-2 before:bg-[#d7e5e0] before:content-[""]',
                    'focus-visible:ring-2 focus-visible:ring-[#8ab4a5]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f8f6] focus-visible:shadow-[0_10px_26px_rgba(93,142,128,0.14)]',
                    mode !== 'selection' ? 'pr-0' : 'pr-2.5',
                    rowState === 'selected'
                      ? 'bg-emerald-50/72 ring-1 ring-inset ring-emerald-200/80'
                      : rowState === 'disabled'
                        ? 'bg-slate-50/55 text-slate-500 opacity-72 focus-visible:bg-white/88 focus-visible:opacity-100'
                        : 'bg-transparent hover:bg-white/88 focus-visible:bg-white/92',
                    disableSelectionAffordance ? 'cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                  onClick={(event) => {
                    event.currentTarget.focus();
                    handleMessageAction({
                      messageId: message.id,
                      selectable,
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') {
                      return;
                    }

                    event.preventDefault();
                    handleMessageAction({
                      messageId: message.id,
                      selectable,
                    });
                  }}
                >
                    <span
                      data-project-chat-message-rail-node="true"
                      aria-hidden
                      className={[
                      'absolute -left-[11px] top-[16px] h-2.5 w-2.5 rounded-full border border-white shadow-[0_0_0_4px_rgba(244,248,246,0.96)] transition-colors',
                      rowState === 'selected'
                        ? 'bg-emerald-500'
                        : mode === 'starred'
                          ? 'bg-amber-400'
                          : 'bg-[#c7d6d1] group-hover:bg-[#7aa496] group-focus-visible:bg-[#5d8e80]',
                    ].join(' ')}
                  />

                  <div className="flex items-start gap-1.5">
                    {showSelectionAffordance ? (
                      <div className="mt-0.5 flex w-3.5 shrink-0 justify-center">
                        <Checkbox
                          checked={selected}
                          disabled={!selectable}
                          className="mt-0.5"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          onChange={() => onToggleSelectedMessageId(message.id)}
                        />
                      </div>
                    ) : (
                      <div className="w-1 shrink-0" aria-hidden />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={[
                                'rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.02em]',
                                message.role === 'assistant'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600',
                              ].join(' ')}
                            >
                              {message.role === 'assistant'
                                ? tp('conversation.roleAssistant')
                                : tp('conversation.roleUser')}
                            </span>
                            <Typography.Text className="text-[11px] font-medium text-slate-400">
                              {formatMessageTime(message.createdAt)}
                            </Typography.Text>
                            {showSelectionAffordance && message.starred ? (
                              <StarFilled
                                className={[
                                  'text-[11px]',
                                  PROJECT_CHAT_STAR_CLASS_NAMES.iconActive,
                                ].join(' ')}
                              />
                            ) : null}
                            {disableSelectionAffordance ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                {tp('conversation.railSelectDisabled')}
                              </span>
                            ) : null}
                          </div>

                          <Typography.Paragraph
                            className="mb-0! mt-1.5 text-[13px]! leading-[1.55]! text-slate-600!"
                            style={MESSAGE_PREVIEW_STYLE}
                          >
                            {buildMessagePreview(message.content)}
                          </Typography.Paragraph>
                        </div>

                        {mode !== 'selection' ? (
                          <Button
                            type="text"
                            size="small"
                            loading={starringMessageId === message.id}
                            aria-label={message.starred ? tp('conversation.unstar') : tp('conversation.star')}
                            className={[
                              'absolute right-0 h-8! w-8! rounded-full! border-0! shadow-none!',
                              message.starred
                                ? PROJECT_CHAT_STAR_CLASS_NAMES.buttonActiveAntd
                                : PROJECT_CHAT_STAR_CLASS_NAMES.buttonInactiveAntd,
                            ].join(' ')}
                            icon={
                              message.starred ? (
                                <StarFilled
                                  className={PROJECT_CHAT_STAR_CLASS_NAMES.iconActive}
                                />
                              ) : (
                                <StarOutlined />
                              )
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleMessageStar(message, !message.starred);
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {mode === 'selection' ? (
        <div
          data-project-chat-message-rail-selection-footer="true"
          className="border-t border-[#e1ebe7] bg-[linear-gradient(180deg,rgba(247,250,249,0.98),rgba(241,246,244,0.98))] px-4 py-4"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Typography.Text className="block text-xs font-medium text-slate-700">
                {tp('conversation.selection.footerTitle')}
              </Typography.Text>
              {/* <Typography.Text className="block text-[11px] leading-5 text-slate-500">
                已选消息会按当前顺序进入导出与知识草稿流程。
              </Typography.Text> */}
            </div>
            <RailCountBadge
              value={tp('conversation.selectedCount', { count: selectedMessageIds.length })}
              tone="selection"
            />
          </div>

          <div className="flex flex-col gap-2">
            <RailBulkActionButton
              icon={<FileMarkdownOutlined />}
              readOnly={bulkActionsReadOnly}
              disabled={exportDisabled}
              onClick={onExportMarkdown}
            >
              {tp('conversation.selection.export')}
            </RailBulkActionButton>
            <RailBulkActionButton
              variant="primary"
              icon={<BookOutlined />}
              readOnly={bulkActionsReadOnly}
              disabled={knowledgeDraftDisabled}
              onClick={onGenerateKnowledgeDraft}
            >
              {tp('conversation.selection.knowledge')}
            </RailBulkActionButton>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const ProjectConversationMessageRail = ({
  variant = 'desktop',
  expanded,
  onExpandedChange,
  ...contentProps
}: ProjectConversationMessageRailProps) => {
  const gutterModes: ProjectConversationMessageRailMode[] = [
    'browse',
    'starred',
    'selection',
  ];
  const collapsedCount =
    contentProps.mode === 'selection'
      ? contentProps.selectedMessageIds.length
      : contentProps.mode === 'starred'
        ? contentProps.messages.filter((message) => message.starred).length
        : contentProps.messages.length;

  if (variant === 'mobile') {
    return <RailContent expanded {...contentProps} />;
  }

  return (
    <aside
      className={[
        'hidden shrink-0 overflow-hidden border-l border-slate-200 bg-slate-50/70 transition-[width] duration-160 ease-out xl:flex',
        expanded
          ? DESKTOP_RAIL_PANEL_WIDTH_CLASS_NAME
          : DESKTOP_RAIL_GUTTER_WIDTH_CLASS_NAME,
      ].join(' ')}
    >
      <div
        className={[
          'flex h-full shrink-0 flex-col items-center gap-4 overflow-hidden py-5 transition-[width,opacity] duration-160 ease-out',
          expanded
            ? 'w-0 opacity-0 pointer-events-none'
            : `${DESKTOP_RAIL_GUTTER_WIDTH_CLASS_NAME} opacity-100`,
        ].join(' ')}
        inert={expanded}
      >
        <Button
          type="text"
          shape="circle"
          size="large"
          aria-label={expanded ? tp('conversation.railCollapse') : tp('conversation.railExpand')}
          icon={expanded ? <CloseOutlined /> : <MenuFoldOutlined />}
          className="h-10! w-10! border border-slate-200! bg-white! text-slate-500! shadow-[0_8px_20px_rgba(15,23,42,0.04)]!"
          onClick={() => onExpandedChange?.(!expanded)}
        />
        <div className="h-16 w-px rounded-full bg-slate-200" />
        <div className="space-y-2">
          {gutterModes.map((gutterMode) => {
            const active = gutterMode === contentProps.mode;
            const starredActive = active && gutterMode === 'starred';
            return (
              <div
                key={gutterMode}
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                  active
                    ? starredActive
                      ? PROJECT_CHAT_STAR_CLASS_NAMES.gutterActive
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500',
                ].join(' ')}
              >
                {starredActive ? (
                  <StarFilled
                    className={PROJECT_CHAT_STAR_CLASS_NAMES.iconActive}
                  />
                ) : (
                  MODE_META[gutterMode].icon
                )}
              </div>
            );
          })}
        </div>
        <RailCountBadge
          value={String(collapsedCount)}
          tone={contentProps.mode === 'selection' ? 'selection' : 'neutral'}
        />
      </div>

      <div
        className={[
          `${DESKTOP_RAIL_PANEL_WIDTH_CLASS_NAME} h-full shrink-0 bg-white transition-opacity duration-160 ease-out`,
          expanded ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        inert={!expanded}
      >
        <RailContent
          {...contentProps}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
        />
      </div>
    </aside>
  );
};
