import { App, Button, Typography } from 'antd';
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

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              项目资源
            </Typography.Text>
            <Typography.Title level={3} className="mb-1! mt-2 text-slate-900!">
              当前项目已接入的全局资产
            </Typography.Title>
            <Typography.Paragraph className="mb-0! max-w-2xl text-sm! text-slate-500!">
              这里展示的是已绑定到项目的全局知识库、技能和智能体。项目页负责编排和消费，全局页负责治理与复用。
            </Typography.Paragraph>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="primary"
              onClick={() =>
                message.info('下一步会在这里接入“从全局资产池选择并绑定到当前项目”的抽屉。')
              }
            >
              引入资源
            </Button>
            <Button onClick={() => navigate(PATHS.knowledge)}>前往全局资产页</Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-slate-200 bg-slate-50/60 px-4 py-4">
            <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              已接入知识库
            </Typography.Text>
            <Typography.Title level={3} className="mb-0! mt-2 text-slate-900!">
              {stats.knowledgeCount}
            </Typography.Title>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-slate-50/60 px-4 py-4">
            <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              已接入技能
            </Typography.Text>
            <Typography.Title level={3} className="mb-0! mt-2 text-slate-900!">
              {stats.skillCount}
            </Typography.Title>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-slate-50/60 px-4 py-4">
            <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              已接入智能体
            </Typography.Text>
            <Typography.Title level={3} className="mb-0! mt-2 text-slate-900!">
              {stats.agentCount}
            </Typography.Title>
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
              onOpenGlobal={() => navigate(GLOBAL_PATH_BY_FOCUS[group.key])}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
