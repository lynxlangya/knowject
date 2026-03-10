import { App, Typography } from 'antd';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '../../app/navigation/paths';
import type { ProjectResourceFocus } from '../../app/project/project.types';
import { ProjectResourceGroup } from './components/ProjectResourceGroup';
import { useProjectPageContext } from './projectPageContext';
import { getProjectResourceGroups } from './project.mock';

const GLOBAL_PATH_BY_FOCUS: Record<ProjectResourceFocus, string> = {
  knowledge: PATHS.knowledge,
  skills: PATHS.skills,
  agents: PATHS.agents,
};

export const ProjectResourcesPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeProject, stats } = useProjectPageContext();
  const groups = getProjectResourceGroups(activeProject);
  const focus = searchParams.get('focus') as ProjectResourceFocus | null;
  const knowledgeRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focus) {
      return;
    }

    const focusRef =
      focus === 'knowledge' ? knowledgeRef : focus === 'skills' ? skillsRef : agentsRef;

    focusRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [agentsRef, focus, knowledgeRef, skillsRef]);

  const summaryItems = [
    {
      label: '知识库',
      value: `${stats.knowledgeCount} 个`,
      hint: '当前项目已接入的知识上下文',
    },
    {
      label: '技能',
      value: `${stats.skillCount} 个`,
      hint: '当前项目可直接复用的工作流能力',
    },
    {
      label: '智能体',
      value: `${stats.agentCount} 个`,
      hint: '当前项目已绑定的协作智能体',
    },
    {
      label: '资源分层',
      value: '2 层',
      hint: '全局资产治理，项目资源编排与消费',
    },
  ];

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              项目资源
            </Typography.Text>
            <Typography.Title level={3} className="mb-1! mt-2 text-slate-800!">
              当前项目知识、技能与智能体
            </Typography.Title>
            <Typography.Paragraph className="mb-0! max-w-2xl text-sm! text-slate-600!">
              这里展示的是当前项目内已经启用的知识库、技能和智能体。全局资产负责治理与复用，项目资源负责绑定、编排与消费。
            </Typography.Paragraph>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-4">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4"
              >
                <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                  {item.label}
                </Typography.Text>
                <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                  {item.value}
                </Typography.Title>
                <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                  {item.hint}
                </Typography.Paragraph>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {groups.map((group) => (
          <div
            key={group.key}
            ref={group.key === 'knowledge' ? knowledgeRef : group.key === 'skills' ? skillsRef : agentsRef}
          >
            <ProjectResourceGroup
              group={group}
              highlighted={focus === group.key}
              onAddProjectResource={() =>
                message.info(`下一步会在这里接入“为当前项目新增${group.title}”的流程。`)
              }
              onOpenGlobal={() => navigate(GLOBAL_PATH_BY_FOCUS[group.key])}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
