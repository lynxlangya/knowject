import { App, Alert, Button, Empty, Input, Skeleton, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { isApiError } from '@knowject/request';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getProjectConversationDetail,
  type ProjectConversationDetailResponse,
} from '@api/projects';
import { buildProjectChatPath, buildProjectResourcesPath } from '@app/navigation/paths';
import { ProjectConversationList } from './components/ProjectConversationList';
import { useProjectPageContext } from './projectPageContext';

const formatMessageTime = (value: string): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const ProjectChatPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const {
    activeProject,
    conversations,
    conversationsLoading,
    conversationsError,
  } = useProjectPageContext();
  const [conversationDetail, setConversationDetail] =
    useState<ProjectConversationDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const activeConversation = chatId
    ? conversations.find((conversation) => conversation.id === chatId) ?? null
    : null;

  useEffect(() => {
    if (!chatId) {
      setConversationDetail(null);
      setDetailError(null);
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
          isApiError(currentError)
            ? currentError.message
            : '加载项目对话失败，请稍后重试',
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

  const handleCreateChat = () => {
    message.info('新建对话将于后续版本接入真实对话能力。');
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
      onClick={handleCreateChat}
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
                对话仍是项目协作入口，但知识和资源不会再隐藏在聊天壳里。
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
        {chatId && detailLoading ? (
          <div className="p-6">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : conversationDetail ? (
          <>
            <header className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  当前线程
                </Typography.Text>
                <Typography.Title level={4} className="mb-1! mt-2 text-slate-800!">
                  {conversationDetail.title}
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
              {conversationDetail.messages.length > 0 ? (
                <div className="space-y-3">
                  {conversationDetail.messages.map((chatMessage) => (
                    <article
                      key={chatMessage.id}
                      className={[
                        'max-w-[85%] rounded-2xl px-4 py-3',
                        chatMessage.role === 'user'
                          ? 'ml-auto bg-blue-500 text-white'
                          : 'border border-slate-200 bg-white text-slate-700',
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
                    </article>
                  ))}
                </div>
              ) : (
                <div className="grid h-full place-items-center">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该对话暂无消息" />
                </div>
              )}
            </div>

            <footer className="border-t border-slate-200 bg-white px-6 py-4">
              <Input.TextArea
                disabled
                autoSize={{ minRows: 2, maxRows: 5 }}
                placeholder="输入框将在后续版本接入真实对话能力。"
              />
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
              <Empty
                description={
                  <Typography.Text type="secondary">请选择左侧对话开始查看详情</Typography.Text>
                }
              />
            )}
          </div>
        )}
      </main>
    </section>
  );
};
