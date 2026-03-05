import { useMemo, useState } from 'react';
import { LogoutOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Input, Layout, Menu, Space, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { SIDER_WIDTH } from '../layout.constants';
import { getMenuPath, menuItems } from '../../navigation/menu';
import { buildProjectPath } from '../../navigation/paths';
import { useProjectContext } from '../../project/ProjectContext';

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

export const AppSider = ({ selectedKey, onNavigate, onLogout }: AppSiderProps) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, addProject } = useProjectContext();
  const [projectName, setProjectName] = useState('');

  const activeProjectId = useMemo(() => {
    return getActiveProjectIdFromPath(location.pathname);
  }, [location.pathname]);

  const handleAddProject = () => {
    const result = addProject(projectName);

    if (result === 'empty') {
      message.warning('请输入项目名称');
      return;
    }

    if (result === 'duplicate') {
      message.warning('项目名称已存在，请更换后重试');
      return;
    }

    setProjectName('');
    message.success('项目已添加到“我的项目”');
  };

  const handleOpenProject = (projectId: string) => {
    navigate(buildProjectPath(projectId));
  };

  return (
    <Sider
      width={SIDER_WIDTH}
      trigger={null}
      style={{ background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}
      className="h-full"
    >
      <div className="flex h-full flex-col px-4 py-4">
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-start gap-2.5">
            <img
              src="/icon-128.png"
              alt="知项图标"
              className="mt-0.5 h-8 w-8 rounded-md border border-slate-200 object-cover"
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

        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <Typography.Text className="text-xs font-semibold tracking-wide text-slate-500">
              我的项目
            </Typography.Text>
            <Typography.Text className="text-[11px] text-slate-400">{projects.length}</Typography.Text>
          </div>

          <Space.Compact style={{ width: '100%', marginBottom: 10 }}>
            <Input
              size="small"
              value={projectName}
              placeholder="输入项目名称"
              maxLength={40}
              onChange={(event) => setProjectName(event.target.value)}
              onPressEnter={handleAddProject}
            />
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAddProject} />
          </Space.Compact>

          <div className="max-h-[calc(100vh-430px)] overflow-y-auto pr-0.5">
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
                          : 'text-slate-700 hover:bg-slate-100',
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
            className="text-slate-600! hover:text-slate-900!"
          >
            退出登录
          </Button>
        </div>
      </div>
    </Sider>
  );
};
