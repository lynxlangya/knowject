import { Alert, Button, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('project');
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
          title={t('layout.missingRouteTitle')}
          description={t('layout.missingRouteDescription')}
          action={
            <Button size="small" onClick={() => navigate(PATHS.home)}>
              {t('layout.backHome')}
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
          title={error ? t('layout.loadFailedTitle') : t('layout.missingProjectTitle')}
          description={
            error ? t('layout.loadFailedDescription') : t('layout.missingProjectDescription')
          }
          action={
            error ? (
              <Button size="small" onClick={() => void refreshProjects()}>
                {t('layout.reload')}
              </Button>
            ) : (
              <Button size="small" onClick={() => navigate(PATHS.home)}>
                {t('layout.backHome')}
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
