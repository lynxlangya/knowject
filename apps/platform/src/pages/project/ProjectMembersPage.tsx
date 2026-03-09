import { ClockCircleOutlined } from '@ant-design/icons';
import { Card, Empty, Typography } from 'antd';
import type {
  ProjectMember,
  ProjectMemberRole,
  ProjectMemberStatus,
} from '../../app/project/project.types';
import { KNOWJECT_BRAND } from '../../styles/brand';
import { useProjectPageContext } from './projectPageContext';

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: '项目负责人',
  product: '产品',
  design: '设计',
  frontend: '前端',
  backend: '后端',
  marketing: '品牌 / 市场',
};

const STATUS_META: Record<ProjectMemberStatus, { label: string; className: string }> = {
  active: {
    label: '推进中',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  syncing: {
    label: '待同步',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  blocked: {
    label: '有阻塞',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  idle: {
    label: '待响应',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  },
};

const ACTIVITY_TYPE_LABELS: Record<ProjectMember['recentActivity']['type'], string> = {
  conversation: '对话同步',
  resource: '资源更新',
  delivery: '推进决策',
  review: '评审反馈',
};

const buildRoleCoverage = (members: ProjectMember[]) => {
  const roleMap = new Map<ProjectMemberRole, { count: number; memberNames: string[] }>();

  members.forEach((member) => {
    const current = roleMap.get(member.role) ?? {
      count: 0,
      memberNames: [],
    };

    roleMap.set(member.role, {
      count: current.count + 1,
      memberNames: [...current.memberNames, member.name],
    });
  });

  return Array.from(roleMap.entries())
    .map(([role, value]) => ({
      role,
      label: ROLE_LABELS[role],
      count: value.count,
      memberNames: value.memberNames,
    }))
    .sort((left, right) => right.count - left.count);
};

const getRecentActivities = (members: ProjectMember[]) => {
  return [...members]
    .sort(
      (left, right) =>
        new Date(right.recentActivity.occurredAt).getTime() -
        new Date(left.recentActivity.occurredAt).getTime(),
    )
    .slice(0, 4)
    .map((member) => ({
      memberId: member.id,
      memberName: member.name,
      roleLabel: ROLE_LABELS[member.role],
      activityLabel: ACTIVITY_TYPE_LABELS[member.recentActivity.type],
      summary: member.recentActivity.summary,
      displayTime: member.recentActivity.displayTime,
    }));
};

export const ProjectMembersPage = () => {
  const { members, activeProject } = useProjectPageContext();

  if (members.length === 0) {
    return (
      <section className="grid min-h-full place-items-center rounded-[24px] border border-slate-200 bg-white">
        <Empty description="当前项目暂无协作成员" />
      </section>
    );
  }

  const roleCoverage = buildRoleCoverage(members);
  const recentActivities = getRecentActivities(members);
  const activeMembers = members.filter((member) => member.isActive).length;
  const responsibilityCount = new Set(members.flatMap((member) => member.responsibilityTags)).size;
  const summaryItems = [
    {
      label: '协作成员',
      value: `${members.length} 位`,
      hint: '已接入当前项目的人力协作角色',
    },
    {
      label: '活跃推进',
      value: `${activeMembers} 位`,
      hint: '当前仍在推进或同步中的成员',
    },
    {
      label: '角色覆盖',
      value: `${roleCoverage.length} 类`,
      hint: '项目当前已覆盖的关键协作职能',
    },
    {
      label: '负责领域',
      value: `${responsibilityCount} 项`,
      hint: '用于定位责任人与协作边界',
    },
  ];

  return (
    <section className="flex min-h-full flex-col gap-4">
      <Card
        className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
        styles={{ body: { padding: '22px 22px 20px' } }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              项目成员
            </Typography.Text>
            <Typography.Title level={3} className="mb-1! mt-2 text-slate-800!">
              {activeProject.name} 的协作分工
            </Typography.Title>
            <Typography.Paragraph className="mb-0! text-sm! text-slate-600!">
              展示项目成员的身份、职责与最近动作，帮助团队快速判断谁在推进、谁负责什么、最近发生了什么。
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
      </Card>

      <div className="grid min-h-0 flex-1 content-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-4 md:grid-cols-2">
          {members.map((member) => {
            const statusMeta = STATUS_META[member.status];

            return (
              <article
                key={member.id}
                className="flex flex-col gap-5 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow-[0_6px_14px_rgba(15,23,42,0.08)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography.Title level={5} className="mb-0! truncate text-slate-800!">
                        {member.name}
                      </Typography.Title>
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={{
                          borderColor: KNOWJECT_BRAND.primaryBorder,
                          backgroundColor: KNOWJECT_BRAND.primarySurfaceStrong,
                          color: KNOWJECT_BRAND.primaryText,
                        }}
                      >
                        {ROLE_LABELS[member.role]}
                      </span>
                      <span
                        className={[
                          'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                          statusMeta.className,
                        ].join(' ')}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-600!">
                      {member.focusSummary}
                    </Typography.Paragraph>
                  </div>
                </div>

                <div>
                  <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    负责领域
                  </Typography.Text>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.responsibilityTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <ClockCircleOutlined className="text-slate-400" />
                      最近动作
                    </div>
                    <Typography.Text className="text-xs text-slate-400">
                      {member.recentActivity.displayTime}
                    </Typography.Text>
                  </div>
                  <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
                    <span className="font-medium text-slate-700">
                      {ACTIVITY_TYPE_LABELS[member.recentActivity.type]}
                    </span>
                    {' · '}
                    {member.recentActivity.summary}
                  </Typography.Paragraph>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="flex min-h-0 flex-col gap-4">
          <Card
            className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
            styles={{ body: { padding: '20px' } }}
          >
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              协作结构
            </Typography.Text>
            <Typography.Title level={5} className="mb-0! mt-2 text-slate-800!">
              角色覆盖与分工
            </Typography.Title>
            <div className="mt-4 flex flex-col gap-3">
              {roleCoverage.map((item) => (
                <div
                  key={item.role}
                  className="rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Typography.Text className="text-sm font-semibold text-slate-700">
                      {item.label}
                    </Typography.Text>
                    <Typography.Text className="text-xs text-slate-400">
                      {item.count} 人
                    </Typography.Text>
                  </div>
                  <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                    {item.memberNames.join(' · ')}
                  </Typography.Paragraph>
                </div>
              ))}
            </div>
          </Card>

          <Card
            className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
            styles={{ body: { padding: '20px' } }}
          >
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              最近动态
            </Typography.Text>
            <Typography.Title level={5} className="mb-0! mt-2 text-slate-800!">
              成员最近一次协作记录
            </Typography.Title>
            <div className="mt-4 flex flex-col gap-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.memberId}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Typography.Text className="text-sm font-semibold text-slate-700">
                      {activity.memberName}
                    </Typography.Text>
                    <Typography.Text className="text-xs text-slate-400">
                      {activity.displayTime}
                    </Typography.Text>
                  </div>
                  <Typography.Text className="mt-1 block text-xs text-slate-400">
                    {activity.roleLabel} · {activity.activityLabel}
                  </Typography.Text>
                  <Typography.Paragraph className="mb-0! mt-2 text-sm! leading-6! text-slate-600!">
                    {activity.summary}
                  </Typography.Paragraph>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </section>
  );
};
