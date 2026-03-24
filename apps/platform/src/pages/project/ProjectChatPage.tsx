import {
  ArrowUpOutlined,
  PlusOutlined,
  PushpinOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Input,
  Skeleton,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PATHS,
} from '@app/navigation/paths';
import { KNOWJECT_BRAND } from '@styles/brand';
import { ProjectConversationList } from './components/ProjectConversationList';
import { ProjectConversationMessageRail } from './components/ProjectConversationMessageRail';
import { ProjectConversationSourceDrawer } from './components/ProjectConversationSourceDrawer';
import { ProjectKnowledgeAccessModal } from './components/ProjectKnowledgeAccessModal';
import { ProjectKnowledgeDraftDrawer } from './components/ProjectKnowledgeDraftDrawer';
import {
  buildProjectChatBubbleItems,
  PROJECT_CHAT_BUBBLE_LIST_CLASS_NAMES,
  PROJECT_CHAT_BUBBLE_LIST_STYLES,
  PROJECT_CHAT_BUBBLE_ROLES,
} from './projectChat.adapters';
import { buildOptimisticProjectConversationMessages } from './useProjectConversationTurn.helpers';
import { useProjectChatActions } from './useProjectChatActions';
import { useProjectChatUserMessageActions } from './useProjectChatUserMessageActions';
import { useProjectChatSettings } from './useProjectChatSettings';
import { useProjectKnowledgeDraftFlow } from './useProjectKnowledgeDraftFlow';
import {
  buildProjectConversationMessageBulkActionState,
  useProjectConversationMessageActions,
} from './useProjectConversationMessageActions';
import {
  type ProjectConversationTargetRefValue,
  useProjectConversationDetail,
} from './useProjectConversationDetail';
import { useProjectConversationMessageRail } from './useProjectConversationMessageRail';
import { useProjectConversationTurn } from './useProjectConversationTurn';
import { useProjectConversationSourceDrawer } from './useProjectConversationSourceDrawer';
import { useProjectPageContext } from './projectPageContext';
import { tp } from './project.i18n';

export const ProjectChatPage = () => {
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const {
    activeProject,
    conversations,
    projectKnowledge,
  } = useProjectPageContext();
  const conversationScopeKey = `${activeProject.id}:${chatId ?? ''}`;
  const latestConversationTargetRef = useRef<ProjectConversationTargetRefValue>({
    projectId: activeProject.id,
    chatId,
  });
  const [composerState, setComposerState] = useState(() => ({
    scopeKey: conversationScopeKey,
    value: '',
  }));
  const composerValue =
    composerState.scopeKey === conversationScopeKey ? composerState.value : '';
  const setComposerValue = (value: string) => {
    setComposerState({
      scopeKey: conversationScopeKey,
      value,
    });
  };
  const [mobileRailState, setMobileRailState] = useState(() => ({
    scopeKey: conversationScopeKey,
    open: false,
  }));
  const mobileRailOpen =
    mobileRailState.scopeKey === conversationScopeKey
      ? mobileRailState.open
      : false;
  const setMobileRailOpen = (open: boolean) => {
    setMobileRailState({
      scopeKey: conversationScopeKey,
      open,
    });
  };

  useEffect(() => {
    latestConversationTargetRef.current = {
      projectId: activeProject.id,
      chatId,
    };
  }, [activeProject.id, chatId]);

  const {
    chatSettingsLoading,
    chatSettingsError,
    blockingChatIssue,
    inlineChatIssue,
    setChatRuntimeIssue,
    buildChatIssueFromError,
    loadChatSettings,
  } = useProjectChatSettings(activeProject.id);
  const {
    currentConversationDetail,
    detailLoading,
    detailError,
    shouldShowConversationSkeleton,
    setConversationDetail,
    setDetailError,
    reconcileConversationDetail,
  } = useProjectConversationDetail({
    activeProjectId: activeProject.id,
    chatId,
    latestConversationTargetRef,
  });
  const {
    streamStatus,
    streamError,
    activeReplay,
    pendingUserMessage,
    draftAssistantMessage,
    sourceDrawerDraftSnapshot,
    assistantMessageHandoff,
    isStreaming,
    turnBusy,
    handleSendMessage,
    retrySourceDrawerTurn,
    handleCancelStreaming,
  } = useProjectConversationTurn({
    activeProjectId: activeProject.id,
    chatId,
    latestConversationTargetRef,
    conversations,
    currentConversationDetail,
    setConversationDetail,
    setDetailError,
    setComposerValue: (value) => setComposerValue(value),
    setChatRuntimeIssue,
    buildChatIssueFromError,
    reconcileConversationDetail,
  });
  const {
    messageActionLocked,
    getUserMessageActionHandlers,
  } = useProjectChatUserMessageActions({
    currentConversationDetail,
    turnBusy,
    handleSendMessage,
  });
  const {
    renameTargetConversation,
    renameConversationTitleDraft,
    setRenameConversationTitleDraft,
    creatingConversation,
    renamingConversation,
    createActionLocked,
    conversationActionsLocked,
    handleCreateChat,
    handleConversationContextAction,
    handleUpdateConversationTitle,
    handleCancelRenamingConversation,
    handleSelectConversation,
  } = useProjectChatActions({
    activeProjectId: activeProject.id,
    latestConversationTargetRef,
    conversations,
    turnBusy,
    setConversationDetail,
    setDetailError,
    setChatRuntimeIssue,
    buildChatIssueFromError,
  });

  const activeConversation = chatId
    ? conversations.items.find((conversation) => conversation.id === chatId) ?? null
    : null;
  const displayMessages = buildOptimisticProjectConversationMessages({
    messages: currentConversationDetail?.messages ?? [],
    replay:
      activeReplay && activeReplay.conversationId === chatId
        ? activeReplay
        : null,
  });
  const {
    starringMessageId,
    savingKnowledgeDraft,
    toggleMessageStar,
    getAssistantMessageActionHandlers,
    getDraftAssistantMessageActionHandlers,
    exportSelectedMessagesAsMarkdown,
    buildKnowledgeDraftFromSelection,
    saveKnowledgeDraft,
  } = useProjectConversationMessageActions({
    activeProjectId: activeProject.id,
    conversationId: chatId,
    currentConversationDetail,
    messageActionLocked,
    turnBusy,
    handleSendMessage,
    setConversationDetail,
    refreshProjectKnowledge: projectKnowledge.refresh,
  });
  const baseConversationBubbleItems = buildProjectChatBubbleItems(
    displayMessages,
    {
      conversationId: chatId,
      pendingUserMessage,
      draftAssistantMessage,
      getAssistantMessageActions: (chatMessage) =>
        getAssistantMessageActionHandlers(chatMessage.id),
      getDraftAssistantMessageActions: (draftMessage) =>
        getDraftAssistantMessageActionHandlers(draftMessage.content),
      getUserMessageActions: (chatMessage) =>
        getUserMessageActionHandlers(chatMessage.id),
    },
  );
  const messageRail = useProjectConversationMessageRail({
    messages: displayMessages,
    pendingUserMessageId:
      pendingUserMessage?.conversationId === chatId
        ? pendingUserMessage?.id ?? null
        : null,
    draftAssistantMessageId:
      draftAssistantMessage?.conversationId === chatId
        ? draftAssistantMessage?.id ?? null
        : null,
  });
  const draftAssistantMessageWithinScope =
    draftAssistantMessage?.conversationId === chatId ? draftAssistantMessage : null;
  const sourceDrawerDraftSnapshotWithinScope =
    sourceDrawerDraftSnapshot?.conversationId === chatId
      ? sourceDrawerDraftSnapshot
      : null;
  const draftAssistantMessageForSourceDrawer =
    draftAssistantMessageWithinScope
      ? {
          id: draftAssistantMessageWithinScope.id,
          status: draftAssistantMessageWithinScope.status,
          sources: draftAssistantMessageWithinScope.sources,
          sourceSeedEntries: draftAssistantMessageWithinScope.sourceSeedEntries,
        }
      : sourceDrawerDraftSnapshotWithinScope
        ? {
            id: sourceDrawerDraftSnapshotWithinScope.id,
            status: sourceDrawerDraftSnapshotWithinScope.status,
            sources: [],
            sourceSeedEntries: sourceDrawerDraftSnapshotWithinScope.sourceSeedEntries,
          }
        : null;
  const sourceDrawer = useProjectConversationSourceDrawer({
    activeProjectId: activeProject.id,
    chatId,
    messages: displayMessages,
    draftAssistantMessage: draftAssistantMessageForSourceDrawer,
    handoff: assistantMessageHandoff,
    onRetry: retrySourceDrawerTurn,
  });
  const conversationBubbleItems = baseConversationBubbleItems.map((item) => {
    if (item.role !== 'ai') {
      return item;
    }

    const itemMessageId = String(item.key);
    const hasSources =
      Array.isArray(item.extraInfo?.sources) &&
      item.extraInfo.sources.length > 0;
    const hasSeedEntries =
      Array.isArray(item.extraInfo?.sourceSeedEntries) &&
      item.extraInfo.sourceSeedEntries.length > 0;

    if (!hasSources && !hasSeedEntries) {
      return item;
    }

    return {
      ...item,
      extraInfo: {
        ...item.extraInfo,
        onOpenSource: (sourceKey: string) => {
          setMobileRailOpen(false);
          sourceDrawer.openDrawer({
            messageId: itemMessageId,
            sourceKey,
          });
        },
      },
    };
  });
  const sendActionLocked =
    turnBusy ||
    messageActionLocked ||
    detailLoading ||
    chatSettingsLoading ||
    blockingChatIssue !== null;
  const canSubmitMessage = composerValue.trim().length > 0 && !sendActionLocked;
  const bulkActionState = buildProjectConversationMessageBulkActionState({
    isStreaming,
    selectedMessageCount: messageRail.selectedMessageIds.length,
  });
  const knowledgeDraftFlow = useProjectKnowledgeDraftFlow({
    activeProjectId: activeProject.id,
    chatId,
    projectKnowledgeItems: projectKnowledge.items,
    projectKnowledgeLoading: projectKnowledge.loading,
    projectKnowledgeError: projectKnowledge.error,
    refreshProjectKnowledge: projectKnowledge.refresh,
    savingKnowledgeDraft,
    selectedMessageIds: messageRail.selectedMessageIds,
    railMode: messageRail.mode,
    setRailMode: messageRail.setMode,
    setRailSelectedMessageIds: messageRail.setSelectedMessageIds,
    buildKnowledgeDraftFromSelection,
    saveKnowledgeDraft,
  });

  const handleScrollToMessage = (messageId: string) => {
    document.getElementById(`project-chat-message-${messageId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const railProps = {
    messages: displayMessages,
    mode: messageRail.mode,
    expanded: sourceDrawer.state.open ? false : messageRail.expanded,
    selectedMessageIds: messageRail.selectedMessageIds,
    selectableMessageIds: messageRail.selectableMessageIds,
    starringMessageId,
    exportDisabled: bulkActionState.exportDisabled,
    knowledgeDraftDisabled: bulkActionState.knowledgeDraftDisabled,
    onExpandedChange: messageRail.setPanelOpen,
    onModeChange: messageRail.setMode,
    onToggleSelectedMessageId: messageRail.toggleSelectedMessageId,
    onScrollToMessage: handleScrollToMessage,
    onToggleMessageStar: (
      chatMessage: (typeof displayMessages)[number],
      nextStarred: boolean,
    ) => {
      void toggleMessageStar(chatMessage.id, nextStarred);
    },
    onExportMarkdown: () => {
      exportSelectedMessagesAsMarkdown(messageRail.selectedMessageIds);
    },
    onGenerateKnowledgeDraft: knowledgeDraftFlow.openKnowledgeDraft,
  } as const;

  const renderCreateChatButton = ({
    block = false,
    compact = false,
  }: {
    block?: boolean;
    compact?: boolean;
  }) => (
    <Button
      block={block}
      icon={<PlusOutlined />}
      size="large"
      loading={creatingConversation}
      disabled={createActionLocked}
      onClick={() => void handleCreateChat()}
      className={[
        compact
          ? 'h-11! w-full rounded-full! border-slate-200! bg-white! px-5! text-sm! font-semibold! text-slate-700! shadow-[0_8px_20px_rgba(15,23,42,0.04)]! transition-all! hover:-translate-y-0.5 hover:border-slate-300! hover:bg-slate-50! md:w-auto'
          : 'h-13! rounded-card-lg! border-dashed! border-slate-300! bg-white! px-6! text-base! font-semibold! text-slate-700! shadow-hero! transition-all! hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50!',
      ].join(' ')}
    >
      {tp('conversation.create')}
    </Button>
  );

  return (
    <section className="grid h-full min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-surface xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/70 xl:border-b-0 xl:border-r">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="rounded-hero border border-slate-200 bg-white p-4 shadow-shell">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Typography.Text className="text-caption font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {tp('conversation.title')}
                    </Typography.Text>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-caption font-medium text-slate-500">
                      {tp('conversation.threadCount', {
                        count: conversations.items.length,
                      })}
                    </span>
                  </div>
                  <Typography.Title level={4} className="mb-1! mt-0! text-slate-800!">
                    {tp('conversation.recentContext')}
                  </Typography.Title>
                </div>

                <div className="xl:hidden">{renderCreateChatButton({ compact: true })}</div>
              </div>

              <div className="flex flex-wrap gap-2 text-caption text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                  {tp('conversation.formalThread')}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                  {tp('conversation.openOrMenu')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {conversations.loading ? (
            <div className="space-y-3 px-1 py-1">
              <Skeleton active paragraph={{ rows: 3 }} />
              <Skeleton active paragraph={{ rows: 3 }} />
            </div>
          ) : conversations.error ? (
            <Alert
              type="warning"
              showIcon
              title={tp('conversation.loadFailed')}
              description={conversations.error}
            />
          ) : (
            <ProjectConversationList
              conversations={conversations.items}
              activeConversationId={activeConversation?.id}
              actionsLocked={conversationActionsLocked}
              editingConversationId={renameTargetConversation?.id}
              editingTitleDraft={renameConversationTitleDraft}
              renamingConversation={renamingConversation}
              onAction={handleConversationContextAction}
              onEditingTitleDraftChange={setRenameConversationTitleDraft}
              onRenameSubmit={() => void handleUpdateConversationTitle()}
              onRenameCancel={handleCancelRenamingConversation}
              onSelect={handleSelectConversation}
            />
          )}
        </div>

        <footer className="hidden border-t border-slate-200 p-4 xl:block">
          {renderCreateChatButton({ block: true })}
        </footer>
      </aside>

      <main className="flex min-h-0 flex-col bg-white">
        {shouldShowConversationSkeleton ? (
          <div className="p-6">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : currentConversationDetail ? (
          <>
            <div className="flex min-h-0 flex-1 bg-white">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_bottom,rgba(40,184,160,0.08),transparent_34%),linear-gradient(180deg,rgba(246,251,250,0.82)_0%,rgba(255,255,255,0.98)_26%,rgba(255,255,255,1)_100%)] px-6 py-5">
                  <div className="mb-4 flex justify-end xl:hidden">
                    <Button
                      icon={<PushpinOutlined />}
                      onClick={() => {
                        sourceDrawer.closeDrawer();
                        setMobileRailOpen(true);
                      }}
                      className="rounded-full! border-slate-200! bg-white! text-slate-700!"
                    >
                      {tp('conversation.railTitle')}
                    </Button>
                  </div>

                  {blockingChatIssue ? (
                    <Alert
                      type="warning"
                      showIcon
                      className="mb-4"
                      title={blockingChatIssue.title}
                      description={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <span>{blockingChatIssue.description}</span>
                          <div className="flex flex-wrap gap-2">
                            <Button type="primary" onClick={() => navigate(PATHS.settings)}>
                              {tp('conversation.toSettings')}
                            </Button>
                            <Button onClick={() => void loadChatSettings()}>
                              {tp('conversation.reloadConfig')}
                            </Button>
                          </div>
                        </div>
                      }
                    />
                  ) : null}
                  {chatSettingsError ? (
                    <Alert
                      type="warning"
                      showIcon
                      className="mb-4"
                      title={tp('conversation.configUnknown')}
                      description={tp('conversation.configHelp', {
                        error: chatSettingsError,
                      })}
                    />
                  ) : null}
                  {inlineChatIssue ? (
                    <Alert
                      type="warning"
                      showIcon
                      className="mb-4"
                      title={inlineChatIssue.title}
                      description={inlineChatIssue.description}
                    />
                  ) : null}
                  {conversationBubbleItems.length > 0 ? (
                    <div className="min-h-0 flex-1">
                      <div className="mx-auto h-full w-full max-w-7xl">
                        <Bubble.List
                          items={conversationBubbleItems}
                          autoScroll
                          role={PROJECT_CHAT_BUBBLE_ROLES}
                          classNames={PROJECT_CHAT_BUBBLE_LIST_CLASS_NAMES}
                          styles={PROJECT_CHAT_BUBBLE_LIST_STYLES}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-0 flex-1 place-items-center">
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tp('conversation.emptyChat')} />
                    </div>
                  )}
                </div>

                <footer className="border-t border-slate-200/70 bg-white px-6 pb-5 pt-4">
                  <div className="mx-auto w-full max-w-7xl">
                    <form
                      className="rounded-hero border bg-white p-2.5 transition-colors duration-200"
                      style={{
                        borderColor: KNOWJECT_BRAND.primaryBorder,
                      }}
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSendMessage(composerValue);
                      }}
                    >
                      <div className="flex items-end gap-3">
                        <div className="min-w-0 flex-1">
                          <Input.TextArea
                            value={composerValue}
                            autoSize={{ minRows: 1, maxRows: 6 }}
                            disabled={sendActionLocked}
                            variant="borderless"
                            aria-label={tp('conversation.composerAria')}
                            placeholder={tp('conversation.composerPlaceholder')}
                            style={{ width: '100%' }}
                            className="w-full! rounded-card-lg! bg-transparent! px-4! py-3! text-body! leading-7! text-slate-700! placeholder:text-slate-400!"
                            onChange={(event) => setComposerValue(event.target.value)}
                            onPressEnter={(event) => {
                              if (event.shiftKey || event.nativeEvent.isComposing) {
                                return;
                              }

                              event.preventDefault();
                              void handleSendMessage(composerValue);
                            }}
                          />
                        </div>

                        {isStreaming ? (
                          <Button
                            htmlType="button"
                            aria-label={tp('conversation.stop')}
                            icon={<StopOutlined />}
                            onClick={handleCancelStreaming}
                            className="mb-1 h-11! rounded-full! border-slate-200! px-4! text-sm! font-semibold! text-slate-700!"
                          >
                            {tp('conversation.stop')}
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            htmlType="submit"
                            shape="circle"
                            aria-label={tp('conversation.sendAria')}
                            loading={streamStatus === 'reconciling'}
                            disabled={!canSubmitMessage}
                            icon={<ArrowUpOutlined />}
                            className="mb-1 h-11! w-11! shrink-0 border-0!"
                            style={{
                              background: canSubmitMessage
                                ? KNOWJECT_BRAND.primary
                                : KNOWJECT_BRAND.primarySurfaceStrong,
                              color: canSubmitMessage
                                ? '#ffffff'
                                : KNOWJECT_BRAND.textMuted,
                            }}
                          />
                        )}
                      </div>
                    </form>
                  </div>
                </footer>
              </div>

              <ProjectConversationMessageRail {...railProps} />
            </div>

            <Drawer
              open={mobileRailOpen}
              size={360}
              title={tp('conversation.railTitle')}
              placement="right"
              className="xl:hidden"
              onClose={() => setMobileRailOpen(false)}
            >
              <ProjectConversationMessageRail
                {...railProps}
                variant="mobile"
                expanded
                onExpandedChange={undefined}
              />
            </Drawer>

            <Drawer
              open={sourceDrawer.state.open}
              width={460}
              title={tp('conversation.viewSources')}
              placement="right"
              onClose={sourceDrawer.closeDrawer}
            >
              <ProjectConversationSourceDrawer
                state={sourceDrawer.state.status}
                sourceEntries={sourceDrawer.viewModel.sourceEntries}
                activeSourceKey={sourceDrawer.viewModel.activeSourceKey ?? ''}
                activeChunkId={sourceDrawer.state.activeChunkId}
                errorMessage={streamError ?? undefined}
                onSourceKeyChange={sourceDrawer.setActiveSourceKey}
                onActiveChunkIdChange={sourceDrawer.setActiveChunkId}
                onRetry={sourceDrawer.retry}
              />
            </Drawer>

            <ProjectKnowledgeDraftDrawer
              {...knowledgeDraftFlow.drawerProps}
            />

            <ProjectKnowledgeAccessModal
              {...knowledgeDraftFlow.accessModalProps}
            />
          </>
        ) : (
          <div className="grid min-h-full place-items-center px-8 py-10">
            {chatId ? (
              <Alert
                type={detailError ? 'error' : 'warning'}
                showIcon
                title={detailError ? tp('conversation.loadFailed') : tp('conversation.missingConversation')}
                description={
                  detailError ??
                  tp('conversation.missingConversationDescription')
                }
              />
            ) : (
              <div className="flex max-w-md flex-col items-center gap-5 text-center">
                {blockingChatIssue ? (
                  <Alert
                    type="warning"
                    showIcon
                    title={blockingChatIssue.title}
                    description={
                      <div className="flex flex-col gap-3">
                        <span>{blockingChatIssue.description}</span>
                        <div className="flex flex-col justify-center gap-3 sm:flex-row">
                          <Button type="primary" onClick={() => navigate(PATHS.settings)}>
                            {tp('conversation.toSettings')}
                          </Button>
                          <Button onClick={() => void loadChatSettings()}>
                            {tp('conversation.reloadConfig')}
                          </Button>
                        </div>
                      </div>
                    }
                  />
                ) : null}
                {chatSettingsError ? (
                  <Alert
                    type="warning"
                    showIcon
                    title={tp('conversation.configUnknown')}
                    description={tp('conversation.configHelpEmpty', {
                      error: chatSettingsError,
                    })}
                  />
                ) : null}
                <Empty
                  description={
                    <Typography.Text type="secondary">
                      {tp('conversation.emptyStateDescription')}
                    </Typography.Text>
                  }
                />
                {renderCreateChatButton({ compact: true })}
              </div>
            )}
          </div>
        )}
      </main>
    </section>
  );
};
