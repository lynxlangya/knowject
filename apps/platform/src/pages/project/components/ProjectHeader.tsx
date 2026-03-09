import { Typography } from 'antd';
import type {
  ProjectMember,
  ProjectOverviewStats,
  ProjectSummary,
} from '../../../app/project/project.types';
import { KNOWJECT_BRAND } from '../../../styles/brand';
import type { ProjectWorkspaceMeta } from '../project.mock';

interface ProjectHeaderProps {
  project: ProjectSummary;
  members: ProjectMember[];
  meta: ProjectWorkspaceMeta;
  stats: ProjectOverviewStats;
}

export const ProjectHeader = ({
  project,
  members,
  meta,
  stats,
}: ProjectHeaderProps) => {
  const projectInitial = (project.name.trim().slice(0, 1) || 'P').toUpperCase();
  const visibleMembers = members.slice(0, 4);
  const hiddenMemberCount = Math.max(members.length - visibleMembers.length, 0);
  const statItems = [
    { label: '活跃成员', value: stats.activeMembers },
    { label: '知识库', value: stats.knowledgeCount },
    { label: '技能', value: stats.skillCount },
    { label: '智能体', value: stats.agentCount },
    { label: '对话', value: stats.conversationCount },
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-5 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[20px] border text-2xl font-semibold text-white"
            style={{
              borderColor: KNOWJECT_BRAND.primaryBorder,
              backgroundImage: KNOWJECT_BRAND.heroGradient,
              boxShadow: `0 12px 24px ${KNOWJECT_BRAND.primaryGlow}`,
            }}
          >
            {projectInitial}
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-2">
            <Typography.Title level={2} className="mb-0! mt-0! leading-[1.08]! text-slate-900!">
              {project.name}
            </Typography.Title>
            <Typography.Paragraph className="mb-0! max-w-2xl text-base! text-slate-600!">
              {meta.summary}
            </Typography.Paragraph>
          </div>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/70 px-4 py-4 shadow-[0_10px_30px_rgba(148,163,184,0.12)] backdrop-blur">
          <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            当前协作者
          </Typography.Text>
          <div className="mt-3 flex items-center">
            {visibleMembers.map((member, index) => (
              <div
                key={member.id}
                className={[
                  'relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-[0_6px_14px_rgba(15,23,42,0.12)]',
                  index === 0 ? '' : '-ml-2',
                ].join(' ')}
                title={member.name}
              >
                <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
              </div>
            ))}
            {hiddenMemberCount > 0 ? (
              <span className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-2 ring-white">
                +{hiddenMemberCount}
              </span>
            ) : null}
          </div>
          <Typography.Paragraph className="mb-0! mt-3 max-w-[260px] text-sm! text-slate-500!">
            围绕当前项目的知识、对话、资源与协作关系进行统一编排。
          </Typography.Paragraph>
        </div>
      </div>

      <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-5">
        {statItems.map((item) => (
          <div key={item.label} className="bg-white px-5 py-4">
            <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              {item.label}
            </Typography.Text>
            <Typography.Title level={3} className="mb-0! mt-2 text-slate-900!">
              {item.value}
            </Typography.Title>
          </div>
        ))}
      </div>
    </section>
  );
};
