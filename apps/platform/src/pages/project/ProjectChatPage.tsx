import {
  ArrowUpOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import {
  App,
  Alert,
  Button,
  Empty,
  Input,
  Skeleton,
  Typography,
} from 'antd';
import { extractApiErrorCode, extractApiErrorMessage } from '@api/error';
import {
  createProjectConversation,
  deleteProjectConversation,
  createProjectConversationMessage,
  getProjectConversationDetail,
  updateProjectConversation,
  type ProjectConversationDetailResponse,
} from '@api/projects';
import {
  getSettings,
  SETTINGS_LLM_PROVIDERS,
  type SettingsAiConfigResponse,
  type SettingsLlmProvider,
} from '@api/settings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PATHS,
  buildProjectChatPath,
} from '@app/navigation/paths';
import type { ConversationSummary } from '@app/project/project.types';
import { KNOWJECT_BRAND } from '@styles/brand';
import {
  ProjectConversationList,
  type ProjectConversationContextAction,
} from './components/ProjectConversationList';
import {
  buildProjectChatBubbleItems,
  PROJECT_CHAT_BUBBLE_LIST_CLASS_NAMES,
  PROJECT_CHAT_BUBBLE_LIST_STYLES,
  PROJECT_CHAT_BUBBLE_ROLES,
} from './projectChat.adapters';
import { useProjectPageContext } from './projectPageContext';

type ProjectChatIssueCode =
  | 'PROJECT_CONVERSATION_LLM_UNAVAILABLE'
  | 'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED'
  | 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR';

interface ProjectChatIssue {
  code: ProjectChatIssueCode;
  title: string;
  description: string;
}

const PROJECT_CHAT_SUPPORTED_LLM_PROVIDERS = new Set<SettingsLlmProvider>(
  SETTINGS_LLM_PROVIDERS,
);

export const ProjectChatPage = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const {
    activeProject,
    conversations,
    conversationsLoading,
    conversationsError,
    refreshConversations,
  } = useProjectPageContext();
  const latestConversationTargetRef = useRef({
    projectId: activeProject.id,
    chatId,
  });
  latestConversationTargetRef.current = {
    projectId: activeProject.id,
    chatId,
  };
  const [conversationDetail, setConversationDetail] =
    useState<ProjectConversationDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState('');
  const [renameTargetConversation, setRenameTargetConversation] =
    useState<ConversationSummary | null>(null);
  const [renameConversationTitleDraft, setRenameConversationTitleDraft] =
    useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [renamingConversation, setRenamingConversation] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatLlmSettings, setChatLlmSettings] = useState<
    SettingsAiConfigResponse<SettingsLlmProvider> | null
  >(null);
  const [chatSettingsLoading, setChatSettingsLoading] = useState(true);
  const [chatSettingsError, setChatSettingsError] = useState<string | null>(null);
  const [chatRuntimeIssue, setChatRuntimeIssue] = useState<ProjectChatIssue | null>(
    null,
  );
  const activeConversation = chatId
    ? conversations.find((conversation) => conversation.id === chatId) ?? null
    : null;
  const currentConversationDetail =
    conversationDetail?.projectId === activeProject.id &&
    conversationDetail.id === chatId
      ? conversationDetail
      : null;
  const conversationBubbleItems = buildProjectChatBubbleItems(
    currentConversationDetail?.messages ?? [],
  );
  const blockingChatIssue = (() => {
    if (chatLlmSettings) {
      if (!chatLlmSettings.hasKey) {
        return {
          code: 'PROJECT_CONVERSATION_LLM_UNAVAILABLE' as const,
          title: '当前未配置可用的对话模型',
          description:
            '请先前往设置页保存并测试 LLM API Key，项目对话才会生成 assistant 回复。',
        };
      }

      if (!PROJECT_CHAT_SUPPORTED_LLM_PROVIDERS.has(chatLlmSettings.provider)) {
        return {
          code: 'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED' as const,
          title: '当前 LLM Provider 暂不支持项目对话',
          description:
            '请在设置页切换到兼容 `/chat/completions` 的 Provider 后，再回到项目对话继续测试。',
        };
      }
    }

    if (
      chatRuntimeIssue &&
      chatRuntimeIssue.code !== 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR'
    ) {
      return chatRuntimeIssue;
    }

    return null;
  })();
  const inlineChatIssue =
    chatRuntimeIssue?.code === 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR'
      ? chatRuntimeIssue
      : null;
  const createActionLocked = creatingConversation || sendingMessage;
  const conversationActionsLocked =
    detailLoading || renamingConversation || deletingConversation;
  const sendActionLocked =
    sendingMessage ||
    detailLoading ||
    chatSettingsLoading ||
    blockingChatIssue !== null;
  const canSubmitMessage = composerValue.trim().length > 0 && !sendActionLocked;
  const isCurrentProject = (projectId: string): boolean => {
    return latestConversationTargetRef.current.projectId === projectId;
  };
  const isCurrentConversationTarget = (
    projectId: string,
    conversationId: string,
  ): boolean => {
    const latestTarget = latestConversationTargetRef.current;

    return (
      latestTarget.projectId === projectId &&
      latestTarget.chatId === conversationId
    );
  };
  const shouldShowConversationSkeleton =
    Boolean(chatId) &&
    (detailLoading ||
      (conversationDetail !== null && currentConversationDetail === null));
  const buildChatIssueFromError = (
    error: unknown,
    fallback: string,
  ): ProjectChatIssue | null => {
    const code = extractApiErrorCode(error);
    const description = extractApiErrorMessage(error, fallback);

    if (code === 'PROJECT_CONVERSATION_LLM_UNAVAILABLE') {
      return {
        code,
        title: '当前未配置可用的对话模型',
        description,
      };
    }

    if (code === 'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED') {
      return {
        code,
        title: '当前 LLM Provider 暂不支持项目对话',
        description,
      };
    }

    if (code === 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR') {
      return {
        code,
        title: '项目对话模型调用失败',
        description,
      };
    }

    return null;
  };
  const loadChatSettings = useCallback(async () => {
    setChatSettingsLoading(true);
    setChatSettingsError(null);

    try {
      const result = await getSettings();
      setChatLlmSettings(result.llm);
      setChatRuntimeIssue(null);
    } catch (currentError) {
      console.error('[ProjectChatPage] 加载对话配置失败:', currentError);
      setChatLlmSettings(null);
      setChatSettingsError(
        extractApiErrorMessage(currentError, '读取对话配置失败，请稍后重试'),
      );
    } finally {
      setChatSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    setComposerValue('');
  }, [activeProject.id, chatId]);

  useEffect(() => {
    setRenameTargetConversation(null);
    setRenameConversationTitleDraft('');
  }, [activeProject.id]);

  useEffect(() => {
    void loadChatSettings();
  }, [loadChatSettings, activeProject.id]);

  useEffect(() => {
    if (!chatId) {
      setConversationDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let isMounted = true;

    const loadConversationDetail = async () => {
      setDetailLoading(true);

      try {
        const result = await getProjectConversationDetail(activeProject.id, chatId);

        if (!isMounted) {
          return;
        }

        setConversationDetail(result.conversation);
        setDetailError(null);
      } catch (currentError) {
        if (!isMounted) {
          return;
        }

        console.error(currentError);
        setConversationDetail(null);
        setDetailError(
          extractApiErrorMessage(currentError, '加载项目对话失败，请稍后重试'),
        );
      } finally {
        if (isMounted) {
          setDetailLoading(false);
        }
      }
    };

    void loadConversationDetail();

    return () => {
      isMounted = false;
    };
  }, [activeProject.id, chatId]);

  const syncConversationAfterFailure = async ({
    projectId,
    conversationId,
    previousMessageIds,
    submittedContent,
  }: {
    projectId: string;
    conversationId: string;
    previousMessageIds: Set<string>;
    submittedContent: string;
  }) => {
    try {
      const result = await getProjectConversationDetail(projectId, conversationId);
      const recoveredPersistedUserMessage = result.conversation.messages.some(
        (chatMessage) =>
          chatMessage.role === 'user' &&
          chatMessage.content === submittedContent &&
          !previousMessageIds.has(chatMessage.id),
      );

      if (isCurrentConversationTarget(projectId, conversationId)) {
        setConversationDetail(result.conversation);
        setDetailError(null);

        if (recoveredPersistedUserMessage) {
          setComposerValue('');
        }
      }
    } catch (currentError) {
      console.error(currentError);

      if (isCurrentConversationTarget(projectId, conversationId)) {
        setDetailError(
          extractApiErrorMessage(currentError, '刷新项目对话失败，请稍后重试'),
        );
      }
    }
  };

  const handleCreateChat = async () => {
    if (createActionLocked) {
      return;
    }

    const requestProjectId = activeProject.id;
    setCreatingConversation(true);

    try {
      const result = await createProjectConversation(requestProjectId);

      if (!isCurrentProject(requestProjectId)) {
        return;
      }

      setChatRuntimeIssue(null);
      navigate(buildProjectChatPath(requestProjectId, result.conversation.id));
      void refreshConversations();
    } catch (currentError) {
      console.error(currentError);

      if (isCurrentProject(requestProjectId)) {
        const nextIssue = buildChatIssueFromError(
          currentError,
          '新建对话失败，请稍后重试',
        );

        if (nextIssue) {
          setChatRuntimeIssue(nextIssue);
        } else {
          message.error(
            extractApiErrorMessage(currentError, '新建对话失败，请稍后重试'),
          );
        }
      }
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatId) {
      message.warning('请先选择或新建一个对话线程');
      return;
    }

    const nextContent = composerValue.trim();

    if (!nextContent) {
      message.warning('请输入消息内容');
      return;
    }

    if (sendActionLocked) {
      return;
    }

    const requestProjectId = activeProject.id;
    const requestConversationId = chatId;
    const previousMessageIds = new Set(
      currentConversationDetail?.messages.map((chatMessage) => chatMessage.id) ?? [],
    );
    setSendingMessage(true);

    try {
      const result = await createProjectConversationMessage(
        requestProjectId,
        requestConversationId,
        {
          content: nextContent,
        },
      );

      if (isCurrentConversationTarget(requestProjectId, requestConversationId)) {
        setChatRuntimeIssue(null);
        setConversationDetail(result.conversation);
        setDetailError(null);
        setComposerValue('');
      }

      if (isCurrentProject(requestProjectId)) {
        void refreshConversations();
      }
    } catch (currentError) {
      console.error(currentError);

      if (isCurrentProject(requestProjectId)) {
        const nextIssue = buildChatIssueFromError(
          currentError,
          '发送消息失败，请稍后重试',
        );

        if (nextIssue) {
          setChatRuntimeIssue(nextIssue);
        } else {
          message.error(
            extractApiErrorMessage(currentError, '发送消息失败，请稍后重试'),
          );
        }
      }

      await Promise.allSettled([
        isCurrentProject(requestProjectId) ? refreshConversations() : Promise.resolve(),
        isCurrentConversationTarget(requestProjectId, requestConversationId)
          ? syncConversationAfterFailure({
              projectId: requestProjectId,
              conversationId: requestConversationId,
              previousMessageIds,
              submittedContent: nextContent,
            })
          : Promise.resolve(),
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStartRenamingConversation = (
    conversation: ConversationSummary,
  ) => {
    if (conversationActionsLocked) {
      return;
    }

    setRenameTargetConversation(conversation);
    setRenameConversationTitleDraft(conversation.title);
  };

  const handleCancelRenamingConversation = () => {
    if (renamingConversation) {
      return;
    }

    setRenameTargetConversation(null);
    setRenameConversationTitleDraft('');
  };

  const handleUpdateConversationTitle = async () => {
    if (!renameTargetConversation || renamingConversation) {
      return;
    }

    const nextTitle = renameConversationTitleDraft.trim();

    if (!nextTitle) {
      message.warning('请输入对话标题');
      return;
    }

    if (nextTitle === renameTargetConversation.title.trim()) {
      handleCancelRenamingConversation();
      return;
    }

    const requestProjectId = activeProject.id;
    const requestConversationId = renameTargetConversation.id;
    setRenamingConversation(true);

    try {
      const result = await updateProjectConversation(
        requestProjectId,
        requestConversationId,
        {
          title: nextTitle,
        },
      );

      if (chatId === requestConversationId) {
        setConversationDetail(result.conversation);
        setDetailError(null);
      }

      if (isCurrentProject(requestProjectId)) {
        void refreshConversations();
      }

      setRenameTargetConversation(null);
      setRenameConversationTitleDraft('');
      message.success('对话标题已更新');
    } catch (currentError) {
      console.error(currentError);
      message.error(
        extractApiErrorMessage(currentError, '更新对话标题失败，请稍后重试'),
      );
    } finally {
      setRenamingConversation(false);
    }
  };

  const handleDeleteConversation = (conversation: ConversationSummary) => {
    if (deletingConversation) {
      return;
    }

    if (conversations.length <= 1) {
      message.warning('至少保留一个对话线程');
      return;
    }

    const requestProjectId = activeProject.id;
    const requestConversationId = conversation.id;
    const currentTitle = conversation.title;
    const currentIndex = conversations.findIndex(
      (conversation) => conversation.id === requestConversationId,
    );
    const remainingConversations = conversations.filter(
      (conversation) => conversation.id !== requestConversationId,
    );
    const nextConversation =
      remainingConversations[currentIndex] ??
      remainingConversations[currentIndex - 1] ??
      remainingConversations[0] ??
      null;

    modal.confirm({
      title: '删除当前线程',
      content: `确定删除「${currentTitle}」吗？此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        return (async () => {
          setDeletingConversation(true);

          try {
            await deleteProjectConversation(requestProjectId, requestConversationId);

            if (isCurrentProject(requestProjectId)) {
              void refreshConversations();
            }

            if (isCurrentConversationTarget(requestProjectId, requestConversationId)) {
              setConversationDetail(null);
              setDetailError(null);
              navigate(
                nextConversation
                  ? buildProjectChatPath(requestProjectId, nextConversation.id)
                  : buildProjectChatPath(requestProjectId),
              );
            }

            if (renameTargetConversation?.id === requestConversationId) {
              setRenameTargetConversation(null);
              setRenameConversationTitleDraft('');
            }

            message.success(`已删除「${currentTitle}」`);
          } catch (currentError) {
            console.error(currentError);

            if (
              extractApiErrorCode(currentError) ===
              'PROJECT_CONVERSATION_LAST_THREAD_FORBIDDEN'
            ) {
              message.warning(
                extractApiErrorMessage(
                  currentError,
                  '至少保留一个对话线程',
                ),
              );
            } else {
              message.error(
                extractApiErrorMessage(
                  currentError,
                  '删除对话失败，请稍后重试',
                ),
              );
            }

            throw currentError;
          } finally {
            setDeletingConversation(false);
          }
        })();
      },
    });
  };

  const handleConversationContextAction = (
    action: ProjectConversationContextAction,
    conversation: ConversationSummary,
  ) => {
    switch (action) {
      case 'share':
        message.info('后续将支持分享线程。');
        return;
      case 'knowledge':
        message.info('后续将支持把当前讨论沉淀为知识条目。');
        return;
      case 'resources':
        message.info('后续将支持从线程上下文直接查看相关资源。');
        return;
      case 'rename':
        handleStartRenamingConversation(conversation);
        return;
      case 'delete':
        handleDeleteConversation(conversation);
        return;
      default:
        return;
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    if (renameTargetConversation !== null) {
      setRenameTargetConversation(null);
      setRenameConversationTitleDraft('');
    }

    navigate(buildProjectChatPath(activeProject.id, conversationId));
  };

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
          : 'h-13! rounded-[22px]! border-dashed! border-slate-300! bg-white! px-6! text-base! font-semibold! text-slate-700! shadow-[0_8px_22px_rgba(15,23,42,0.04)]! transition-all! hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50!',
      ].join(' ')}
    >
      新建对话
    </Button>
  );

  return (
    <section className="grid h-full min-h-0 flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)] xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/70 xl:border-b-0 xl:border-r">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.035)]">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      项目对话
                    </Typography.Text>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      {conversations.length} 个线程
                    </span>
                  </div>
                  <Typography.Title level={4} className="mb-1! mt-0! text-slate-800!">
                    最近上下文
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0! max-w-[24rem] text-[13px]! leading-6! text-slate-600!">
                    左侧只保留标题与最近活跃时间，方便你更快切回要继续的线程。
                  </Typography.Paragraph>
                </div>

                <div className="xl:hidden">{renderCreateChatButton({ compact: true })}</div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
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
          {conversationsLoading ? (
            <div className="space-y-3 px-1 py-1">
              <Skeleton active paragraph={{ rows: 3 }} />
              <Skeleton active paragraph={{ rows: 3 }} />
            </div>
          ) : conversationsError ? (
            <Alert
              type="warning"
              showIcon
              title="项目对话加载失败"
              description={conversationsError}
            />
          ) : (
            <ProjectConversationList
              conversations={conversations}
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
            <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_bottom,rgba(40,184,160,0.08),transparent_34%),linear-gradient(180deg,rgba(246,251,250,0.82)_0%,rgba(255,255,255,0.98)_26%,rgba(255,255,255,1)_100%)] px-6 py-5">
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
                  <div className="mx-auto h-full w-full max-w-[1280px]">
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
              <div className="mx-auto w-full max-w-[1280px]">
                <form
                  className="rounded-[28px] border bg-white p-2.5 transition-colors duration-200"
                  style={{
                    borderColor: KNOWJECT_BRAND.primaryBorder,
                  }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSendMessage();
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
                        className="w-full! rounded-[22px]! bg-transparent! px-4! py-3! text-[15px]! leading-7! text-slate-700! placeholder:text-slate-400!"
                        onChange={(event) => setComposerValue(event.target.value)}
                        onPressEnter={(event) => {
                          if (event.shiftKey || event.nativeEvent.isComposing) {
                            return;
                          }

                          event.preventDefault();
                          void handleSendMessage();
                        }}
                      />
                    </div>

                    <Button
                      type="primary"
                      htmlType="submit"
                      shape="circle"
                      aria-label="发送消息"
                      loading={sendingMessage}
                      disabled={!canSubmitMessage}
                      icon={<ArrowUpOutlined />}
                      className="mb-1 h-11! w-11! shrink-0 border-0!"
                      style={{
                        background: canSubmitMessage
                          ? KNOWJECT_BRAND.primary
                          : KNOWJECT_BRAND.primarySurfaceStrong,
                        color: canSubmitMessage ? '#ffffff' : KNOWJECT_BRAND.textMuted,
                      }}
                    />
                  </div>
                </form>
              </div>
            </footer>
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
