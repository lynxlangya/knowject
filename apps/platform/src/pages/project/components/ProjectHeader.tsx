import { Tooltip, Typography } from 'antd';
import type {
  ProjectMember,
  ProjectOverviewStats,
  ProjectSummary,
  ProjectWorkspaceMeta,
} from '@app/project/project.types';
import { KNOWJECT_BRAND } from '@styles/brand';

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
  const projectDescription = project.description.trim() || meta.summary;
  const activeMembers = members.filter((member) => member.isActive);
  const visibleMembers = activeMembers.slice(0, 5);
  const hiddenMemberCount = Math.max(activeMembers.length - visibleMembers.length, 0);
  const statLabelClassName = 'text-xs font-semibold leading-none text-slate-600';
  const statItems = [
    { label: '知识库', value: stats.knowledgeCount },
    { label: '技能', value: stats.skillCount },
    { label: '智能体', value: stats.agentCount },
    { label: '对话', value: stats.conversationCount },
  ];

  return (
    <section className="overflow-hidden rounded-hero border border-slate-200/90 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.045)]">
      <div className="flex flex-col gap-5 bg-[linear-gradient(145deg,rgba(246,249,253,0.98),rgba(237,244,255,0.92))] px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-card border text-2xl font-semibold text-white"
            style={{
              borderColor: KNOWJECT_BRAND.primaryBorder,
              backgroundImage: KNOWJECT_BRAND.heroGradient,
              boxShadow: `0 12px 24px ${KNOWJECT_BRAND.primaryGlow}`,
            }}
          >
            {projectInitial}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
            <Typography.Title level={2} className="mb-0! mt-0! leading-[1.08]! text-slate-800!">
              {project.name}
            </Typography.Title>
            <Typography.Paragraph className="mb-0! max-w-2xl text-base! text-slate-500!">
              {projectDescription}
            </Typography.Paragraph>
          </div>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-78 lg:shrink-0">
          <div className="rounded-[14px] border border-white/80 bg-white/78 px-3.5 py-2.5 shadow-[0_8px_18px_rgba(148,163,184,0.08)] backdrop-blur sm:col-span-2">
            <Typography.Text className={statLabelClassName}>
              活跃成员
            </Typography.Text>
            <div className="mt-1.5 flex items-center">
	              {visibleMembers.map((member, index) => (
	                <Tooltip key={member.id} title={member.name}>
	                  <div
                    className={[
                      'relative h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-white shadow-[0_4px_10px_rgba(15,23,42,0.12)] transition-transform duration-200 hover:z-10 hover:-translate-y-0.5',
	                      index === 0 ? '' : '-ml-1',
	                    ].join(' ')}
	                  >
	                    {member.avatarUrl ? (
	                      <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
	                    ) : (
	                      <span className="flex h-full w-full items-center justify-center bg-slate-200 text-[9px] font-semibold text-slate-600">
	                        {(member.name.trim().charAt(0) || 'M').toUpperCase()}
	                      </span>
	                    )}
	                  </div>
	                </Tooltip>
	              ))}
              {hiddenMemberCount > 0 ? (
                <span className="-ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 ring-1 ring-white shadow-[0_4px_10px_rgba(15,23,42,0.08)]">
                  +{hiddenMemberCount}
                </span>
              ) : null}
            </div>
          </div>

          {statItems.map((item) => (
            <div
              key={item.label}
              className="flex h-10 items-center justify-between rounded-xl border border-white/80 bg-white/70 px-3 py-1.5 shadow-[0_6px_14px_rgba(148,163,184,0.06)] backdrop-blur"
            >
              <span className={statLabelClassName}>
                {item.label}
              </span>
              <span className="text-xl font-semibold leading-none text-slate-800">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
