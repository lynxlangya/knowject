import { Button, Card, Empty, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  buildProjectChatPath,
  buildProjectMembersPath,
  buildProjectResourcesPath,
} from '../../app/navigation/paths';
import { useProjectPageContext } from './projectPageContext';
import {
  getRecentProjectConversations,
  getRecentProjectResources,
} from './project.mock';

export const ProjectOverviewPage = () => {
  const navigate = useNavigate();
  const { activeProject } = useProjectPageContext();
  const recentConversations = getRecentProjectConversations(activeProject.id);
  const recentResources = getRecentProjectResources(activeProject);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Card className="rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <Typography.Title level={4} className="mb-1! text-slate-900!">
                最近对话
              </Typography.Title>
              <Typography.Text className="text-sm text-slate-500">
                从项目最近讨论快速回到上下文。
              </Typography.Text>
            </div>
            <Button onClick={() => navigate(buildProjectChatPath(activeProject.id))}>查看全部</Button>
          </div>

          {recentConversations.length > 0 ? (
            <div className="space-y-3">
              {recentConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4 text-left transition-colors hover:border-slate-300 hover:bg-white"
                  onClick={() => navigate(buildProjectChatPath(activeProject.id, conversation.id))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Typography.Text className="text-base font-semibold text-slate-900">
                      {conversation.title}
                    </Typography.Text>
                    <Typography.Text className="text-xs text-slate-400">
                      {conversation.updatedAt}
                    </Typography.Text>
                  </div>
                  <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-500!">
                    {conversation.preview}
                  </Typography.Paragraph>
                </button>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前暂无对话" />
          )}
        </Card>

        <Card className="rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <Typography.Title level={4} className="mb-1! text-slate-900!">
                最近接入资源
              </Typography.Title>
              <Typography.Text className="text-sm text-slate-500">
                这些全局资产已被当前项目接入，可直接参与协作。
              </Typography.Text>
            </div>
            <Button onClick={() => navigate(buildProjectResourcesPath(activeProject.id))}>进入资源页</Button>
          </div>

          {recentResources.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {recentResources.map((resource) => (
                <article
                  key={resource.id}
                  className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4"
                >
                  <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    {resource.type}
                  </Typography.Text>
                  <Typography.Title level={5} className="mb-1! mt-2 text-slate-900!">
                    {resource.name}
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0! text-sm! text-slate-500!">
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

      <Card className="rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!">
        <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          快捷操作
        </Typography.Text>
        <Typography.Title level={3} className="mb-2! mt-3 text-slate-900!">
          从项目概览进入下一步
        </Typography.Title>
        <Typography.Paragraph className="mb-6! text-sm! text-slate-500!">
          先看项目状态，再进入对话、资源和成员页，能显著降低工作台的认知切换成本。
        </Typography.Paragraph>

        <div className="space-y-3">
          <Button
            block
            type="primary"
            size="large"
            onClick={() =>
              navigate(buildProjectChatPath(activeProject.id, recentConversations[0]?.id))
            }
          >
            继续对话
          </Button>
          <Button
            block
            size="large"
            onClick={() => navigate(buildProjectResourcesPath(activeProject.id))}
          >
            引入资源
          </Button>
          <Button
            block
            size="large"
            onClick={() => navigate(buildProjectMembersPath(activeProject.id))}
          >
            查看成员
          </Button>
        </div>
      </Card>
    </section>
  );
};
