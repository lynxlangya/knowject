import { Alert, Button, Card, Empty, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  buildProjectChatPath,
  buildProjectMembersPath,
  buildProjectResourcesPath,
} from '@app/navigation/paths';
import { useProjectPageContext } from './projectPageContext';
import { getRecentProjectResources } from './project.mock';

const formatConversationUpdatedAt = (value: string): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const ProjectOverviewPage = () => {
  const navigate = useNavigate();
  const {
    activeProject,
    conversations,
    conversationsError,
    knowledgeCatalog,
    projectKnowledgeCatalog,
    agentsCatalog,
    skillsCatalog,
  } = useProjectPageContext();
  const recentConversations = conversations.slice(0, 3);
  const recentResources = getRecentProjectResources(activeProject, {
    knowledgeCatalog,
    projectKnowledgeCatalog,
    agentsCatalog,
    skillsCatalog,
  });

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-3">
        {conversationsError ? (
          <Alert
            type="warning"
            showIcon
            message="项目上下文加载部分失败"
            description={conversationsError}
          />
        ) : null}

        <Card
          className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
          styles={{ body: { padding: '0' } }}
        >
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    项目对话
                  </Typography.Text>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                    最近 {recentConversations.length} 条
                  </span>
                </div>
                <Typography.Title level={4} className="mb-1! mt-0! text-slate-800!">
                  最近对话
                </Typography.Title>
                <Typography.Text className="text-sm text-slate-500">
                  快速回到最近推进的讨论。
                </Typography.Text>
              </div>
              <Button
                className="h-10! rounded-full! border-slate-200! px-4! text-sm! font-medium! text-slate-600!"
                onClick={() => navigate(buildProjectChatPath(activeProject.id))}
              >
                查看全部
              </Button>
            </div>
          </div>

          {recentConversations.length > 0 ? (
            <div className="px-4 py-4">
              <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                {recentConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="group w-full border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50/70"
                    onClick={() =>
                      navigate(buildProjectChatPath(activeProject.id, conversation.id))
                    }
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full bg-slate-300 transition-colors duration-200 group-hover:bg-emerald-400"
                            aria-hidden="true"
                          />
                          <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            最近活跃
                          </Typography.Text>
                        </div>
                        <Typography.Text className="block truncate text-[15px] font-semibold text-slate-800">
                          {conversation.title}
                        </Typography.Text>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                        {formatConversationUpdatedAt(conversation.updatedAt)}
                      </span>
                    </div>
                    <Typography.Paragraph className="mb-0! text-[13px]! leading-6! text-slate-500! [display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {conversation.preview}
                    </Typography.Paragraph>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/40 px-6 py-10">
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前暂无对话" />
              </div>
            </div>
          )}
        </Card>

        <Card
          className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
          styles={{ body: { padding: '20px 20px 20px' } }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <Typography.Title level={4} className="mb-1! text-slate-800!">
                最近接入资源
              </Typography.Title>
              <Typography.Text className="text-sm text-slate-500">
                这里同时展示项目绑定的全局资产和项目私有知识，便于快速回到当前上下文。
              </Typography.Text>
            </div>
            <Button onClick={() => navigate(buildProjectResourcesPath(activeProject.id))}>进入资源页</Button>
          </div>

          {recentResources.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {recentResources.map((resource) => (
                <article
                  key={resource.id}
                  className="rounded-[20px] border border-slate-200 bg-slate-50/55 px-4 py-4"
                >
                  <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    {resource.type}
                  </Typography.Text>
                  <Typography.Title level={5} className="mb-1! mt-2 text-slate-800!">
                    {resource.name}
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0! text-sm! text-slate-600!">
                    {resource.description}
                  </Typography.Paragraph>
                </article>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前暂无接入资源" />
          )}
        </Card>
      </div>

      <Card
        className="self-start rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
        styles={{ body: { padding: '20px 20px 20px' } }}
      >
        <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          快捷操作
        </Typography.Text>
        <Typography.Title level={3} className="mb-2! mt-3 text-slate-800!">
          从项目概览进入下一步
        </Typography.Title>
        <Typography.Paragraph className="mb-6! text-sm! text-slate-600!">
          先看项目状态，再进入对话、资源和成员页，能显著降低工作台的认知切换成本。
        </Typography.Paragraph>

        <div className="flex flex-col gap-3">
          <Button
            block
            type="primary"
            size="large"
            className="h-12! rounded-[18px]! text-base! font-semibold!"
            onClick={() =>
              navigate(buildProjectChatPath(activeProject.id, recentConversations[0]?.id))
            }
          >
            继续对话
          </Button>
          <Button
            block
            size="large"
            className="h-12! rounded-[18px]! text-base! font-medium!"
            onClick={() => navigate(buildProjectResourcesPath(activeProject.id))}
          >
            引入资源
          </Button>
          <Button
            block
            size="large"
            className="h-12! rounded-[18px]! text-base! font-medium!"
            onClick={() => navigate(buildProjectMembersPath(activeProject.id))}
          >
            查看成员
          </Button>
        </div>
      </Card>
    </section>
  );
};
