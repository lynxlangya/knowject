import { Alert, Button, Skeleton } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  PATHS,
  buildProjectSectionPath,
  getProjectSectionFromPathname,
} from '@app/navigation/paths';
import { useProjectContext } from '@app/project/useProjectContext';
import { ProjectHeader } from './components/ProjectHeader';
import { ProjectSectionNav } from './components/ProjectSectionNav';
import { getProjectWorkspaceSnapshot } from './projectWorkspaceSnapshot.mock';
import { useGlobalAssetCatalogs } from './useGlobalAssetCatalogs';
import { useProjectConversations } from './useProjectConversations';
import { useProjectKnowledgeCatalog } from './useProjectKnowledgeCatalog';

export const ProjectLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { getProjectById, loading, error, refreshProjects } = useProjectContext();
  const activeProject = projectId ? getProjectById(projectId) : null;
  const activeProjectId = activeProject?.id ?? null;
  const conversations = useProjectConversations(activeProjectId);
  const globalAssetCatalogs = useGlobalAssetCatalogs(activeProjectId);
  const projectKnowledge = useProjectKnowledgeCatalog(activeProjectId);

  if (!projectId) {
    return (
      <section className="h-full rounded-3xl border border-slate-200 bg-white p-6">
        <Alert
          type="warning"
          showIcon
          title="项目路由缺失"
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

  if (loading && !activeProject) {
    return (
      <section className="h-full rounded-3xl border border-slate-200 bg-white p-6">
        <Skeleton active paragraph={{ rows: 6 }} />
      </section>
    );
  }

  if (!activeProject) {
    return (
      <section className="h-full rounded-3xl border border-slate-200 bg-white p-6">
        <Alert
          type={error ? 'error' : 'warning'}
          showIcon
          title={error ? '项目列表加载失败' : '项目不存在或已被删除'}
          description={
            error ? '当前无法从后端同步项目列表，请稍后重试。' : '请从左侧“我的项目”重新选择。'
          }
          action={
            error ? (
              <Button size="small" onClick={() => void refreshProjects()}>
                重新加载
              </Button>
            ) : (
              <Button size="small" onClick={() => navigate(PATHS.home)}>
                返回主页
              </Button>
            )
          }
        />
      </section>
    );
  }

  const activeSection = getProjectSectionFromPathname(location.pathname);
  const isOverviewSection = activeSection === 'overview';
  const workspaceSnapshot = getProjectWorkspaceSnapshot(
    activeProject,
    conversations.items.length,
    {
      projectKnowledgeCount: projectKnowledge.items.length,
    },
  );

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
            conversations,
            globalAssetCatalogs,
            projectKnowledge,
          }}
        />
      </div>
    </section>
  );
};
