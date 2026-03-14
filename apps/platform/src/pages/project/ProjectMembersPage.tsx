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
import { useMemo, useState } from "react";
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

const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  admin: "管理员",
  member: "成员",
};

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const ProjectMembersPage = () => {
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

  const currentMemberUsernameSet = useMemo(() => {
    return new Set(activeProject.members.map((member) => member.username));
  }, [activeProject.members]);

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
    setCandidateSearching(true);

      try {
      const result = await searchProjectMemberCandidates(query);
      const availableOptions = result.items
        .filter((candidate) => !currentMemberUsernameSet.has(candidate.username))
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
      console.error("[ProjectMembersPage] 加载可添加成员失败:", error);
      message.error(
        extractApiErrorMessage(error, "加载可添加成员失败，请稍后重试"),
      );
    } finally {
      setCandidateSearching(false);
    }
  };

  const handleAddMember = async (values: AddMemberFormValues) => {
    setSubmitting(true);

    try {
      const usernames = Array.from(
        new Set(values.usernames.map((username) => username.trim()).filter(Boolean)),
      ).filter((username) => !currentMemberUsernameSet.has(username));

      if (usernames.length === 0) {
        message.warning("请至少选择一位可加入项目的用户");
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
            `${username}：${extractApiErrorMessage(error, "添加失败")}`,
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

      if (failedMessages.length === 0) {
        message.success(
          usernames.length === 1 ? "成员已加入项目" : `已添加 ${usernames.length} 位成员`,
        );
        return;
      }

      const successCount = usernames.length - failedMessages.length;
      if (successCount > 0) {
        message.warning(
          `已添加 ${successCount} 位成员，${failedMessages.length} 位失败：${failedMessages[0]}`,
        );
        return;
      }

      message.error(failedMessages[0] ?? "添加成员失败，请稍后重试");
    } catch (error) {
      console.error("[ProjectMembersPage] 添加成员失败:", error);
      message.error(
        extractApiErrorMessage(error, "添加成员失败，请稍后重试"),
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
      message.success("成员角色已更新");
    } catch (error) {
      console.error("[ProjectMembersPage] 更新成员角色失败:", error);
      message.error(
        extractApiErrorMessage(error, "更新成员角色失败，请稍后重试"),
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
        message.success("你已退出当前项目");
        navigate(
          nextProject ? buildProjectOverviewPath(nextProject.id) : PATHS.home,
        );
        return;
      }

      syncProject(result.project);
      message.success("成员已移出项目");
    } catch (error) {
      console.error("[ProjectMembersPage] 移除成员失败:", error);
      message.error(
        extractApiErrorMessage(error, "移除成员失败，请稍后重试"),
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
        label: "项目成员",
        value: `${activeProject.members.length} 位`,
        hint: "当前已加入正式后端项目的成员数量",
      },
      {
        label: "管理员",
        value: `${adminCount} 位`,
        hint: "具备项目级更新与成员管理权限",
      },
      {
        label: "普通成员",
        value: `${regularMemberCount} 位`,
        hint: "拥有项目访问权限，不具备管理权限",
      },
      {
        label: "我的权限",
        value: PROJECT_ROLE_LABELS[activeProject.currentUserRole],
        hint: "以当前登录账号在该项目中的正式角色为准",
      },
    ];
  }, [activeProject]);

  const canManageMembers = activeProject.currentUserRole === "admin";

  return (
    <section className="flex min-h-full flex-col gap-4">
      <Card
        className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
        styles={{ body: { padding: "22px 22px 20px" } }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              成员管理
            </Typography.Text>
            <Typography.Title level={3} className="mb-0! mt-2 text-slate-800!">
              当前项目的正式成员 roster
            </Typography.Title>
            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
              这里展示的是后端正式项目中的成员关系，只支持最小闭环：按用户名 / 姓名搜索已有用户、多选加入项目、修改
              `admin / member` 角色、移除成员。
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
                <Typography.Title
                  level={4}
                  className="mb-0! mt-2 text-slate-800!"
                >
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

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card
          className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
          styles={{ body: { padding: "20px" } }}
        >
          <div className="flex items-center gap-2">
            <UserAddOutlined className="text-slate-400" />
            <Typography.Title level={5} className="mb-0! text-slate-800!">
              添加已有用户
            </Typography.Title>
          </div>
          <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
            只允许把已注册用户加入当前项目，不引入邀请 token、邮件或外部通知链路。
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
                label="用户"
                rules={[
                  {
                    required: true,
                    type: "array",
                    min: 1,
                    message: "请至少选择一位要加入项目的用户",
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  placeholder="搜索用户名或姓名，例如：langya / 琅邪"
                  options={candidateOptions}
                  filterOption={false}
                  loading={candidateSearching}
                  notFoundContent={
                    candidateSearching
                      ? "搜索中..."
                      : searchKeyword.trim()
                        ? "没有找到可添加的用户"
                        : "输入用户名或姓名开始搜索"
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
                label="项目角色"
                rules={[{ required: true, message: "请选择项目角色" }]}
              >
                <Select
                  options={[
                    { value: "member", label: PROJECT_ROLE_LABELS.member },
                    { value: "admin", label: PROJECT_ROLE_LABELS.admin },
                  ]}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                block
              >
                添加成员
              </Button>
            </Form>
          ) : (
            <Alert
              className="mt-5"
              type="warning"
              showIcon
              message="当前账号不是项目 admin"
              description="你可以查看正式成员 roster，但不能添加、改角色或移除成员。"
            />
          )}
        </Card>

        <Card
          className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
          styles={{ body: { padding: "20px" } }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                正式成员列表
              </Typography.Text>
              <Typography.Title
                level={5}
                className="mb-0! mt-2 text-slate-800!"
              >
                当前项目已加入成员
              </Typography.Title>
            </div>
            <Typography.Text className="text-sm text-slate-400">
              项目：{activeProject.name}
            </Typography.Text>
          </div>

          {activeProject.members.length === 0 ? (
            <div className="mt-6">
              <Empty description="当前项目暂无正式成员" />
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
                    className="flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Typography.Text className="text-sm font-semibold text-slate-700">
                          {member.name}
                        </Typography.Text>
                        {isCurrentUser ? (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                            当前账号
                          </span>
                        ) : null}
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                          {PROJECT_ROLE_LABELS[member.role]}
                        </span>
                      </div>
                      <Typography.Text className="mt-2 block text-xs text-slate-400">
                        @{member.username}
                      </Typography.Text>
                      <Typography.Text className="mt-1 block text-xs text-slate-400">
                        加入时间：{formatDateTime(member.joinedAt)}
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
                            label: PROJECT_ROLE_LABELS.member,
                          },
                          { value: "admin", label: PROJECT_ROLE_LABELS.admin },
                        ]}
                        className="min-w-[120px]"
                      />

                      <Popconfirm
                        title="移除成员"
                        description={`确定将 ${member.name} 移出当前项目吗？`}
                        okText="移除"
                        cancelText="取消"
                        disabled={!canManageMembers}
                        onConfirm={() => void handleRemoveMember(member.userId)}
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          loading={removingUserId === member.userId}
                          disabled={!canManageMembers || actionLoading}
                        >
                          移除
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
