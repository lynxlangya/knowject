import {
  ArrowUpOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import {
  Alert,
  Button,
  Empty,
  Input,
  Skeleton,
  Typography,
} from 'antd';
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PATHS } from '@app/navigation/paths';
import { KNOWJECT_BRAND } from '@styles/brand';
import { ProjectConversationList } from './components/ProjectConversationList';
import {
  buildProjectChatBubbleItems,
  PROJECT_CHAT_BUBBLE_LIST_CLASS_NAMES,
  PROJECT_CHAT_BUBBLE_LIST_STYLES,
  PROJECT_CHAT_BUBBLE_ROLES,
} from './projectChat.adapters';
import { useProjectChatActions } from './useProjectChatActions';
import { useProjectChatSettings } from './useProjectChatSettings';
import {
  type ProjectConversationTargetRefValue,
  useProjectConversationDetail,
} from './useProjectConversationDetail';
import { useProjectPageContext } from './projectPageContext';

export const ProjectChatPage = () => {
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const { activeProject, conversations } = useProjectPageContext();
  const latestConversationTargetRef = useRef<ProjectConversationTargetRefValue>({
    projectId: activeProject.id,
    chatId,
  });

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
    syncConversationAfterFailure,
  } = useProjectConversationDetail({
    activeProjectId: activeProject.id,
    chatId,
    latestConversationTargetRef,
  });
  const {
    composerValue,
    setComposerValue,
    renameTargetConversation,
    renameConversationTitleDraft,
    setRenameConversationTitleDraft,
    creatingConversation,
    renamingConversation,
    createActionLocked,
    conversationActionsLocked,
    sendActionLocked,
    canSubmitMessage,
    sendingMessage,
    handleCreateChat,
    handleSendMessage,
    handleConversationContextAction,
    handleUpdateConversationTitle,
    handleCancelRenamingConversation,
    handleSelectConversation,
  } = useProjectChatActions({
    activeProjectId: activeProject.id,
    chatId,
    latestConversationTargetRef,
    conversations,
    currentConversationDetail,
    detailLoading,
    chatSettingsLoading,
    blockingChatIssue,
    setConversationDetail,
    setDetailError,
    setChatRuntimeIssue,
    buildChatIssueFromError,
    syncConversationAfterFailure,
  });

  const activeConversation = chatId
    ? conversations.items.find((conversation) => conversation.id === chatId) ?? null
    : null;
  const conversationBubbleItems = buildProjectChatBubbleItems(
    currentConversationDetail?.messages ?? [],
  );

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
                        className="w-full! rounded-card-lg! bg-transparent! px-4! py-3! text-body! leading-7! text-slate-700! placeholder:text-slate-400!"
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
