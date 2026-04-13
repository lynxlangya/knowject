import { useMemo } from "react";
import { Avatar, Empty, Tabs, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { AGENTS_FEATURE_ENABLED } from "@app/navigation/features";
import type { MemberAssetSummary, MemberViewModel } from "../members.types";
import {
  getCollaborationRoleLabels,
  getInitials,
  getMemberStatusMeta,
  getProjectAccessRoleLabels,
  formatDisplayDate,
  formatDisplayDateTime,
  getAssetGroupTitle,
} from "../members.helpers";
import { SubtleScrollArea } from "./SubtleScrollArea";

interface MemberDetailPanelProps {
  member: MemberViewModel | null;
}

const renderAssetGroups = (
  assets: MemberAssetSummary,
  t: ReturnType<typeof useTranslation<"pages">>["t"],
) => {
  const groups: Array<keyof MemberAssetSummary> = AGENTS_FEATURE_ENABLED
    ? ["knowledge", "skills", "agents"]
    : ["knowledge", "skills"];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {groups.map((groupKey) => {
        const items = assets[groupKey];

        return (
          <div
            key={groupKey}
            className="rounded-card border border-[#C2EDE6] bg-[#F2FDFB] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <Typography.Title level={5} className="mb-0! text-slate-800!">
                {getAssetGroupTitle(t, groupKey)}
              </Typography.Title>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">
                {t("members.assets.count", { count: items.length })}
              </span>
            </div>

            {items.length === 0 ? (
              <Typography.Paragraph className="mb-0! mt-4 text-sm! text-slate-500!">
                {t("members.assets.emptyGroup")}
              </Typography.Paragraph>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white bg-white px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Typography.Text className="text-sm font-medium text-slate-700">
                        {item.name}
                      </Typography.Text>
                      <Typography.Text className="text-caption text-slate-400">
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
  const { t, i18n } = useTranslation("pages");
  const collaborationRoleLabels = getCollaborationRoleLabels(t);
  const memberStatusMeta = getMemberStatusMeta(t);
  const projectAccessRoleLabels = getProjectAccessRoleLabels(t);

  if (!member) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Empty description={t("members.detail.selectPrompt")} />
      </div>
    );
  }

  const METRIC_STAGGER = 60;
  const statusMeta = memberStatusMeta[member.primaryStatus];

  const adminProjects = useMemo(
    () => member.projects.filter((project) => project.projectRole === "admin"),
    [member.projects],
  );

  const summaryStats = useMemo(
    () => [
      {
        label: t("members.detail.firstCollaboration"),
        value: formatDisplayDate(member.firstCollaborationAt, i18n.language, t),
      },
      {
        label: t("members.detail.latestCollaboration"),
        value:
          member.recentActivity?.displayTime ??
          formatDisplayDateTime(member.lastProjectActivityAt, i18n.language, t),
      },
      {
        label: t("members.detail.assetsSummary"),
        value: AGENTS_FEATURE_ENABLED
          ? `${member.assets.knowledge.length} / ${member.assets.skills.length} / ${member.assets.agents.length}`
          : `${member.assets.knowledge.length} / ${member.assets.skills.length}`,
      },
      {
        label: t("members.detail.projectStatusBreakdown"),
        value: `${member.activeProjectCount}/${member.syncingProjectCount}/${member.blockedProjectCount}/${member.idleProjectCount}`,
      },
    ],
    [member, t, i18n.language],
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
                  {t("members.detail.currentAccount")}
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
                  {t("members.detail.primaryRole", {
                    role: collaborationRoleLabels[member.primaryRole],
                  })}
                </span>
              ) : null}
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                {t("members.detail.visibleProjects", {
                  count: member.visibleProjectCount,
                })}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                {t("members.detail.adminProjects", {
                  count: member.adminProjectCount,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-105">
          {summaryStats.map((item, index) => (
            <div
              key={item.label}
              className="rounded-card border border-[#C2EDE6] bg-[#F2FDFB] px-4 py-4 animate-metric-fade-in"
              style={{ animationDelay: `${index * METRIC_STAGGER}ms` }}
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
                key: "overview",
                label: t("members.detail.overview"),
                children: (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div
                      className="rounded-card border border-[#C2EDE6] bg-[#F2FDFB] p-5 animate-metric-fade-in"
                      style={{ animationDelay: "0ms" }}
                    >
                      <Typography.Title
                        level={5}
                        className="mb-0! text-slate-800!"
                      >
                        {t("members.detail.currentFocus")}
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
                            {t("members.detail.noResponsibilityTags")}
                          </Typography.Text>
                        )}
                      </div>
                    </div>

                    <div
                      className="rounded-card border border-[#C2EDE6] bg-[#F2FDFB] p-5 animate-metric-fade-in"
                      style={{ animationDelay: "60ms" }}
                    >
                      <Typography.Title
                        level={5}
                        className="mb-0! text-slate-800!"
                      >
                        {t("members.detail.recentActivity")}
                      </Typography.Title>
                      {member.recentActivity ? (
                        <>
                          <Typography.Paragraph className="mb-0! mt-3 text-sm! font-medium text-slate-700!">
                            {member.recentActivity.summary}
                          </Typography.Paragraph>
                          <Typography.Text className="mt-2 block text-xs text-slate-400">
                            {t("members.detail.activityType", {
                              type: member.recentActivity.type,
                              time: member.recentActivity.displayTime,
                            })}
                          </Typography.Text>
                        </>
                      ) : (
                        <Typography.Paragraph className="mb-0! mt-3 text-sm! text-slate-500!">
                          {t("members.detail.noRecentActivity")}
                        </Typography.Paragraph>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "projects",
                label: t("members.detail.projectsTab"),
                children: (
                  <div className="flex flex-col gap-3">
                    {member.projects.map((project, index) => (
                      <article
                        key={project.id}
                        className="rounded-card border border-[#C2EDE6] bg-[#F2FDFB] p-5 animate-metric-fade-in"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Typography.Title
                                level={5}
                                className="mb-0! text-slate-800!"
                              >
                                {project.name}
                              </Typography.Title>
                              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                                {projectAccessRoleLabels[project.projectRole]}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs ${
                                  memberStatusMeta[project.status].className
                                }`}
                              >
                                {memberStatusMeta[project.status].label}
                              </span>
                              {project.collaborationRole ? (
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                                  {
                                    collaborationRoleLabels[
                                      project.collaborationRole
                                    ]
                                  }
                                </span>
                              ) : null}
                            </div>
                            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
                              {project.description.trim() ||
                                t("members.detail.projectDescriptionFallback")}
                            </Typography.Paragraph>
                            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-500!">
                              {project.focusSummary}
                            </Typography.Paragraph>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-85">
                            {[
                              {
                                label: t("members.detail.knowledgeCount"),
                                value: t("members.detail.itemCount", {
                                  count: project.knowledgeCount,
                                }),
                              },
                              {
                                label: t("members.detail.skillCount"),
                                value: t("members.detail.itemCount", {
                                  count: project.skillCount,
                                }),
                              },
                              ...(AGENTS_FEATURE_ENABLED
                                ? [
                                    {
                                      label: t("members.detail.agentCount"),
                                      value: t("members.detail.itemCount", {
                                        count: project.agentCount,
                                      }),
                                    },
                                  ]
                                : []),
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="rounded-2xl border border-white bg-white px-3 py-3"
                              >
                                <Typography.Text className="text-caption uppercase tracking-[0.14em] text-slate-400">
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
                          <span>
                            {t("members.detail.joinedAt", {
                              time: formatDisplayDateTime(
                                project.joinedAt,
                                i18n.language,
                                t,
                              ),
                            })}
                          </span>
                          <span>
                            {t("members.detail.updatedAt", {
                              time: formatDisplayDateTime(
                                project.updatedAt,
                                i18n.language,
                                t,
                              ),
                            })}
                          </span>
                          <span>
                            {t("members.detail.latestAction", {
                              summary:
                                project.recentActivity?.summary ??
                                t("members.detail.latestActionFallback"),
                            })}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ),
              },
              {
                key: "assets",
                label: t("members.detail.assetsTab"),
                children: renderAssetGroups(member.assets, t),
              },
              {
                key: "permissions",
                label: t("members.detail.permissionsTab"),
                children: (
                  <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div
                      className="rounded-card border border-[#C2EDE6] bg-[#F2FDFB] p-5 animate-metric-fade-in"
                      style={{ animationDelay: "0ms" }}
                    >
                      <Typography.Title
                        level={5}
                        className="mb-0! text-slate-800!"
                      >
                        {t("members.detail.permissionSummary")}
                      </Typography.Title>
                      <div className="mt-4 flex flex-col gap-3">
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <Typography.Text className="text-xs text-slate-400">
                            {t("members.detail.manageableProjects")}
                          </Typography.Text>
                          <Typography.Paragraph className="mb-0! mt-2 text-sm! font-medium text-slate-700!">
                            {t("members.detail.itemCount", {
                              count: member.adminProjectCount,
                            })}
                          </Typography.Paragraph>
                        </div>
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <Typography.Text className="text-xs text-slate-400">
                            {t("members.detail.collaboratorProjects")}
                          </Typography.Text>
                          <Typography.Paragraph className="mb-0! mt-2 text-sm! font-medium text-slate-700!">
                            {t("members.detail.itemCount", {
                              count: member.memberProjectCount,
                            })}
                          </Typography.Paragraph>
                        </div>
                        <Typography.Paragraph className="mb-0! text-sm! leading-6! text-slate-500!">
                          {t("members.detail.permissionSummaryHint")}
                        </Typography.Paragraph>
                      </div>
                    </div>

                    <div
                      className="rounded-card border border-[#C2EDE6] bg-[#F2FDFB] p-5 animate-metric-fade-in"
                      style={{ animationDelay: "60ms" }}
                    >
                      <Typography.Title
                        level={5}
                        className="mb-0! text-slate-800!"
                      >
                        {t("members.detail.accessScope")}
                      </Typography.Title>

                      {member.projects.length === 0 ? (
                        <div className="mt-6">
                          <Empty
                            description={t(
                              "members.detail.noVisiblePermissions",
                            )}
                          />
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-col gap-3">
                          {member.projects.map((project) => (
                            <div
                              key={project.id}
                              className="flex flex-col gap-3 rounded-2xl border border-white bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <Typography.Text className="text-sm font-medium text-slate-700">
                                  {project.name}
                                </Typography.Text>
                                <Typography.Text className="mt-1 block text-xs text-slate-400">
                                  {t("members.detail.joinedIn", {
                                    time: formatDisplayDateTime(
                                      project.joinedAt,
                                      i18n.language,
                                      t,
                                    ),
                                  })}
                                </Typography.Text>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                  {projectAccessRoleLabels[project.projectRole]}
                                </span>
                                {project.collaborationRole ? (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                    {
                                      collaborationRoleLabels[
                                        project.collaborationRole
                                      ]
                                    }
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
            <div className="rounded-card border border-amber-200 bg-amber-50/60 p-4">
              <Typography.Text className="text-sm font-medium text-amber-800">
                {t("members.detail.adminImpact", {
                  count: adminProjects.length,
                })}
              </Typography.Text>
            </div>
          ) : null}
        </div>
      </SubtleScrollArea>
    </div>
  );
};
