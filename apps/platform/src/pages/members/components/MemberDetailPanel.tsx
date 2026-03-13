import { Avatar, Empty, Tabs, Typography } from 'antd';
import type { MemberAssetSummary, MemberViewModel } from '../members.types';
import {
  COLLABORATION_ROLE_LABELS,
  MEMBER_STATUS_META,
  PROJECT_ACCESS_ROLE_LABELS,
  formatDisplayDate,
  formatDisplayDateTime,
  getAssetGroupTitle,
} from '../members.helpers';
import { SubtleScrollArea } from './SubtleScrollArea';

interface MemberDetailPanelProps {
  member: MemberViewModel | null;
}

const getInitials = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? '')
    .join('');
};

const renderAssetGroups = (assets: MemberAssetSummary) => {
  const groups: Array<keyof MemberAssetSummary> = ['knowledge', 'skills', 'agents'];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {groups.map((groupKey) => {
        const items = assets[groupKey];

        return (
          <div
            key={groupKey}
            className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <Typography.Title level={5} className="mb-0! text-slate-800!">
                {getAssetGroupTitle(groupKey)}
              </Typography.Title>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">
                {items.length} 个
              </span>
            </div>

            {items.length === 0 ? (
              <Typography.Paragraph className="mb-0! mt-4 text-sm! text-slate-500!">
                当前可见项目里还没有关联这类资产。
              </Typography.Paragraph>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[16px] border border-white bg-white px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Typography.Text className="text-sm font-medium text-slate-700">
                        {item.name}
                      </Typography.Text>
                      <Typography.Text className="text-[11px] text-slate-400">
                        {item.updatedAt}
                      </Typography.Text>
                    </div>
                    <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                      {item.description}
                    </Typography.Paragraph>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const MemberDetailPanel = ({ member }: MemberDetailPanelProps) => {
  if (!member) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Empty description="请选择一位成员查看详情" />
      </div>
    );
  }

  const statusMeta = MEMBER_STATUS_META[member.primaryStatus];
  const adminProjects = member.projects.filter(
    (project) => project.projectRole === 'admin',
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
      <div className="shrink-0 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar
            size={64}
            src={member.avatarUrl}
            className="shrink-0 bg-slate-200 text-xl text-slate-600"
          >
            {getInitials(member.name)}
          </Avatar>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Typography.Title level={4} className="mb-0! text-slate-800!">
                {member.name}
              </Typography.Title>
              {member.isCurrentUser ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">
                  当前账号
                </span>
              ) : null}
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <Typography.Text className="mt-1 block text-sm text-slate-400">
              @{member.username}
            </Typography.Text>

            <div className="mt-3 flex flex-wrap gap-2">
              {member.primaryRole ? (
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                  主协作角色：{COLLABORATION_ROLE_LABELS[member.primaryRole]}
                </span>
              ) : null}
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                参与项目：{member.visibleProjectCount}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                管理项目：{member.adminProjectCount}
              </span>
            </div>
          </div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-[420px]">
          {[
            {
              label: '首次协作',
              value: formatDisplayDate(member.firstCollaborationAt),
            },
            {
              label: '最近协作',
              value: member.recentActivity?.displayTime ?? formatDisplayDateTime(member.lastProjectActivityAt),
            },
            {
              label: '知识 / 技能 / 智能体',
              value: `${member.assets.knowledge.length} / ${member.assets.skills.length} / ${member.assets.agents.length}`,
            },
            {
              label: '项目状态分布',
              value: `${member.activeProjectCount}/${member.syncingProjectCount}/${member.blockedProjectCount}/${member.idleProjectCount}`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4"
            >
              <Typography.Text className="text-xs uppercase tracking-[0.14em] text-slate-400">
                {item.label}
              </Typography.Text>
              <Typography.Paragraph className="mb-0! mt-2 text-sm! font-medium text-slate-700!">
                {item.value}
              </Typography.Paragraph>
            </div>
          ))}
        </div>
      </div>

      <SubtleScrollArea className="min-h-0 flex-1 -mr-5 pr-5">
        <div className="flex flex-col gap-5">
          <Tabs
            items={[
              {
                key: 'overview',
                label: '概览',
                children: (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-5">
                      <Typography.Title level={5} className="mb-0! text-slate-800!">
                        当前关注
                      </Typography.Title>
                      <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-7! text-slate-600!">
                        {member.focusSummary}
                      </Typography.Paragraph>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {member.responsibilityTags.length > 0 ? (
                          member.responsibilityTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-white bg-white px-2.5 py-1 text-xs text-slate-500"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <Typography.Text className="text-sm text-slate-400">
                            暂无职责标签。
                          </Typography.Text>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-5">
                      <Typography.Title level={5} className="mb-0! text-slate-800!">
                        最近动作
                      </Typography.Title>
                      {member.recentActivity ? (
                        <>
                          <Typography.Paragraph className="mb-0! mt-3 text-sm! font-medium text-slate-700!">
                            {member.recentActivity.summary}
                          </Typography.Paragraph>
                          <Typography.Text className="mt-2 block text-xs text-slate-400">
                            类型：{member.recentActivity.type} · {member.recentActivity.displayTime}
                          </Typography.Text>
                        </>
                      ) : (
                        <Typography.Paragraph className="mb-0! mt-3 text-sm! text-slate-500!">
                          当前还没有更细的协作动作快照，先以项目最近更新时间作为协作信号。
                        </Typography.Paragraph>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'projects',
                label: '项目',
                children: (
                  <div className="flex flex-col gap-3">
                    {member.projects.map((project) => (
                      <article
                        key={project.id}
                        className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Typography.Title level={5} className="mb-0! text-slate-800!">
                                {project.name}
                              </Typography.Title>
                              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                                {PROJECT_ACCESS_ROLE_LABELS[project.projectRole]}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs ${
                                  MEMBER_STATUS_META[project.status].className
                                }`}
                              >
                                {MEMBER_STATUS_META[project.status].label}
                              </span>
                              {project.collaborationRole ? (
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                                  {COLLABORATION_ROLE_LABELS[project.collaborationRole]}
                                </span>
                              ) : null}
                            </div>
                            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
                              {project.description.trim() || '当前项目暂无补充描述。'}
                            </Typography.Paragraph>
                            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-500!">
                              {project.focusSummary}
                            </Typography.Paragraph>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[340px]">
                            {[
                              {
                                label: '知识库',
                                value: `${project.knowledgeCount} 个`,
                              },
                              {
                                label: '技能',
                                value: `${project.skillCount} 个`,
                              },
                              {
                                label: '智能体',
                                value: `${project.agentCount} 个`,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="rounded-[16px] border border-white bg-white px-3 py-3"
                              >
                                <Typography.Text className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                  {item.label}
                                </Typography.Text>
                                <Typography.Paragraph className="mb-0! mt-2 text-sm! font-medium text-slate-700!">
                                  {item.value}
                                </Typography.Paragraph>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                          <span>加入项目：{formatDisplayDateTime(project.joinedAt)}</span>
                          <span>项目更新：{formatDisplayDateTime(project.updatedAt)}</span>
                          <span>
                            最近动作：{project.recentActivity?.summary ?? '待补充协作动作'}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ),
              },
              {
                key: 'assets',
                label: '资产',
                children: renderAssetGroups(member.assets),
              },
              {
                key: 'permissions',
                label: '权限',
                children: (
                  <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-5">
                      <Typography.Title level={5} className="mb-0! text-slate-800!">
                        权限摘要
                      </Typography.Title>
                      <div className="mt-4 flex flex-col gap-3">
                        <div className="rounded-[16px] border border-white bg-white px-4 py-3">
                          <Typography.Text className="text-xs text-slate-400">
                            可管理项目
                          </Typography.Text>
                          <Typography.Paragraph className="mb-0! mt-2 text-sm! font-medium text-slate-700!">
                            {member.adminProjectCount} 个
                          </Typography.Paragraph>
                        </div>
                        <div className="rounded-[16px] border border-white bg-white px-4 py-3">
                          <Typography.Text className="text-xs text-slate-400">
                            协作成员项目
                          </Typography.Text>
                          <Typography.Paragraph className="mb-0! mt-2 text-sm! font-medium text-slate-700!">
                            {member.memberProjectCount} 个
                          </Typography.Paragraph>
                        </div>
                        <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
                          当前仅展示你可见项目中的权限关系；真正的组织级角色与权限矩阵将在后续阶段接入。
                        </Typography.Paragraph>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-5">
                      <Typography.Title level={5} className="mb-0! text-slate-800!">
                        项目访问范围
                      </Typography.Title>

                      {member.projects.length === 0 ? (
                        <div className="mt-6">
                          <Empty description="当前没有可见项目权限" />
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-col gap-3">
                          {member.projects.map((project) => (
                            <div
                              key={project.id}
                              className="flex flex-col gap-3 rounded-[16px] border border-white bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <Typography.Text className="text-sm font-medium text-slate-700">
                                  {project.name}
                                </Typography.Text>
                                <Typography.Text className="mt-1 block text-xs text-slate-400">
                                  加入于 {formatDisplayDateTime(project.joinedAt)}
                                </Typography.Text>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                  {PROJECT_ACCESS_ROLE_LABELS[project.projectRole]}
                                </span>
                                {project.collaborationRole ? (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                    {COLLABORATION_ROLE_LABELS[project.collaborationRole]}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              },
            ]}
          />

          {adminProjects.length > 0 ? (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50/60 p-4">
              <Typography.Text className="text-sm font-medium text-amber-800">
                该成员当前在 {adminProjects.length} 个可见项目中具备管理员权限，需要重点关注成员配置与权限变更带来的协作影响。
              </Typography.Text>
            </div>
          ) : null}
        </div>
      </SubtleScrollArea>
    </div>
  );
};
