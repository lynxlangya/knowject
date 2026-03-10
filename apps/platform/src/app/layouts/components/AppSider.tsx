import { useEffect, useState } from 'react';
import {
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  InboxOutlined,
  LogoutOutlined,
  PlusOutlined,
  PushpinOutlined,
  ShareAltOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  App,
  Dropdown,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Popover,
  Select,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { KNOWJECT_BRAND } from '@styles/brand';
import { getMenuPath, menuItems } from '@app/navigation/menu';
import {
  PATHS,
  buildProjectOverviewPath,
  getProjectIdFromPathname,
} from '@app/navigation/paths';
import { getAuthUser } from '@app/auth/user';
import {
  GLOBAL_AGENT_OPTIONS,
  GLOBAL_KNOWLEDGE_OPTIONS,
  GLOBAL_MEMBER_OPTIONS,
  GLOBAL_SKILL_OPTIONS,
} from '@app/project/project.catalog';
import type { ProjectSummary } from '@app/project/project.types';
import { useProjectContext } from '@app/project/useProjectContext';
import { SIDER_WIDTH } from '@app/layouts/layout.constants';

const { Sider } = Layout;

export interface AppSiderProps {
  selectedKey: string | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

interface ProjectFormValues {
  name: string;
  description?: string;
  knowledgeBaseIds?: string[];
  memberIds?: string[];
  agentIds?: string[];
  skillIds?: string[];
}

const toProjectFormValues = (project: ProjectSummary): ProjectFormValues => ({
  name: project.name,
  description: project.description,
  knowledgeBaseIds: project.knowledgeBaseIds,
  memberIds: project.memberIds,
  agentIds: project.agentIds,
  skillIds: project.skillIds,
});

export const AppSider = ({ selectedKey, onNavigate, onLogout }: AppSiderProps) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<ProjectFormValues>();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, addProject, updateProject, toggleProjectPin, deleteProject } = useProjectContext();
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [actionMenuOpenProjectId, setActionMenuOpenProjectId] = useState<string | null>(null);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const activeProjectId = getProjectIdFromPathname(location.pathname);
  const authUser = getAuthUser();
  const editingProject = editingProjectId
    ? projects.find((project) => project.id === editingProjectId) ?? null
    : null;

  const isEditing = editingProject !== null;
  const accountPrimary = authUser?.username || authUser?.name || 'current@knowject.ai';
  const accountSecondary =
    authUser?.name && authUser.name !== accountPrimary ? authUser.name : '当前登录账号';
  const accountAvatar = (authUser?.name || authUser?.username || 'K').trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!projectModalOpen) {
      return;
    }

    if (editingProject) {
      form.setFieldsValue(toProjectFormValues(editingProject));
      return;
    }

    form.resetFields();
  }, [editingProject, form, projectModalOpen]);

  const handleOpenProject = (projectId: string) => {
    navigate(buildProjectOverviewPath(projectId));
  };

  const handleOpenProjectModal = () => {
    setEditingProjectId(null);
    setActionMenuOpenProjectId(null);
    form.resetFields();
    setProjectModalOpen(true);
  };

  const handleOpenEditProject = (project: ProjectSummary) => {
    setEditingProjectId(project.id);
    setActionMenuOpenProjectId(null);
    setProjectModalOpen(true);
  };

  const handleCloseProjectModal = () => {
    setProjectModalOpen(false);
    setEditingProjectId(null);
    form.resetFields();
  };

  const handleSubmitProject = (values: ProjectFormValues) => {
    const nextValues = {
      name: values.name,
      description: values.description?.trim() ?? '',
      knowledgeBaseIds: values.knowledgeBaseIds ?? [],
      memberIds: values.memberIds ?? [],
      agentIds: values.agentIds ?? [],
      skillIds: values.skillIds ?? [],
    };

    if (editingProjectId) {
      const result = updateProject({
        projectId: editingProjectId,
        ...nextValues,
      });

      if (result === 'empty') {
        message.warning('请输入项目名称');
        return;
      }

      if (result === 'duplicate') {
        message.warning('项目名称已存在，请更换后重试');
        return;
      }

      if (result === 'not_found') {
        message.warning('项目不存在或已被删除');
        handleCloseProjectModal();
        return;
      }

      message.success('项目已更新');
      handleCloseProjectModal();
      return;
    }

    const result = addProject(nextValues);
    if (result === 'empty') {
      message.warning('请输入项目名称');
      return;
    }

    if (result === 'duplicate') {
      message.warning('项目名称已存在，请更换后重试');
      return;
    }

    message.success('项目已添加到“我的项目”');
    handleCloseProjectModal();
  };

  const handleToggleProjectPin = (project: ProjectSummary) => {
    const result = toggleProjectPin(project.id);
    setActionMenuOpenProjectId(null);

    if (result === 'not_found') {
      message.warning('项目不存在或已被删除');
      return;
    }

    if (result === 'pinned') {
      message.success(`已置顶「${project.name}」`);
      return;
    }

    message.success(`已取消置顶「${project.name}」`);
  };

  const handleDeleteProject = (project: ProjectSummary) => {
    setActionMenuOpenProjectId(null);

    const remainingProjects = projects.filter((item) => item.id !== project.id);

    modal.confirm({
      title: '删除项目',
      content: `确定删除「${project.name}」吗？此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        const result = deleteProject(project.id);

        if (result === 'not_found') {
          message.warning('项目不存在或已被删除');
          return;
        }

        message.success(`已删除「${project.name}」`);

        if (project.id !== activeProjectId) {
          return;
        }

        if (remainingProjects[0]) {
          navigate(buildProjectOverviewPath(remainingProjects[0].id));
          return;
        }

        navigate(PATHS.home);
      },
    });
  };

  const getProjectActionItems = (project: ProjectSummary): MenuProps['items'] => [
    {
      key: 'share',
      icon: <ShareAltOutlined />,
      label: '分享',
      disabled: true,
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
    },
    {
      key: 'pin',
      icon: <PushpinOutlined />,
      label: project.isPinned ? '取消置顶' : '置顶',
    },
    {
      key: 'archive',
      icon: <InboxOutlined />,
      label: '归档',
      disabled: true,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
    },
  ];

  const handleProjectActionClick = (project: ProjectSummary, key: string) => {
    if (key === 'edit') {
      handleOpenEditProject(project);
      return;
    }

    if (key === 'pin') {
      handleToggleProjectPin(project);
      return;
    }

    if (key === 'delete') {
      handleDeleteProject(project);
    }
  };

  const accountPanelContent = (
    <div className="w-68 rounded-[20px] p-2">
      <div className="flex items-center gap-3 rounded-[16px] px-2.5 py-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] text-[14px] font-semibold text-white"
          style={{
            backgroundImage: KNOWJECT_BRAND.heroGradient,
            boxShadow: `0 8px 14px ${KNOWJECT_BRAND.primaryGlow}`,
          }}
        >
          {accountAvatar}
        </div>
        <div className="min-w-0">
          <Typography.Text className="block truncate text-[13px] font-semibold text-slate-800">
            {accountPrimary}
          </Typography.Text>
          <Typography.Text className="block truncate text-[11px] text-slate-500">
            {accountSecondary}
          </Typography.Text>
        </div>
      </div>

      <div className="mx-2 my-1.5 h-px bg-slate-200/80" />

      <button
        type="button"
        className="flex h-10 w-full items-center gap-3 rounded-[14px] px-3 text-left text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        onClick={() => {
          setAccountPanelOpen(false);
          onNavigate(PATHS.settings);
        }}
      >
        <SettingOutlined className="text-[15px]" />
        <span className="text-[14px] font-medium">设置</span>
      </button>

      <div className="mx-2 my-1.5 h-px bg-slate-200/80" />

      <button
        type="button"
        className="flex h-10 w-full items-center gap-3 rounded-[14px] px-3 text-left text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        onClick={() => {
          setAccountPanelOpen(false);
          onLogout();
        }}
      >
        <LogoutOutlined className="text-[15px]" />
        <span className="text-[14px] font-medium">退出登录</span>
      </button>
    </div>
  );

  return (
    <Sider
      width={SIDER_WIDTH}
      trigger={null}
      style={{
        background: KNOWJECT_BRAND.shellBg,
        borderRight: `1px solid ${KNOWJECT_BRAND.shellBorder}`,
      }}
      className="h-full"
    >
      <div className="flex h-full flex-col px-4 py-4">
        <div
          className="rounded-[26px] border px-4 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.035)]"
          style={{
            borderColor: 'rgba(255,255,255,0.72)',
            background: KNOWJECT_BRAND.shellSurfaceStrong,
          }}
        >
          <div className="flex justify-center">
            <img
              src="/brand/knowject-wordmark.svg"
              alt="Knowject"
              className="mx-auto h-12 w-auto object-contain"
            />
          </div>
        </div>

        <div
          className="mt-4 rounded-[26px] border p-2"
          style={{
            borderColor: 'rgba(255,255,255,0.68)',
            background: KNOWJECT_BRAND.shellSurface,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          <Menu
            mode="inline"
            theme="light"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={menuItems}
            onClick={({ key }) => onNavigate(getMenuPath(String(key)))}
            style={{ borderInlineEnd: 'none', background: 'transparent', paddingInline: 0 }}
            className={[
              '[&_.ant-menu-item]:mx-0',
              '[&_.ant-menu-item]:my-1',
              '[&_.ant-menu-item]:px-3',
              '[&_.ant-menu-item]:text-[14px]',
              '[&_.ant-menu-item]:font-medium',
              '[&_.ant-menu-item_.ant-menu-title-content]:tracking-[0.01em]',
              '[&_.ant-menu-item-selected]:shadow-[0_10px_18px_rgba(27,80,183,0.10)]',
              '[&_.ant-menu-item_.anticon]:text-[15px]',
            ].join(' ')}
          />
        </div>

        <div
          className="mt-4 mb-[14px] flex min-h-0 flex-1 flex-col rounded-[26px] border p-3"
          style={{
            borderColor: 'rgba(255,255,255,0.68)',
            background: KNOWJECT_BRAND.shellSurface,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <Typography.Text className="text-sm font-semibold tracking-[0.08em] text-slate-600">
              我的项目
            </Typography.Text>
            <button
              type="button"
              aria-label="添加项目"
              className="flex h-9 w-9 items-center justify-center rounded-[14px] border text-slate-600 transition-all duration-200 hover:-translate-y-px hover:text-slate-900"
              style={{
                borderColor: 'rgba(255,255,255,0.72)',
                background: KNOWJECT_BRAND.shellSurfaceStrong,
              }}
              onClick={handleOpenProjectModal}
            >
              <PlusOutlined />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            {projects.length === 0 ? (
              <Typography.Text className="px-2 text-xs text-slate-500">
                暂无项目，可先添加一个。
              </Typography.Text>
            ) : (
              <div className="space-y-1.5">
                {projects.map((project) => {
                  const active = project.id === activeProjectId;
                  const actionMenuOpen = actionMenuOpenProjectId === project.id;

                  return (
                    <div key={project.id} className="group relative">
                      <button
                        type="button"
                        className={[
                          'flex w-full items-center gap-3 rounded-[16px] border px-3 py-2.5 pr-14 text-left text-[13px] transition-all duration-200',
                          active
                            ? 'text-slate-900 shadow-[0_10px_18px_rgba(27,80,183,0.10)]'
                            : 'text-slate-600 hover:-translate-y-px hover:text-slate-900',
                        ].join(' ')}
                        style={
                          active
                            ? {
                                borderColor: KNOWJECT_BRAND.primaryBorder,
                                background: KNOWJECT_BRAND.shellSurfaceStrong,
                              }
                            : {
                                borderColor: 'transparent',
                                background: 'transparent',
                              }
                        }
                        onClick={() => handleOpenProject(project.id)}
                      >
                        <span
                          className={[
                            'flex h-8 w-8 shrink-0 items-center justify-center text-[12px] font-semibold',
                            active || project.isPinned
                              ? 'rounded-[14px] border text-white'
                              : 'rounded-[12px] bg-slate-200/90 text-slate-600',
                          ].join(' ')}
                          style={
                            active || project.isPinned
                              ? {
                                  borderColor: KNOWJECT_BRAND.primaryBorder,
                                  backgroundImage: KNOWJECT_BRAND.heroGradient,
                                  boxShadow: `0 10px 18px ${KNOWJECT_BRAND.primaryGlow}`,
                                }
                              : undefined
                          }
                        >
                          {(project.name.trim().charAt(0) || 'P').toUpperCase()}
                        </span>
                        <span className="truncate font-medium">{project.name}</span>
                      </button>

                      <Dropdown
                        trigger={['click']}
                        placement="bottomRight"
                        open={actionMenuOpen}
                        onOpenChange={(open) => {
                          setActionMenuOpenProjectId(open ? project.id : null);
                        }}
                        menu={{
                          items: getProjectActionItems(project),
                          onClick: ({ key, domEvent }) => {
                            domEvent.stopPropagation();
                            handleProjectActionClick(project, String(key));
                          },
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`${project.name} 的项目操作`}
                          className={[
                            'absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[12px] border text-slate-500 transition-all duration-200',
                            'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto',
                            'group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:pointer-events-auto',
                            actionMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : '',
                          ].join(' ')}
                          style={{
                            borderColor: 'rgba(255,255,255,0.78)',
                            background: KNOWJECT_BRAND.shellSurfaceStrong,
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <EllipsisOutlined />
                        </button>
                      </Dropdown>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Popover
          open={accountPanelOpen}
          onOpenChange={setAccountPanelOpen}
          placement="top"
          trigger="click"
          content={accountPanelContent}
          arrow={false}
          styles={{
            container: {
              padding: 0,
              borderRadius: 20,
              background: KNOWJECT_BRAND.shellSurfaceStrong,
              border: '1px solid rgba(255,255,255,0.72)',
              boxShadow: '0 18px 36px rgba(15,42,38,0.08)',
              backdropFilter: 'blur(18px)',
            },
          }}
        >
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 rounded-[16px] border px-3 text-left text-slate-700 transition-all duration-200 hover:-translate-y-px hover:border-slate-200 hover:bg-white/92 hover:text-slate-900 hover:shadow-[0_12px_24px_rgba(15,42,38,0.06)] active:translate-y-0 active:bg-white"
            style={{
              borderColor: 'rgba(255,255,255,0.72)',
              background: KNOWJECT_BRAND.shellSurfaceStrong,
              boxShadow: '0 10px 24px rgba(15,42,38,0.03)',
            }}
          >
            <SettingOutlined className="shrink-0 text-[16px] text-slate-500" />
            <span className="text-[13px] font-semibold">设置</span>
          </button>
        </Popover>
      </div>

      <Modal
        title={isEditing ? '编辑项目' : '创建项目'}
        open={projectModalOpen}
        onCancel={handleCloseProjectModal}
        onOk={() => form.submit()}
        okText={isEditing ? '保存修改' : '创建项目'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form<ProjectFormValues> form={form} layout="vertical" onFinish={handleSubmitProject}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, whitespace: true, message: '请输入项目名称' }]}
          >
            <Input maxLength={40} placeholder="例如：移动端应用重构" />
          </Form.Item>

          <Form.Item name="description" label="项目说明">
            <Input.TextArea
              maxLength={160}
              showCount
              autoSize={{ minRows: 3, maxRows: 5 }}
              placeholder="补充项目目标、当前阶段或协作重点"
            />
          </Form.Item>

          <Form.Item name="knowledgeBaseIds" label="选择现有知识库">
            <Select
              mode="multiple"
              allowClear
              placeholder="可选"
              options={GLOBAL_KNOWLEDGE_OPTIONS}
            />
          </Form.Item>

          <Form.Item name="memberIds" label="成员">
            <Select mode="multiple" allowClear placeholder="可选" options={GLOBAL_MEMBER_OPTIONS} />
          </Form.Item>

          <Form.Item name="agentIds" label="智能体">
            <Select mode="multiple" allowClear placeholder="可选" options={GLOBAL_AGENT_OPTIONS} />
          </Form.Item>

          <Form.Item name="skillIds" label="技能">
            <Select mode="multiple" allowClear placeholder="可选" options={GLOBAL_SKILL_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </Sider>
  );
};
