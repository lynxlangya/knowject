import {
  ArrowUpOutlined,
  PlusOutlined,
  PushpinOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import {
  App,
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
import { extractApiErrorMessage } from '@api/error';
import { createProjectKnowledge } from '@api/knowledge';
import { KNOWJECT_BRAND } from '@styles/brand';
import { ProjectConversationList } from './components/ProjectConversationList';
import { ProjectConversationMessageRail } from './components/ProjectConversationMessageRail';
import {
  ProjectKnowledgeAccessModal,
  type ProjectKnowledgeFormValues,
} from './components/ProjectKnowledgeAccessModal';
import { ProjectKnowledgeDraftDrawer } from './components/ProjectKnowledgeDraftDrawer';
import {
  buildProjectChatBubbleItems,
  PROJECT_CHAT_BUBBLE_LIST_CLASS_NAMES,
  PROJECT_CHAT_BUBBLE_LIST_STYLES,
  PROJECT_CHAT_BUBBLE_ROLES,
} from './projectChat.adapters';
import {
  buildProjectKnowledgeDraftSessionKey,
  resolveProjectKnowledgeDraftSelection,
} from './projectKnowledgeDraft.helpers';
import { buildOptimisticProjectConversationMessages } from './useProjectConversationTurn.helpers';
import { useProjectChatActions } from './useProjectChatActions';
import { useProjectChatUserMessageActions } from './useProjectChatUserMessageActions';
import { useProjectChatSettings } from './useProjectChatSettings';
import {
  buildProjectConversationMessageBulkActionState,
  type ProjectKnowledgeDraftValues,
  useProjectConversationMessageActions,
} from './useProjectConversationMessageActions';
import {
  type ProjectConversationTargetRefValue,
  useProjectConversationDetail,
} from './useProjectConversationDetail';
import {
  closeProjectConversationMessageKnowledgeDrawer,
  completeProjectConversationMessageKnowledgeSave,
  useProjectConversationMessageRail,
} from './useProjectConversationMessageRail';
import { useProjectConversationTurn } from './useProjectConversationTurn';
import { useProjectPageContext } from './projectPageContext';

export const ProjectChatPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const {
    activeProject,
    conversations,
    projectKnowledge,
  } = useProjectPageContext();
  const latestConversationTargetRef = useRef<ProjectConversationTargetRefValue>({
    projectId: activeProject.id,
    chatId,
  });
  const [composerValue, setComposerValue] = useState('');
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [knowledgeDraftOpen, setKnowledgeDraftOpen] = useState(false);
  const [knowledgeDraftValue, setKnowledgeDraftValue] =
    useState<ProjectKnowledgeDraftValues | null>(null);
  const [knowledgeDraftSelectedKnowledgeId, setKnowledgeDraftSelectedKnowledgeId] =
    useState<string | null>(null);
  const [knowledgeDraftPendingKnowledgeOption, setKnowledgeDraftPendingKnowledgeOption] =
    useState<{ label: string; value: string } | null>(null);
  const [knowledgeAccessModalOpen, setKnowledgeAccessModalOpen] =
    useState(false);
  const [creatingDraftKnowledge, setCreatingDraftKnowledge] =
    useState(false);
  const [lastUsedKnowledgeIdBySession, setLastUsedKnowledgeIdBySession] =
    useState<Record<string, string>>({});

  useEffect(() => {
    latestConversationTargetRef.current = {
      projectId: activeProject.id,
      chatId,
    };
  }, [activeProject.id, chatId]);

  useEffect(() => {
    setComposerValue('');
  }, [activeProject.id, chatId]);

  useEffect(() => {
    setMobileRailOpen(false);
    setKnowledgeDraftOpen(false);
    setKnowledgeDraftValue(null);
    setKnowledgeDraftSelectedKnowledgeId(null);
    setKnowledgeDraftPendingKnowledgeOption(null);
    setKnowledgeAccessModalOpen(false);
  }, [activeProject.id, chatId]);

  useEffect(() => {
    if (
      !knowledgeDraftPendingKnowledgeOption ||
      !projectKnowledge.items.some(
        (knowledge) => knowledge.id === knowledgeDraftPendingKnowledgeOption.value,
      )
    ) {
      return;
    }

    setKnowledgeDraftPendingKnowledgeOption(null);
  }, [knowledgeDraftPendingKnowledgeOption, projectKnowledge.items]);

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
    activeReplay,
    pendingUserMessage,
    draftAssistantMessage,
    isStreaming,
    turnBusy,
    handleSendMessage,
    handleCancelStreaming,
  } = useProjectConversationTurn({
    activeProjectId: activeProject.id,
    chatId,
    latestConversationTargetRef,
    conversations,
    currentConversationDetail,
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
  const conversationBubbleItems = buildProjectChatBubbleItems(
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
  const projectKnowledgeOptions = projectKnowledge.items.map((knowledge) => ({
    label: knowledge.name,
    value: knowledge.id,
  }));
  const knowledgeDraftProjectKnowledgeOptions =
    knowledgeDraftPendingKnowledgeOption &&
    !projectKnowledgeOptions.some(
      (option) => option.value === knowledgeDraftPendingKnowledgeOption.value,
    )
      ? [knowledgeDraftPendingKnowledgeOption, ...projectKnowledgeOptions]
      : projectKnowledgeOptions;

  const handleScrollToMessage = (messageId: string) => {
    document.getElementById(`project-chat-message-${messageId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handleOpenKnowledgeDraft = () => {
    const nextDraft = buildKnowledgeDraftFromSelection(
      messageRail.selectedMessageIds,
    );

    if (!nextDraft) {
      message.warning('请先选择至少一条已持久化的消息');
      return;
    }

    const knowledgeIds = knowledgeDraftProjectKnowledgeOptions.map(
      (option) => option.value,
    );

    messageRail.setMode('selection');
    setKnowledgeDraftValue(nextDraft);
    setKnowledgeDraftSelectedKnowledgeId(
      chatId
        ? resolveProjectKnowledgeDraftSelection({
            projectId: activeProject.id,
            chatId,
            projectKnowledgeIds: knowledgeIds,
            lastUsedKnowledgeIdBySession,
          })
        : null,
    );
    setKnowledgeDraftOpen(true);
  };

  const handleCloseKnowledgeDraft = () => {
    if (savingKnowledgeDraft) {
      return;
    }

    const nextSelectionState = closeProjectConversationMessageKnowledgeDrawer({
      mode: messageRail.mode,
      selectedMessageIds: messageRail.selectedMessageIds,
    });

    messageRail.setMode(nextSelectionState.mode);
    messageRail.setSelectedMessageIds(nextSelectionState.selectedMessageIds);
    setKnowledgeDraftOpen(false);
    setKnowledgeDraftSelectedKnowledgeId(null);
  };

  const handleKnowledgeDraftValueChange = (
    patch: Partial<ProjectKnowledgeDraftValues>,
  ) => {
    setKnowledgeDraftValue((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            ...patch,
          }
        : currentValue,
    );
  };

  const handleKnowledgeDraftSaveSuccess = (selectedKnowledgeId: string) => {
    const nextSelectionState = completeProjectConversationMessageKnowledgeSave({
      mode: messageRail.mode,
      selectedMessageIds: messageRail.selectedMessageIds,
    });

    if (chatId) {
      const sessionKey = buildProjectKnowledgeDraftSessionKey(
        activeProject.id,
        chatId,
      );
      setLastUsedKnowledgeIdBySession((currentValue) => ({
        ...currentValue,
        [sessionKey]: selectedKnowledgeId,
      }));
    }

    messageRail.setMode(nextSelectionState.mode);
    messageRail.setSelectedMessageIds(nextSelectionState.selectedMessageIds);
    setKnowledgeDraftOpen(false);
    setKnowledgeDraftValue(null);
    setKnowledgeDraftSelectedKnowledgeId(null);
    message.success('项目知识草稿已保存到所选私有知识库');
  };

  const handleCreateProjectKnowledgeForDraft = async (
    values: ProjectKnowledgeFormValues,
  ) => {
    setCreatingDraftKnowledge(true);

    try {
      const result = await createProjectKnowledge(activeProject.id, {
        name: values.name,
        description: values.description,
        sourceType: 'global_docs',
      });

      setKnowledgeDraftPendingKnowledgeOption({
        label: result.knowledge.name,
        value: result.knowledge.id,
      });
      setKnowledgeDraftSelectedKnowledgeId(result.knowledge.id);
      setKnowledgeAccessModalOpen(false);
      message.success('项目私有知识库已创建');
      void projectKnowledge.refresh();
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, '创建项目知识库失败，请稍后重试'),
      );
    } finally {
      setCreatingDraftKnowledge(false);
    }
  };

  const handleSubmitKnowledgeDraft = async () => {
    if (!knowledgeDraftValue) {
      return;
    }

    const selectedKnowledgeId = knowledgeDraftSelectedKnowledgeId;
    const result = await saveKnowledgeDraft(knowledgeDraftValue, {
      knowledgeId: selectedKnowledgeId,
    });

    if (result.status === 'success' && selectedKnowledgeId) {
      handleKnowledgeDraftSaveSuccess(selectedKnowledgeId);
      return;
    }

    message.error(result.message ?? '保存知识草稿失败，请稍后重试');
  };

  const railProps = {
    messages: displayMessages,
    mode: messageRail.mode,
    expanded: messageRail.expanded,
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
    onGenerateKnowledgeDraft: handleOpenKnowledgeDraft,
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
      新建对话
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
                      项目对话
                    </Typography.Text>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-caption font-medium text-slate-500">
                      {conversations.items.length} 个线程
                    </span>
                  </div>
                  <Typography.Title level={4} className="mb-1! mt-0! text-slate-800!">
                    最近上下文
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0! max-w-[24rem] text-label! leading-6! text-slate-600!">
                    左侧只保留标题与最近活跃时间，方便你更快切回要继续的线程。
                  </Typography.Paragraph>
                </div>

                <div className="xl:hidden">{renderCreateChatButton({ compact: true })}</div>
              </div>

              <div className="flex flex-wrap gap-2 text-caption text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                  正式项目线程
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                  右键更多操作
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
              title="项目对话加载失败"
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
                      onClick={() => setMobileRailOpen(true)}
                      className="rounded-full! border-slate-200! bg-white! text-slate-700!"
                    >
                      消息导航
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
                              前往设置
                            </Button>
                            <Button onClick={() => void loadChatSettings()}>
                              重新检查配置
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
                      title="当前无法确认对话配置"
                      description={`${chatSettingsError}。如后续发送失败，请前往设置页检查配置。`}
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
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该对话暂无消息" />
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
                            aria-label="项目消息输入框"
                            placeholder="输入项目问题"
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
                            aria-label="停止生成"
                            icon={<StopOutlined />}
                            onClick={handleCancelStreaming}
                            className="mb-1 h-11! rounded-full! border-slate-200! px-4! text-sm! font-semibold! text-slate-700!"
                          >
                            停止生成
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            htmlType="submit"
                            shape="circle"
                            aria-label="发送消息"
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
              title="消息导航"
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

            <ProjectKnowledgeDraftDrawer
              open={knowledgeDraftOpen}
              value={knowledgeDraftValue}
              saving={savingKnowledgeDraft}
              projectKnowledgeOptions={knowledgeDraftProjectKnowledgeOptions}
              projectKnowledgeLoading={projectKnowledge.loading}
              projectKnowledgeError={projectKnowledge.error}
              selectedKnowledgeId={knowledgeDraftSelectedKnowledgeId}
              onChange={handleKnowledgeDraftValueChange}
              onKnowledgeChange={setKnowledgeDraftSelectedKnowledgeId}
              onCreateKnowledge={() => setKnowledgeAccessModalOpen(true)}
              onClose={handleCloseKnowledgeDraft}
              onSubmit={() => void handleSubmitKnowledgeDraft()}
            />

            <ProjectKnowledgeAccessModal
              open={knowledgeAccessModalOpen}
              initialMode="project"
              allowedModes={['project']}
              knowledgeCatalog={[]}
              knowledgeCatalogLoading={false}
              boundKnowledgeIds={[]}
              binding={false}
              creating={creatingDraftKnowledge}
              createProjectTitle="新建当前项目的私有知识库"
              createProjectDescription="先创建一个空的项目私有知识库，再回到知识草稿抽屉继续保存当前 Markdown 文档。"
              createProjectHelperText="创建成功后会回到知识草稿抽屉，继续保存当前 Markdown 文档。"
              createProjectSubmitText="创建空知识库"
              onCancel={() => setKnowledgeAccessModalOpen(false)}
              onBindGlobalKnowledge={() => undefined}
              onCreateProjectKnowledge={(values) => {
                void handleCreateProjectKnowledgeForDraft(values);
              }}
              onOpenGlobalManagement={() => undefined}
            />
          </>
        ) : (
          <div className="grid min-h-full place-items-center px-8 py-10">
            {chatId ? (
              <Alert
                type={detailError ? 'error' : 'warning'}
                showIcon
                title={detailError ? '项目对话加载失败' : '对话不存在'}
                description={
                  detailError ??
                  '当前 chatId 无法匹配到会话，请从左侧重新选择。'
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
                            前往设置
                          </Button>
                          <Button onClick={() => void loadChatSettings()}>
                            重新检查配置
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
                    title="当前无法确认对话配置"
                    description={`${chatSettingsError}。你仍可先创建线程；若发送失败，请前往设置页检查。`}
                  />
                ) : null}
                <Empty
                  description={
                    <Typography.Text type="secondary">
                      请选择左侧线程，或先新建一个对话开始发送消息。
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
