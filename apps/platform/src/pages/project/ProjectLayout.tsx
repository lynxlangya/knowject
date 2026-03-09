import { Alert, Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  PATHS,
  buildProjectChatPath,
  buildProjectMembersPath,
  buildProjectOverviewPath,
  buildProjectResourcesPath,
} from '../../app/navigation/paths';
import type { ProjectSectionKey } from '../../app/project/project.types';
import { useProjectContext } from '../../app/project/useProjectContext';
import { ProjectHeader } from './components/ProjectHeader';
import { ProjectSectionNav } from './components/ProjectSectionNav';
import { getProjectMembers, getProjectMeta, getProjectOverviewStats } from './project.mock';

const resolveSectionByPathname = (pathname: string): ProjectSectionKey => {
  if (pathname.includes('/resources')) {
    return 'resources';
  }

  if (pathname.includes('/members')) {
    return 'members';
  }

  if (pathname.includes('/chat')) {
    return 'chat';
  }

  return 'overview';
};

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

  const activeSection = resolveSectionByPathname(location.pathname);
  const isOverviewSection = activeSection === 'overview';
  const projectInitial = (activeProject.name.trim().slice(0, 1) || 'P').toUpperCase();
  const members = getProjectMembers(activeProject);
  const meta = getProjectMeta(activeProject.id);
  const stats = getProjectOverviewStats(activeProject);

  const handleSelectSection = (section: ProjectSectionKey) => {
    if (section === 'overview') {
      navigate(buildProjectOverviewPath(activeProject.id));
      return;
    }

    if (section === 'chat') {
      navigate(buildProjectChatPath(activeProject.id));
      return;
    }

    if (section === 'resources') {
      navigate(buildProjectResourcesPath(activeProject.id));
      return;
    }

    navigate(buildProjectMembersPath(activeProject.id));
  };

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div
        aria-hidden={!isOverviewSection}
        data-state={isOverviewSection ? 'expanded' : 'collapsed'}
        className="project-header-shell"
      >
        <ProjectHeader project={activeProject} members={members} meta={meta} stats={stats} />
      </div>
      <ProjectSectionNav
        activeKey={activeSection}
        overviewProjectInitial={projectInitial}
        onSelect={handleSelectSection}
      />
      <div className={`project-layout-outlet ${isOverviewSection ? '' : 'project-page-surface-enter'}`}>
        <Outlet
          context={{
            activeProject,
            members,
            meta,
            stats,
          }}
        />
      </div>
    </section>
  );
};
