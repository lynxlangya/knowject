import { PlusOutlined } from '@ant-design/icons';
import { App, Alert, Button, Empty, Input, Skeleton, Typography } from 'antd';
import { extractApiErrorMessage } from '@api/error';
import {
  createProjectConversation,
  createProjectConversationMessage,
  getProjectConversationDetail,
  type ProjectConversationDetailResponse,
  type ProjectConversationSourceResponse,
} from '@api/projects';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildProjectChatPath, buildProjectResourcesPath } from '@app/navigation/paths';
import { ProjectConversationList } from './components/ProjectConversationList';
import { useProjectPageContext } from './projectPageContext';

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

const ProjectConversationSources = ({
  sources,
}: {
  sources: ProjectConversationSourceResponse[];
}) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3">
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
            key={`${source.knowledgeId}:${source.documentId}:${source.chunkId}`}
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

export const ProjectChatPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const messageEndRef = useRef<HTMLDivElement | null>(null);
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
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const activeConversation = chatId
    ? conversations.find((conversation) => conversation.id === chatId) ?? null
    : null;
  const currentConversationDetail =
    conversationDetail?.projectId === activeProject.id &&
    conversationDetail.id === chatId
      ? conversationDetail
      : null;
  const createActionLocked = creatingConversation || sendingMessage;
  const sendActionLocked = sendingMessage || detailLoading;
  const canSendMessage = composerValue.trim().length > 0 && !sendActionLocked;
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

  useEffect(() => {
    setComposerValue('');
  }, [activeProject.id, chatId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [
    currentConversationDetail?.projectId,
    currentConversationDetail?.id,
    currentConversationDetail?.messages.length,
  ]);

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

      navigate(buildProjectChatPath(requestProjectId, result.conversation.id));
      void refreshConversations();
    } catch (currentError) {
      console.error(currentError);

      if (isCurrentProject(requestProjectId)) {
        message.error(
          extractApiErrorMessage(currentError, '新建对话失败，请稍后重试'),
        );
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
        message.error(
          extractApiErrorMessage(currentError, '发送消息失败，请稍后重试'),
        );
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
      disabled={sendingMessage}
      onClick={() => void handleCreateChat()}
      className={[
        compact
          ? 'h-11! w-full rounded-full! border-slate-200! bg-white! px-5! text-sm! font-semibold! text-slate-700! shadow-none! md:w-auto'
          : 'h-12! rounded-full! border-dashed! border-slate-300! text-lg! font-semibold! text-slate-700!',
      ].join(' ')}
    >
      新建对话
    </Button>
  );

  return (
    <section className="grid h-full min-h-0 flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)] xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/55 xl:border-b-0 xl:border-r">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                项目对话
              </Typography.Text>
              <Typography.Title level={4} className="mb-1! mt-2 text-slate-800!">
                最近上下文
              </Typography.Title>
              <Typography.Paragraph className="mb-0! text-sm! text-slate-600!">
                对话已经接到正式项目线程；当前先保持最小同步链路，不提前卷入更重的运行时。
              </Typography.Paragraph>
            </div>

            <div className="xl:hidden">{renderCreateChatButton({ compact: true })}</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {conversationsLoading ? (
            <div className="space-y-3 px-2 py-2">
              <Skeleton active paragraph={{ rows: 3 }} />
              <Skeleton active paragraph={{ rows: 3 }} />
            </div>
          ) : conversationsError ? (
            <Alert
              type="warning"
              showIcon
              message="项目对话加载失败"
              description={conversationsError}
            />
          ) : (
            <ProjectConversationList
              conversations={conversations}
              activeConversationId={activeConversation?.id}
              onSelect={(conversationId) =>
                navigate(buildProjectChatPath(activeProject.id, conversationId))
              }
            />
          )}
        </div>

        <footer className="hidden border-t border-slate-200 p-3 xl:block">
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
            <header className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  当前线程
                </Typography.Text>
                <Typography.Title level={4} className="mb-1! mt-2 text-slate-800!">
                  {currentConversationDetail.title}
                </Typography.Title>
                <Typography.Text className="text-xs text-slate-400">
                  {activeProject.name} · 正式项目对话
                </Typography.Text>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => message.info('后续将支持把当前讨论沉淀为知识条目。')}>
                  沉淀为知识
                </Button>
                <Button onClick={() => navigate(buildProjectResourcesPath(activeProject.id))}>
                  查看相关资源
                </Button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
              {currentConversationDetail.messages.length > 0 ? (
                <div className="space-y-3">
                  {currentConversationDetail.messages.map((chatMessage) => (
                    <article
                      key={chatMessage.id}
                      className={[
                        'max-w-[85%] rounded-2xl px-4 py-3',
                        chatMessage.role === 'user'
                          ? 'ml-auto bg-blue-500 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.035)]',
                      ].join(' ')}
                    >
                      <Typography.Paragraph
                        className={
                          chatMessage.role === 'user'
                            ? 'mb-1! text-sm text-white!'
                            : 'mb-1! text-sm text-slate-700!'
                        }
                      >
                        {chatMessage.content}
                      </Typography.Paragraph>
                      <Typography.Text
                        className={
                          chatMessage.role === 'user'
                            ? 'text-[11px] text-blue-100'
                            : 'text-[11px] text-slate-400'
                        }
                      >
                        {formatMessageTime(chatMessage.createdAt)}
                      </Typography.Text>
                      {chatMessage.role === 'assistant' && chatMessage.sources?.length ? (
                        <ProjectConversationSources sources={chatMessage.sources} />
                      ) : null}
                    </article>
                  ))}

                  <div ref={messageEndRef} />
                </div>
              ) : (
                <div className="grid h-full place-items-center">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该对话暂无消息" />
                </div>
              )}
            </div>

            <footer className="border-t border-slate-200 bg-white px-6 py-4">
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSendMessage();
                }}
              >
                <Input.TextArea
                  value={composerValue}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  disabled={sendActionLocked}
                  placeholder="输入项目问题，Enter 发送，Shift + Enter 换行。"
                  onChange={(event) => setComposerValue(event.target.value)}
                  onPressEnter={(event) => {
                    if (event.shiftKey || event.nativeEvent.isComposing) {
                      return;
                    }

                    event.preventDefault();
                    void handleSendMessage();
                  }}
                />
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <Typography.Text className="text-xs text-slate-400">
                    发送失败时会自动回读服务端线程，避免遗漏已持久化的 user message。
                  </Typography.Text>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={sendingMessage}
                    disabled={!canSendMessage}
                    className="h-11! rounded-full! px-6! font-semibold!"
                  >
                    发送消息
                  </Button>
                </div>
              </form>
            </footer>
          </>
        ) : (
          <div className="grid min-h-full place-items-center px-8 py-10">
            {chatId ? (
              <Alert
                type={detailError ? 'error' : 'warning'}
                showIcon
                message={detailError ? '项目对话加载失败' : '对话不存在'}
                description={
                  detailError ??
                  '当前 chatId 无法匹配到会话，请从左侧重新选择。'
                }
              />
            ) : (
              <div className="flex max-w-md flex-col items-center gap-5 text-center">
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
