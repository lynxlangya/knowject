import { Alert, Empty, Input, Typography } from 'antd';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectContext } from '../../app/project/ProjectContext';
import {
  buildProjectChatPath,
  buildProjectPath,
  PATHS,
} from '../../app/navigation/paths';
import { getConversationsByProject, getMessagesByConversation } from './home.mock';

export const HomePage = () => {
  const navigate = useNavigate();
  const { projectId, chatId } = useParams<{ projectId?: string; chatId?: string }>();
  const { getProjectById } = useProjectContext();

  const activeProject = useMemo(() => {
    if (!projectId) {
      return null;
    }

    return getProjectById(projectId);
  }, [projectId, getProjectById]);

  const conversations = useMemo(() => {
    if (!activeProject) {
      return [];
    }

    return getConversationsByProject(activeProject.id);
  }, [activeProject]);

  const activeConversation = useMemo(() => {
    if (!chatId) {
      return null;
    }

    return conversations.find((item) => item.id === chatId) ?? null;
  }, [chatId, conversations]);

  const messages = useMemo(() => {
    if (!activeConversation) {
      return [];
    }

    return getMessagesByConversation(activeConversation.id);
  }, [activeConversation]);

  if (!projectId) {
    return (
      <section className="h-[calc(100vh-120px)] rounded-xl border border-slate-200 bg-white px-6 py-5">
        <Typography.Title level={3} className="mb-1! text-slate-800!">
          主页
        </Typography.Title>
        <Typography.Paragraph className="mb-0! text-slate-500!">
          在左侧「我的项目」中选择一个项目后，将进入该项目的对话工作区。
        </Typography.Paragraph>

        <div className="mt-6 grid h-[calc(100%-92px)] place-items-center border-t border-slate-100">
          <Empty
            description={
              <Typography.Text type="secondary">
                当前未打开项目，请从左侧项目列表进入。
              </Typography.Text>
            }
          />
        </div>
      </section>
    );
  }

  if (!activeProject) {
    return (
      <section className="h-[calc(100vh-120px)] rounded-xl border border-slate-200 bg-white px-6 py-5">
        <Alert
          type="warning"
          showIcon
          message="项目不存在或已被删除"
          description="请从左侧重新选择项目，或返回主页。"
          action={
            <button
              type="button"
              className="cursor-pointer rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-700"
              onClick={() => navigate(PATHS.home)}
            >
              返回主页
            </button>
          }
        />
      </section>
    );
  }

  return (
    <section className="grid h-[calc(100vh-120px)] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-4 py-3">
          <Typography.Title level={5} className="mb-0! text-slate-800!">
            {activeProject.name}
          </Typography.Title>
          <Typography.Text className="text-xs text-slate-500">对话列表</Typography.Text>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="grid h-full place-items-center p-4">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<Typography.Text type="secondary">该项目暂无对话</Typography.Text>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {conversations.map((conversation) => {
                const active = conversation.id === activeConversation?.id;

                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      className={[
                        'w-full px-4 py-3 text-left transition-colors',
                        active ? 'bg-blue-50' : 'hover:bg-slate-50',
                      ].join(' ')}
                      onClick={() =>
                        navigate(buildProjectChatPath(activeProject.id, conversation.id))
                      }
                    >
                      <Typography.Text className="block truncate text-sm font-medium text-slate-800">
                        {conversation.title}
                      </Typography.Text>
                      <Typography.Text className="mt-0.5 block truncate text-xs text-slate-500">
                        {conversation.preview}
                      </Typography.Text>
                      <Typography.Text className="mt-1 block text-[11px] text-slate-400">
                        {conversation.updatedAt}
                      </Typography.Text>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <main className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-5 py-3.5">
          <Typography.Title level={5} className="mb-1! text-slate-800!">
            {activeConversation?.title ?? '请选择一个对话'}
          </Typography.Title>
          <Typography.Text className="text-xs text-slate-500">
            {activeConversation
              ? activeConversation.updatedAt
              : `当前项目：${activeProject.name}`}
          </Typography.Text>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 px-5 py-4">
          {chatId && !activeConversation ? (
            <div className="grid h-full place-items-center">
              <Empty
                description={
                  <Typography.Text type="secondary">
                    对话不存在，请从左侧重新选择。
                  </Typography.Text>
                }
              />
            </div>
          ) : activeConversation ? (
            messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={[
                      'max-w-[86%] rounded-xl px-4 py-2.5',
                      message.role === 'user'
                        ? 'ml-auto bg-blue-500 text-white'
                        : 'bg-white text-slate-700 border border-slate-200',
                    ].join(' ')}
                  >
                    <Typography.Paragraph
                      className={message.role === 'user' ? 'mb-1! text-white!' : 'mb-1! text-slate-700!'}
                    >
                      {message.content}
                    </Typography.Paragraph>
                    <Typography.Text
                      className={message.role === 'user' ? 'text-[11px] text-blue-100' : 'text-[11px] text-slate-400'}
                    >
                      {message.createdAt}
                    </Typography.Text>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid h-full place-items-center">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<Typography.Text type="secondary">该对话暂无消息</Typography.Text>}
                />
              </div>
            )
          ) : (
            <div className="grid h-full place-items-center">
              <Empty
                description={
                  <Typography.Text type="secondary">
                    请选择左侧对话，URL 将更新为 chat 路由。
                  </Typography.Text>
                }
              />
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white px-5 py-3.5">
          <Input.TextArea
            disabled
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="输入框将在后续版本接入真实对话能力。"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <Typography.Text className="text-[11px] text-slate-400">
              当前为前端交互壳版本（Mock 数据）
            </Typography.Text>
            <button
              type="button"
              className="cursor-pointer text-[11px] text-slate-400 hover:text-slate-600"
              onClick={() => navigate(buildProjectPath(activeProject.id))}
            >
              返回项目概览
            </button>
          </div>
        </footer>
      </main>
    </section>
  );
};
