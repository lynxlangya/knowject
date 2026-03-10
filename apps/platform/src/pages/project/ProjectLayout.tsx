import { Alert, Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  PATHS,
  buildProjectSectionPath,
  getProjectSectionFromPathname,
} from '@app/navigation/paths';
import { useProjectContext } from '@app/project/useProjectContext';
import { ProjectHeader } from './components/ProjectHeader';
import { ProjectSectionNav } from './components/ProjectSectionNav';
import { getProjectWorkspaceSnapshot } from './project.mock';

export const ProjectLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { getProjectById } = useProjectContext();

  if (!projectId) {
    return (
      <section className="h-full rounded-[24px] border border-slate-200 bg-white p-6">
        <Alert
          type="warning"
          showIcon
          message="项目路由缺失"
          description="未识别到 projectId，请返回主页重新选择项目。"
          action={
            <Button size="small" onClick={() => navigate(PATHS.home)}>
              返回主页
            </Button>
          }
        />
      </section>
    );
  }

  const activeProject = getProjectById(projectId);

  if (!activeProject) {
    return (
      <section className="h-full rounded-[24px] border border-slate-200 bg-white p-6">
        <Alert
          type="warning"
          showIcon
          message="项目不存在或已被删除"
          description="请从左侧“我的项目”重新选择。"
          action={
            <Button size="small" onClick={() => navigate(PATHS.home)}>
              返回主页
            </Button>
          }
        />
      </section>
    );
  }

  const activeSection = getProjectSectionFromPathname(location.pathname);
  const isOverviewSection = activeSection === 'overview';
  const workspaceSnapshot = getProjectWorkspaceSnapshot(activeProject);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div
        aria-hidden={!isOverviewSection}
        data-state={isOverviewSection ? 'expanded' : 'collapsed'}
        className="project-header-shell"
      >
        <ProjectHeader
          project={activeProject}
          members={workspaceSnapshot.members}
          meta={workspaceSnapshot.meta}
          stats={workspaceSnapshot.stats}
        />
      </div>
      <ProjectSectionNav
        activeKey={activeSection}
        onSelect={(section) => navigate(buildProjectSectionPath(activeProject.id, section))}
      />
      <div className={`project-layout-outlet ${isOverviewSection ? '' : 'project-page-surface-enter'}`}>
        <Outlet
          context={{
            activeProject,
            ...workspaceSnapshot,
          }}
        />
      </div>
    </section>
  );
};
