import { DeleteOutlined, UserAddOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Popconfirm,
  Select,
  Typography,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { extractApiErrorMessage } from "@api/error";
import {
  addProjectMember,
  removeProjectMember,
  searchProjectMemberCandidates,
  updateProjectMemberRole,
  type SearchProjectMemberCandidatesResponseItem,
  type ProjectRole,
} from "@api/projects";
import { getAuthUser } from "@app/auth/user";
import { PATHS, buildProjectOverviewPath } from "@app/navigation/paths";
import { useProjectContext } from "@app/project/useProjectContext";
import { useNavigate } from "react-router-dom";
import { useProjectPageContext } from "./projectPageContext";

interface AddMemberFormValues {
  usernames: string[];
  role: ProjectRole;
}

interface MemberCandidateOption {
  value: string;
  label: string;
  name: string;
  username: string;
}

export const ProjectMembersPage = () => {
  const { t, i18n } = useTranslation("project");
  const { message } = App.useApp();
  const [form] = Form.useForm<AddMemberFormValues>();
  const navigate = useNavigate();
  const { activeProject } = useProjectPageContext();
  const { projects, removeProjectSnapshot, syncProject } = useProjectContext();
  const authUser = getAuthUser();
  const selectedUsernames = Form.useWatch("usernames", form) ?? [];
  const [submitting, setSubmitting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [candidateOptions, setCandidateOptions] = useState<MemberCandidateOption[]>([]);
  const [candidateSearching, setCandidateSearching] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const candidateRequestIdRef = useRef(0);
  const currentMemberUsernameSetRef = useRef(new Set<string>());
  const projectRoleLabels = useMemo<Record<ProjectRole, string>>(
    () => ({
      admin: t("members.roleAdmin"),
      member: t("members.roleMember"),
    }),
    [t],
  );
  const formatDateTime = (value: string): string => {
    return new Intl.DateTimeFormat(i18n.resolvedLanguage || "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  const currentMemberUsernameSet = useMemo(() => {
    return new Set(activeProject.members.map((member) => member.username));
  }, [activeProject.members]);

  useEffect(() => {
    currentMemberUsernameSetRef.current = currentMemberUsernameSet;
    setCandidateOptions((currentOptions) =>
      currentOptions.filter(
        (option) => !currentMemberUsernameSet.has(option.username),
      ),
    );
  }, [currentMemberUsernameSet]);

  const mapCandidateToOption = (
    candidate: SearchProjectMemberCandidatesResponseItem,
  ): MemberCandidateOption => {
    return {
      value: candidate.username,
      username: candidate.username,
      name: candidate.name,
      label: `${candidate.name} (@${candidate.username})`,
    };
  };

  const mergeCandidateOptions = (
    baseOptions: MemberCandidateOption[],
    nextOptions: MemberCandidateOption[],
  ): MemberCandidateOption[] => {
    const optionMap = new Map<string, MemberCandidateOption>();

    baseOptions.forEach((option) => {
      optionMap.set(option.value, option);
    });

    nextOptions.forEach((option) => {
      optionMap.set(option.value, option);
    });

    return Array.from(optionMap.values());
  };

  const loadMemberCandidates = async (query: string) => {
    const requestId = candidateRequestIdRef.current + 1;
    candidateRequestIdRef.current = requestId;
    setCandidateSearching(true);

    try {
      const result = await searchProjectMemberCandidates(query);
      if (candidateRequestIdRef.current !== requestId) {
        return;
      }

      const availableOptions = result.items
        .filter(
          (candidate) =>
            !currentMemberUsernameSetRef.current.has(candidate.username),
        )
        .map(mapCandidateToOption);

      setCandidateOptions((currentOptions) =>
        mergeCandidateOptions(
          currentOptions.filter((option) =>
            selectedUsernames.includes(option.value),
          ),
          availableOptions,
        ),
      );
    } catch (error) {
      if (candidateRequestIdRef.current !== requestId) {
        return;
      }

      console.error("[ProjectMembersPage] 加载可添加成员失败:", error);
      message.error(
        extractApiErrorMessage(error, t("members.feedback.loadCandidatesFailed")),
      );
    } finally {
      if (candidateRequestIdRef.current === requestId) {
        setCandidateSearching(false);
      }
    }
  };

  const handleAddMember = async (values: AddMemberFormValues) => {
    setSubmitting(true);

    try {
      const usernames = Array.from(
        new Set(values.usernames.map((username) => username.trim()).filter(Boolean)),
      ).filter((username) => !currentMemberUsernameSet.has(username));

      if (usernames.length === 0) {
        message.warning(t("members.feedback.selectAtLeastOne"));
        return;
      }

      const failedMessages: string[] = [];
      let latestProject = null;

      for (const username of usernames) {
        try {
          const result = await addProjectMember(activeProject.id, {
            username,
            role: values.role,
          });

          latestProject = result.project;
          syncProject(result.project);
        } catch (error) {
          console.error("[ProjectMembersPage] 添加成员失败:", error);
          failedMessages.push(
            t("members.feedback.addFailureItem", {
              username,
              message: extractApiErrorMessage(
                error,
                t("members.feedback.addFailureFallback"),
              ),
            }),
          );
        }
      }

      if (latestProject) {
        syncProject(latestProject);
      }

      setCandidateOptions((currentOptions) =>
        currentOptions.filter((option) => !usernames.includes(option.value)),
      );

      form.resetFields();
      form.setFieldsValue({ role: "member", usernames: [] });
      setSearchKeyword("");
      candidateRequestIdRef.current += 1;

      if (failedMessages.length === 0) {
        message.success(
          usernames.length === 1
            ? t("members.feedback.addSuccessSingle")
            : t("members.feedback.addSuccessMultiple", {
                count: usernames.length,
              }),
        );
        return;
      }

      const successCount = usernames.length - failedMessages.length;
      if (successCount > 0) {
        message.warning(
          t("members.feedback.addPartial", {
            success: successCount,
            failed: failedMessages.length,
            message: failedMessages[0],
          }),
        );
        return;
      }

      message.error(failedMessages[0] ?? t("members.feedback.addFailed"));
    } catch (error) {
      console.error("[ProjectMembersPage] 添加成员失败:", error);
      message.error(
        extractApiErrorMessage(error, t("members.feedback.addFailed")),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: ProjectRole) => {
    const currentMember = activeProject.members.find(
      (member) => member.userId === userId,
    );
    if (!currentMember || currentMember.role === role) {
      return;
    }

    setUpdatingUserId(userId);

    try {
      const result = await updateProjectMemberRole(activeProject.id, userId, {
        role,
      });

      syncProject(result.project);
      message.success(t("members.feedback.updateRoleSuccess"));
    } catch (error) {
      console.error("[ProjectMembersPage] 更新成员角色失败:", error);
      message.error(
        extractApiErrorMessage(error, t("members.feedback.updateRoleFailed")),
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingUserId(userId);

    try {
      const nextProject =
        projects.find((project) => project.id !== activeProject.id) ?? null;
      const result = await removeProjectMember(activeProject.id, userId);

      if (result.removedCurrentUser || !result.project) {
        removeProjectSnapshot(activeProject.id);
        message.success(t("members.feedback.selfRemoved"));
        void navigate(
          nextProject ? buildProjectOverviewPath(nextProject.id) : PATHS.home,
        );
        return;
      }

      syncProject(result.project);
      message.success(t("members.feedback.removeSuccess"));
    } catch (error) {
      console.error("[ProjectMembersPage] 移除成员失败:", error);
      message.error(
        extractApiErrorMessage(error, t("members.feedback.removeFailed")),
      );
    } finally {
      setRemovingUserId(null);
    }
  };

  const summaryItems = useMemo(() => {
    const adminCount = activeProject.members.filter(
      (member) => member.role === "admin",
    ).length;
    const regularMemberCount = activeProject.members.length - adminCount;

    return [
      {
        label: t("members.summaryProjectMembersLabel"),
        value: t("members.countValue", {
          count: activeProject.members.length,
        }),
        hint: t("members.summaryProjectMembersHint"),
      },
      {
        label: t("members.summaryAdminsLabel"),
        value: t("members.countValue", { count: adminCount }),
        hint: t("members.summaryAdminsHint"),
      },
      {
        label: t("members.summaryRegularMembersLabel"),
        value: t("members.countValue", { count: regularMemberCount }),
        hint: t("members.summaryRegularMembersHint"),
      },
      {
        label: t("members.summaryMyRoleLabel"),
        value: projectRoleLabels[activeProject.currentUserRole],
        hint: t("members.summaryMyRoleHint"),
      },
    ];
  }, [activeProject, projectRoleLabels, t]);

  const canManageMembers = activeProject.currentUserRole === "admin";

  return (
    <section className="flex min-h-full flex-col gap-4">
      <Card
        className="rounded-3xl! border-[#C2EDE6]! shadow-surface!"
        styles={{ body: { padding: "22px 22px 20px" } }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1A8A77]">
              {t("members.pageEyebrow")}
            </Typography.Text>
            <Typography.Title level={3} className="mb-0! mt-2 text-slate-800!">
              {t("members.pageTitle")}
            </Typography.Title>
            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-[#4A6260]!">
              {t("members.pageDescription")}
            </Typography.Paragraph>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-155 xl:grid-cols-4">
            {summaryItems.map((item, index) => (
              <div
                key={item.label}
                className="group relative overflow-hidden rounded-panel border border-[#C2EDE6] bg-[#F2FDFB] px-4 py-4 transition-shadow duration-200 hover:shadow-[0_6px_20px_rgba(15,42,38,0.08)]"
                style={{
                  animation: `metricFadeIn 360ms cubic-bezier(0.22,1,0.36,1) both`,
                  animationDelay: `${index * 60}ms`,
                }}
              >
                <span
                  className="absolute inset-x-0 top-0 h-0.5 rounded-b-full opacity-60 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ backgroundColor: '#28B8A0' }}
                  aria-hidden="true"
                />
                <Typography.Text className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1A8A77]">
                  {item.label}
                </Typography.Text>
                <Typography.Title
                  level={4}
                  className="mb-0! mt-2 text-slate-800!"
                >
                  {item.value}
                </Typography.Title>
                <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-[#4A6260]!">
                  {item.hint}
                </Typography.Paragraph>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card
          className="rounded-3xl! border-[#C2EDE6]! shadow-surface!"
          styles={{ body: { padding: "20px" } }}
        >
          <div className="flex items-center gap-2">
            <UserAddOutlined className="text-[#28B8A0]" />
            <Typography.Title level={5} className="mb-0! text-slate-800!">
              {t("members.formTitle")}
            </Typography.Title>
          </div>
          <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
            {t("members.formDescription")}
          </Typography.Paragraph>

          {canManageMembers ? (
            <Form<AddMemberFormValues>
              form={form}
              layout="vertical"
              initialValues={{ role: "member", usernames: [] }}
              onFinish={(values) => void handleAddMember(values)}
              className="mt-5"
            >
              <Form.Item
                name="usernames"
                label={t("members.usersLabel")}
                rules={[
                  {
                    required: true,
                    type: "array",
                    min: 1,
                    message: t("members.usersRequired"),
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  placeholder={t("members.usersPlaceholder")}
                  options={candidateOptions}
                  filterOption={false}
                  loading={candidateSearching}
                  notFoundContent={
                    candidateSearching
                      ? t("members.usersLoading")
                      : searchKeyword.trim()
                        ? t("members.usersEmpty")
                        : t("members.usersIdle")
                  }
                  onSearch={(value) => {
                    setSearchKeyword(value);
                    void loadMemberCandidates(value);
                  }}
                  onFocus={() => {
                    if (candidateOptions.length === 0) {
                      void loadMemberCandidates("");
                    }
                  }}
                  optionRender={(option) => {
                    const candidate = option.data as MemberCandidateOption;

                    return (
                      <div className="flex min-w-0 flex-col py-0.5">
                        <span className="truncate text-sm font-medium text-slate-700">
                          {candidate.name}
                        </span>
                        <span className="truncate text-xs text-slate-400">
                          @{candidate.username}
                        </span>
                      </div>
                    );
                  }}
                />
              </Form.Item>

              <Form.Item
                name="role"
                label={t("members.roleLabel")}
                rules={[{ required: true, message: t("members.roleRequired") }]}
              >
                <Select
                  options={[
                    { value: "member", label: projectRoleLabels.member },
                    { value: "admin", label: projectRoleLabels.admin },
                  ]}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                block
              >
                {t("members.addSubmit")}
              </Button>
            </Form>
          ) : (
            <Alert
              className="mt-5"
              type="warning"
              showIcon
              message={t("members.noManageTitle")}
              description={t("members.noManageDescription")}
            />
          )}
        </Card>

        <Card
          className="rounded-3xl! border-[#C2EDE6]! shadow-surface!"
          styles={{ body: { padding: "20px" } }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1A8A77]">
                {t("members.listEyebrow")}
              </Typography.Text>
              <Typography.Title
                level={5}
                className="mb-0! mt-2 text-slate-800!"
              >
                {t("members.listTitle")}
              </Typography.Title>
            </div>
            <Typography.Text className="text-sm text-[#4A6260]">
              {t("members.listProjectLabel", { name: activeProject.name })}
            </Typography.Text>
          </div>

          {activeProject.members.length === 0 ? (
            <div className="mt-6">
              <Empty description={t("members.empty")} />
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {activeProject.members.map((member) => {
                const isCurrentUser = authUser?.id === member.userId;
                const actionLoading =
                  updatingUserId === member.userId ||
                  removingUserId === member.userId;

                return (
                  <article
                    key={member.userId}
                    className="group flex flex-col gap-4 rounded-card border border-slate-200 bg-white px-4 py-4 transition-all duration-200 hover:border-[#C2EDE6] hover:shadow-[0_4px_12px_rgba(15,42,38,0.06)] lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Typography.Text className="text-sm font-semibold text-slate-700">
                          {member.name}
                        </Typography.Text>
                        {isCurrentUser ? (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                            {t("members.currentAccount")}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                          {projectRoleLabels[member.role]}
                        </span>
                      </div>
                      <Typography.Text className="mt-2 block text-xs text-slate-400">
                        @{member.username}
                      </Typography.Text>
                      <Typography.Text className="mt-1 block text-xs text-slate-400">
                        {t("members.joinedAt", { value: formatDateTime(member.joinedAt) })}
                      </Typography.Text>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select<ProjectRole>
                        value={member.role}
                        disabled={!canManageMembers || actionLoading}
                        loading={updatingUserId === member.userId}
                        onChange={(nextRole) =>
                          void handleUpdateRole(member.userId, nextRole)
                        }
                        options={[
                          {
                            value: "member",
                            label: projectRoleLabels.member,
                          },
                          { value: "admin", label: projectRoleLabels.admin },
                        ]}
                        className="min-w-30"
                      />

                      <Popconfirm
                        title={t("members.removeTitle")}
                        description={t("members.removeDescription", {
                          name: member.name,
                        })}
                        okText={t("members.removeConfirm")}
                        cancelText={t("members.cancel")}
                        disabled={!canManageMembers}
                        onConfirm={() => void handleRemoveMember(member.userId)}
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          loading={removingUserId === member.userId}
                          disabled={!canManageMembers || actionLoading}
                        >
                          {t("members.removeConfirm")}
                        </Button>
                      </Popconfirm>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};
