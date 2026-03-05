import {
  App,
  Alert,
  Button,
  Empty,
  Input,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  PATHS,
  buildProjectAgentsPath,
  buildProjectChatPath,
  buildProjectKnowledgePath,
  buildProjectMembersPath,
  buildProjectSkillsPath,
} from '../../app/navigation/paths';
import { useProjectContext } from '../../app/project/ProjectContext';
import type {
  ProjectTabKey,
  ProjectWorkspaceSectionItem,
} from '../../app/project/project.types';
import {
  getConversationsByProject,
  getMessagesByConversation,
  getProjectMembers,
  getWorkspaceSectionItems,
} from './project.mock';

interface ProjectTabConfig {
  key: ProjectTabKey;
  label: string;
  buildPath: (projectId: string) => string;
}

const PROJECT_TABS: ProjectTabConfig[] = [
  {
    key: 'chat',
    label: '对话',
    buildPath: buildProjectChatPath,
  },
  {
    key: 'knowledge',
    label: '知识库',
    buildPath: buildProjectKnowledgePath,
  },
  {
    key: 'members',
    label: '成员',
    buildPath: buildProjectMembersPath,
  },
  {
    key: 'agents',
    label: '智能体',
    buildPath: buildProjectAgentsPath,
  },
  {
    key: 'skills',
    label: '技能',
    buildPath: buildProjectSkillsPath,
  },
];

const TAB_TITLES: Record<ProjectTabKey, string> = {
  chat: '对话',
  knowledge: '知识库',
  members: '成员',
  agents: '智能体',
  skills: '技能',
};

const resolveTabByPathname = (pathname: string): ProjectTabKey => {
  const pathMatch = pathname.match(/^\/project\/[^/]+\/([^/]+)/);
  const section = pathMatch?.[1];

  if (section === 'knowledge') {
    return 'knowledge';
  }

  if (section === 'members') {
    return 'members';
  }

  if (section === 'agents') {
    return 'agents';
  }

  if (section === 'skills') {
    return 'skills';
  }

  return 'chat';
};

const renderSectionItems = (items: ProjectWorkspaceSectionItem[]) => {
  if (items.length === 0) {
    return (
      <div className="grid h-full place-items-center">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前暂无内容" />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="px-2 py-3">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <Typography.Text className="truncate text-sm font-semibold text-slate-800">
              {item.title}
            </Typography.Text>
            {item.updatedAt ? (
              <Typography.Text className="shrink-0 text-[11px] text-slate-400">
                {item.updatedAt}
              </Typography.Text>
            ) : null}
          </div>
          <Typography.Text className="block text-xs text-slate-500">{item.description}</Typography.Text>
        </li>
      ))}
    </ul>
  );
};

export const ProjectWorkspacePage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, chatId } = useParams<{ projectId?: string; chatId?: string }>();
  const { getProjectById } = useProjectContext();

  const activeTab = useMemo(() => {
    return resolveTabByPathname(location.pathname);
  }, [location.pathname]);

  if (!projectId) {
    return (
      <section className="h-full border border-slate-200 bg-white p-6">
        <Alert
          type="warning"
          showIcon
          message="项目路由缺失"
          description="未识别到 projectId，请返回主页重新选择项目。"
          action={
            <Button size="small" onClick={() => navigate(PATHS.home)}>
              返回主页
            </Button>
          }
        />
      </section>
    );
  }

  const activeProject = getProjectById(projectId);

  if (!activeProject) {
    return (
      <section className="h-full border border-slate-200 bg-white p-6">
        <Alert
          type="warning"
          showIcon
          message="项目不存在或已被删除"
          description="请从左侧“我的项目”重新选择。"
          action={
            <Button size="small" onClick={() => navigate(PATHS.home)}>
              返回主页
            </Button>
          }
        />
      </section>
    );
  }

  const members = getProjectMembers(activeProject.id);
  const activeMembers = members.filter((member) => member.isActive);
  const visibleMembers = activeMembers.slice(0, 5);
  const hiddenMemberCount = Math.max(activeMembers.length - visibleMembers.length, 0);
  const projectInitial = (activeProject.name.trim().slice(0, 1) || 'P').toUpperCase();

  const conversations = getConversationsByProject(activeProject.id);
  const activeConversation =
    activeTab === 'chat' && chatId
      ? conversations.find((item) => item.id === chatId) ?? null
      : null;
  const messagesByConversation = activeConversation
    ? getMessagesByConversation(activeConversation.id)
    : [];
  const tabSectionItems = getWorkspaceSectionItems(activeProject.id, activeTab);

  const handleSelectTab = (tabKey: ProjectTabKey) => {
    const tab = PROJECT_TABS.find((item) => item.key === tabKey);
    if (!tab) {
      return;
    }

    navigate(tab.buildPath(activeProject.id));
  };

  const handleSelectConversation = (conversationId: string) => {
    navigate(buildProjectChatPath(activeProject.id, conversationId));
  };

  const handleCreateChat = () => {
    message.info('新建对话将于后续版本接入真实能力。');
  };

  return (
    <section className="grid h-full grid-cols-[380px_minmax(0,1fr)] overflow-hidden border border-slate-200 bg-white max-[1120px]:h-auto max-[1120px]:min-h-full max-[1120px]:grid-cols-1">
      <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50/35 max-[1120px]:border-r-0 max-[1120px]:border-b">
        <header className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-2xl font-semibold text-blue-600">
              {projectInitial}
            </div>
            <div className="min-w-0">
              <Typography.Title level={3} className="mb-0! truncate text-slate-900!">
                {activeProject.name}
              </Typography.Title>
              <Typography.Text className="text-base text-slate-500">
                {activeMembers.length}位活跃成员
              </Typography.Text>
            </div>
          </div>

          <div className="mt-4 flex items-center">
            {visibleMembers.map((member, index) => (
              <div
                key={member.id}
                className={[
                  'relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-white shadow-[0_1px_3px_rgba(15,23,42,0.15)]',
                  index === 0 ? '' : '-ml-2',
                ].join(' ')}
                title={member.name}
              >
                <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
              </div>
            ))}
            {hiddenMemberCount > 0 ? (
              <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-medium text-slate-600 ring-2 ring-white">
                +{hiddenMemberCount}
              </span>
            ) : null}
          </div>
        </header>

        <nav className="flex border-b border-slate-200 px-2">
          {PROJECT_TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                className={[
                  'relative flex-1 px-2 py-3 text-sm font-semibold transition-colors',
                  'flex items-center justify-center',
                  active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800',
                ].join(' ')}
                onClick={() => handleSelectTab(tab.key)}
              >
                <span>{tab.label}</span>
                {active ? <span className="absolute inset-x-1 bottom-0 h-0.5 bg-blue-500" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {activeTab === 'chat' ? (
            conversations.length === 0 ? (
              <div className="grid h-full place-items-center">
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该项目暂无对话" />
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
                          'w-full border-l-2 px-3 py-3 text-left transition-colors',
                          active
                            ? 'border-l-blue-500 bg-white'
                            : 'border-l-transparent hover:bg-white',
                        ].join(' ')}
                        onClick={() => handleSelectConversation(conversation.id)}
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <Typography.Text className="truncate text-base font-semibold text-slate-800">
                            {conversation.title}
                          </Typography.Text>
                          <Typography.Text className="shrink-0 text-xs text-slate-400">
                            {conversation.updatedAt}
                          </Typography.Text>
                        </div>
                        <Typography.Text className="block text-sm text-slate-500">
                          {conversation.preview}
                        </Typography.Text>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            renderSectionItems(tabSectionItems)
          )}
        </div>

        {activeTab === 'chat' ? (
          <footer className="border-t border-slate-200 p-3">
            <Button
              block
              icon={<PlusOutlined />}
              size="large"
              onClick={handleCreateChat}
              className="h-12! rounded-full! border-dashed! border-slate-300! text-lg! font-semibold! text-slate-700!"
            >
              新建对话
            </Button>
          </footer>
        ) : null}
      </aside>

      <main className="flex min-h-0 flex-col bg-white">
        {activeTab === 'chat' ? (
          activeConversation ? (
            <>
              <header className="border-b border-slate-200 px-6 py-4">
                <Typography.Title level={4} className="mb-1! text-slate-900!">
                  {activeConversation.title}
                </Typography.Title>
                <Typography.Text className="text-xs text-slate-400">
                  {activeProject.name} · Mock 会话数据
                </Typography.Text>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
                {messagesByConversation.length > 0 ? (
                  <div className="space-y-3">
                    {messagesByConversation.map((chatMessage) => (
                      <article
                        key={chatMessage.id}
                        className={[
                          'max-w-[85%] rounded-xl px-4 py-3',
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
                          {chatMessage.createdAt}
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
                  type="warning"
                  showIcon
                  message="对话不存在"
                  description="当前 chatId 无法匹配到会话，请从左侧重新选择。"
                />
              ) : (
                <Empty
                  description={
                    <Typography.Text type="secondary">请选择左侧对话开始查看详情</Typography.Text>
                  }
                />
              )}
            </div>
          )
        ) : (
          <div className="grid min-h-full place-items-center px-8 py-10 text-center">
            <div>
              <Typography.Title level={3} className="mb-2! text-slate-900!">
                {TAB_TITLES[activeTab]}页面占位
              </Typography.Title>
              <Typography.Paragraph className="mb-0! text-slate-500!">
                当前为 {TAB_TITLES[activeTab]} 子路由占位区域，后续将接入真实业务数据。
              </Typography.Paragraph>
            </div>
          </div>
        )}
      </main>
    </section>
  );
};
