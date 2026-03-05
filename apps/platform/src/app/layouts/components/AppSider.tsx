import { useMemo, useState } from 'react';
import { LogoutOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Layout, Menu, Modal, Select, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { SIDER_WIDTH } from '../layout.constants';
import { getMenuPath, menuItems } from '../../navigation/menu';
import { buildProjectPath } from '../../navigation/paths';
import { useProjectContext } from '../../project/ProjectContext';
import {
  PROJECT_AGENT_OPTIONS,
  PROJECT_KNOWLEDGE_OPTIONS,
  PROJECT_MEMBER_OPTIONS,
  PROJECT_SKILL_OPTIONS,
} from '../../project/project.create.mock';

const { Sider } = Layout;

export interface AppSiderProps {
  selectedKey: string | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const getActiveProjectIdFromPath = (pathname: string): string | null => {
  const match = pathname.match(/^\/project\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

interface ProjectCreateFormValues {
  name: string;
  knowledgeBaseIds?: string[];
  memberIds?: string[];
  agentIds?: string[];
  skillIds?: string[];
}

export const AppSider = ({ selectedKey, onNavigate, onLogout }: AppSiderProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<ProjectCreateFormValues>();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, addProject } = useProjectContext();
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const activeProjectId = useMemo(() => {
    return getActiveProjectIdFromPath(location.pathname);
  }, [location.pathname]);

  const handleCreateProject = (values: ProjectCreateFormValues) => {
    const result = addProject({
      name: values.name,
      knowledgeBaseIds: values.knowledgeBaseIds ?? [],
      memberIds: values.memberIds ?? [],
      agentIds: values.agentIds ?? [],
      skillIds: values.skillIds ?? [],
    });

    if (result === 'empty') {
      message.warning('请输入项目名称');
      return;
    }

    if (result === 'duplicate') {
      message.warning('项目名称已存在，请更换后重试');
      return;
    }

    setProjectModalOpen(false);
    form.resetFields();
    message.success('项目已添加到“我的项目”');
  };

  const handleOpenProjectModal = () => {
    setProjectModalOpen(true);
  };

  const handleCloseProjectModal = () => {
    setProjectModalOpen(false);
    form.resetFields();
  };

  const handleOpenProject = (projectId: string) => {
    navigate(buildProjectPath(projectId));
  };

  return (
    <Sider
      width={SIDER_WIDTH}
      trigger={null}
      style={{ background: '#f3f6fb', borderRight: '1px solid #dfe6ef' }}
      className="h-full"
    >
      <div className="flex h-full flex-col px-4 py-5">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-start gap-2.5">
            <img
              src="/favicon.png"
              alt="知项图标"
              className="mt-0.5 h-8 w-8 object-contain"
            />
            <div className="min-w-0">
              <Typography.Title level={5} className="mb-0! text-[17px]! leading-tight! text-slate-900!">
                知项 · Knowject
              </Typography.Title>
              <Typography.Text className="block text-[12px]! leading-[1.4]! text-slate-500!">
                让项目知识，真正为团队所用。
              </Typography.Text>
            </div>
          </div>
        </div>

        <div className="pt-3">
          <Menu
            mode="inline"
            theme="light"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={menuItems}
            onClick={({ key }) => onNavigate(getMenuPath(String(key)))}
            style={{ borderInlineEnd: 'none', background: 'transparent', paddingInline: 0 }}
          />
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-slate-200 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <Typography.Title level={4} className="mb-0! text-slate-500!">
              我的项目
            </Typography.Title>
            <button
              type="button"
              aria-label="添加项目"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
              onClick={handleOpenProjectModal}
            >
              <PlusOutlined />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            {projects.length === 0 ? (
              <Typography.Text className="text-xs text-slate-400">暂无项目，可先添加一个。</Typography.Text>
            ) : (
              <div className="space-y-1">
                {projects.map((project) => {
                  const active = project.id === activeProjectId;

                  return (
                    <button
                      key={project.id}
                      type="button"
                      className={[
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-700 hover:bg-white',
                      ].join(' ')}
                      onClick={() => handleOpenProject(project.id)}
                    >
                      <span
                        className={[
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                          active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600',
                        ].join(' ')}
                      >
                        {(project.name.trim().charAt(0) || 'P').toUpperCase()}
                      </span>
                      <span className="truncate">{project.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto border-t border-slate-200 pt-3">
          <Button
            block
            type="text"
            icon={<LogoutOutlined />}
            onClick={onLogout}
            className="text-slate-600! hover:bg-white/70! hover:text-slate-900!"
          >
            退出登录
          </Button>
        </div>
      </div>

      <Modal
        title="创建项目"
        open={projectModalOpen}
        onCancel={handleCloseProjectModal}
        onOk={() => form.submit()}
        okText="创建项目"
        cancelText="取消"
        destroyOnHidden
      >
        <Form<ProjectCreateFormValues> form={form} layout="vertical" onFinish={handleCreateProject}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, whitespace: true, message: '请输入项目名称' }]}
          >
            <Input maxLength={40} placeholder="例如：移动端应用重构" />
          </Form.Item>

          <Form.Item name="knowledgeBaseIds" label="选择现有知识库">
            <Select
              mode="multiple"
              allowClear
              placeholder="可选"
              options={PROJECT_KNOWLEDGE_OPTIONS}
            />
          </Form.Item>

          <Form.Item name="memberIds" label="成员">
            <Select mode="multiple" allowClear placeholder="可选" options={PROJECT_MEMBER_OPTIONS} />
          </Form.Item>

          <Form.Item name="agentIds" label="智能体">
            <Select mode="multiple" allowClear placeholder="可选" options={PROJECT_AGENT_OPTIONS} />
          </Form.Item>

          <Form.Item name="skillIds" label="技能">
            <Select mode="multiple" allowClear placeholder="可选" options={PROJECT_SKILL_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </Sider>
  );
};
