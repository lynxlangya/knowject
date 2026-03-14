import { isApiError } from '@knowject/request';
import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { listKnowledge, type KnowledgeSummaryResponse } from '@api/knowledge';
import {
  listProjectConversations,
  type ProjectConversationSummaryResponse,
} from '@api/projects';
import {
  PATHS,
  buildProjectSectionPath,
  getProjectSectionFromPathname,
} from '@app/navigation/paths';
import { useProjectContext } from '@app/project/useProjectContext';
import { ProjectHeader } from './components/ProjectHeader';
import { ProjectSectionNav } from './components/ProjectSectionNav';
import { getProjectWorkspaceSnapshot } from './project.mock';

const getLoadErrorMessage = (error: unknown, fallback: string): string => {
  return isApiError(error) ? error.message : fallback;
};

export const ProjectLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { getProjectById, loading, error, refreshProjects } = useProjectContext();
  const [conversations, setConversations] = useState<
    ProjectConversationSummaryResponse[]
  >([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [knowledgeCatalog, setKnowledgeCatalog] = useState<
    KnowledgeSummaryResponse[]
  >([]);
  const [knowledgeCatalogLoading, setKnowledgeCatalogLoading] = useState(false);
  const [knowledgeCatalogError, setKnowledgeCatalogError] = useState<string | null>(null);
  const activeProject = projectId ? getProjectById(projectId) : null;

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    let isMounted = true;

    const loadProjectPageData = async () => {
      setConversationsLoading(true);
      setKnowledgeCatalogLoading(true);

      const [conversationsResult, knowledgeResult] = await Promise.allSettled([
        listProjectConversations(activeProject.id),
        listKnowledge(),
      ]);

      if (!isMounted) {
        return;
      }

      if (conversationsResult.status === 'fulfilled') {
        setConversations(conversationsResult.value.items);
        setConversationsError(null);
      } else {
        console.error('加载项目对话失败', conversationsResult.reason);
        setConversations([]);
        setConversationsError(
          getLoadErrorMessage(
            conversationsResult.reason,
            '加载项目对话失败，请稍后重试。',
          ),
        );
      }

      if (knowledgeResult.status === 'fulfilled') {
        setKnowledgeCatalog(knowledgeResult.value.items);
        setKnowledgeCatalogError(null);
      } else {
        console.error('加载知识库目录失败', knowledgeResult.reason);
        setKnowledgeCatalog([]);
        setKnowledgeCatalogError(
          getLoadErrorMessage(
            knowledgeResult.reason,
            '加载知识库元数据失败，请稍后重试。',
          ),
        );
      }

      setConversationsLoading(false);
      setKnowledgeCatalogLoading(false);
    };

    void loadProjectPageData();

    return () => {
      isMounted = false;
    };
  }, [activeProject]);

  if (!projectId) {
    return (
      <section className="h-full rounded-[24px] border border-slate-200 bg-white p-6">
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
      <section className="h-full rounded-[24px] border border-slate-200 bg-white p-6">
        <Skeleton active paragraph={{ rows: 6 }} />
      </section>
    );
  }

  if (!activeProject) {
    return (
      <section className="h-full rounded-[24px] border border-slate-200 bg-white p-6">
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
    conversations.length,
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
            conversationsLoading,
            conversationsError,
            knowledgeCatalog,
            knowledgeCatalogLoading,
            knowledgeCatalogError,
          }}
        />
      </div>
    </section>
  );
};
