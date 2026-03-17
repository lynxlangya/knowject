import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { listAgents, type AgentResponse } from '@api/agents';
import { extractApiErrorMessage } from '@api/error';
import {
  listKnowledge,
  listProjectKnowledge,
  type KnowledgeSummaryResponse,
} from '@api/knowledge';
import { listSkills, type SkillSummaryResponse } from '@api/skills';
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

const PROJECT_KNOWLEDGE_POLLING_MAX_ATTEMPTS = 20;
const PROJECT_KNOWLEDGE_POLLING_INTERVAL_MS = 1500;

const hasProjectKnowledgeInFlight = (
  items: KnowledgeSummaryResponse[],
): boolean => {
  return items.some(
    (knowledge) =>
      knowledge.indexStatus === 'pending' ||
      knowledge.indexStatus === 'processing',
  );
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
  const conversationsProjectIdRef = useRef<string | null>(null);
  const [knowledgeCatalog, setKnowledgeCatalog] = useState<
    KnowledgeSummaryResponse[]
  >([]);
  const [knowledgeCatalogLoading, setKnowledgeCatalogLoading] = useState(false);
  const [knowledgeCatalogError, setKnowledgeCatalogError] = useState<string | null>(null);
  const [projectKnowledgeCatalog, setProjectKnowledgeCatalog] = useState<
    KnowledgeSummaryResponse[]
  >([]);
  const [projectKnowledgeLoading, setProjectKnowledgeLoading] = useState(false);
  const [projectKnowledgeError, setProjectKnowledgeError] = useState<string | null>(
    null,
  );
  const [projectKnowledgeReloadToken, setProjectKnowledgeReloadToken] = useState(0);
  const projectKnowledgePollingAttemptsRef = useRef<Record<string, number>>({});
  const projectKnowledgeCatalogProjectIdRef = useRef<string | null>(null);
  const [agentsCatalog, setAgentsCatalog] = useState<AgentResponse[]>([]);
  const [agentsCatalogLoading, setAgentsCatalogLoading] = useState(false);
  const [agentsCatalogError, setAgentsCatalogError] = useState<string | null>(null);
  const [skillsCatalog, setSkillsCatalog] = useState<SkillSummaryResponse[]>([]);
  const [skillsCatalogLoading, setSkillsCatalogLoading] = useState(false);
  const [skillsCatalogError, setSkillsCatalogError] = useState<string | null>(null);
  const activeProject = projectId ? getProjectById(projectId) : null;
  const activeProjectId = activeProject?.id ?? null;
  const latestActiveProjectIdRef = useRef<string | null>(activeProjectId);
  latestActiveProjectIdRef.current = activeProjectId;
  const scopedConversations = activeProjectId
    ? conversations.filter((conversation) => conversation.projectId === activeProjectId)
    : [];
  const shouldPollProjectKnowledge = hasProjectKnowledgeInFlight(
    projectKnowledgeCatalog,
  );
  const refreshConversations = async () => {
    const requestProjectId = activeProject?.id ?? null;

    if (!requestProjectId) {
      setConversations([]);
      setConversationsError(null);
      setConversationsLoading(false);
      conversationsProjectIdRef.current = null;
      return;
    }

    if (latestActiveProjectIdRef.current !== requestProjectId) {
      return;
    }

    setConversationsLoading(true);

    try {
      const result = await listProjectConversations(requestProjectId);

      if (latestActiveProjectIdRef.current !== requestProjectId) {
        return;
      }

      setConversations(result.items);
      conversationsProjectIdRef.current = requestProjectId;
      setConversationsError(null);
    } catch (currentError) {
      if (latestActiveProjectIdRef.current !== requestProjectId) {
        return;
      }

      console.error('[ProjectLayout] 加载项目对话失败:', currentError);
      if (conversationsProjectIdRef.current !== requestProjectId) {
        setConversations([]);
      }
      setConversationsError(
        extractApiErrorMessage(
          currentError,
          '加载项目对话失败，请稍后重试。',
        ),
      );
    } finally {
      if (latestActiveProjectIdRef.current === requestProjectId) {
        setConversationsLoading(false);
      }
    }
  };
  const refreshProjectKnowledge = () => {
    if (activeProjectId) {
      projectKnowledgePollingAttemptsRef.current[activeProjectId] = 0;
    }

    setProjectKnowledgeReloadToken((value) => value + 1);
  };

  useEffect(() => {
    if (!activeProject) {
      setConversations([]);
      setConversationsError(null);
      setConversationsLoading(false);
      conversationsProjectIdRef.current = null;
      return;
    }

    const projectChanged = conversationsProjectIdRef.current !== activeProject.id;

    if (projectChanged) {
      setConversations([]);
      setConversationsError(null);
    }

    let isMounted = true;

    const loadConversations = async () => {
      setConversationsLoading(true);

      try {
        const result = await listProjectConversations(activeProject.id);

        if (!isMounted) {
          return;
        }

        setConversations(result.items);
        conversationsProjectIdRef.current = activeProject.id;
        setConversationsError(null);
      } catch (currentError) {
        if (!isMounted) {
          return;
        }

        console.error('[ProjectLayout] 加载项目对话失败:', currentError);
        if (conversationsProjectIdRef.current !== activeProject.id) {
          setConversations([]);
        }
        setConversationsError(
          extractApiErrorMessage(
            currentError,
            '加载项目对话失败，请稍后重试。',
          ),
        );
      } finally {
        if (isMounted) {
          setConversationsLoading(false);
        }
      }
    };

    void loadConversations();

    return () => {
      isMounted = false;
    };
  }, [activeProject]);

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    let isMounted = true;

    const loadProjectCatalogs = async () => {
      setKnowledgeCatalogLoading(true);
      setAgentsCatalogLoading(true);
      setSkillsCatalogLoading(true);

      const [knowledgeResult, agentsResult, skillsResult] = await Promise.allSettled([
        listKnowledge(),
        listAgents(),
        listSkills(),
      ]);

      if (!isMounted) {
        return;
      }

      if (knowledgeResult.status === 'fulfilled') {
        setKnowledgeCatalog(knowledgeResult.value.items);
        setKnowledgeCatalogError(null);
      } else {
        console.error(
          '[ProjectLayout] 加载知识库目录失败:',
          knowledgeResult.reason,
        );
        setKnowledgeCatalog([]);
        setKnowledgeCatalogError(
          extractApiErrorMessage(
            knowledgeResult.reason,
            '加载知识库元数据失败，请稍后重试。',
          ),
        );
      }

      if (agentsResult.status === 'fulfilled') {
        setAgentsCatalog(agentsResult.value.items);
        setAgentsCatalogError(null);
      } else {
        console.error(
          '[ProjectLayout] 加载 Agent 目录失败:',
          agentsResult.reason,
        );
        setAgentsCatalog([]);
        setAgentsCatalogError(
          extractApiErrorMessage(
            agentsResult.reason,
            '加载 Agent 元数据失败，请稍后重试。',
          ),
        );
      }

      if (skillsResult.status === 'fulfilled') {
        setSkillsCatalog(skillsResult.value.items);
        setSkillsCatalogError(null);
      } else {
        console.error(
          '[ProjectLayout] 加载 Skill 目录失败:',
          skillsResult.reason,
        );
        setSkillsCatalog([]);
        setSkillsCatalogError(
          extractApiErrorMessage(
            skillsResult.reason,
            '加载 Skill 元数据失败，请稍后重试。',
          ),
        );
      }

      setKnowledgeCatalogLoading(false);
      setAgentsCatalogLoading(false);
      setSkillsCatalogLoading(false);
    };

    void loadProjectCatalogs();

    return () => {
      isMounted = false;
    };
  }, [activeProject]);

  useEffect(() => {
    if (!activeProject) {
      setProjectKnowledgeCatalog([]);
      setProjectKnowledgeError(null);
      setProjectKnowledgeLoading(false);
      projectKnowledgeCatalogProjectIdRef.current = null;
      return;
    }

    const projectChanged =
      projectKnowledgeCatalogProjectIdRef.current !== activeProject.id;

    if (projectChanged) {
      setProjectKnowledgeCatalog([]);
      setProjectKnowledgeError(null);
    }

    let isMounted = true;

    const loadProjectKnowledge = async () => {
      setProjectKnowledgeLoading(true);

      try {
        const result = await listProjectKnowledge(activeProject.id);

        if (!isMounted) {
          return;
        }

        setProjectKnowledgeCatalog(result.items);
        projectKnowledgeCatalogProjectIdRef.current = activeProject.id;
        setProjectKnowledgeError(null);
      } catch (currentError) {
        if (!isMounted) {
          return;
        }

        console.error(
          '[ProjectLayout] 加载项目私有知识失败:',
          currentError,
        );
        if (projectKnowledgeCatalogProjectIdRef.current !== activeProject.id) {
          setProjectKnowledgeCatalog([]);
        }
        setProjectKnowledgeError(
          extractApiErrorMessage(
            currentError,
            '加载项目私有知识失败，请稍后重试。',
          ),
        );
      } finally {
        if (isMounted) {
          setProjectKnowledgeLoading(false);
        }
      }
    };

    void loadProjectKnowledge();

    return () => {
      isMounted = false;
    };
  }, [activeProject, projectKnowledgeReloadToken]);

  useEffect(() => {
    if (!activeProjectId) {
      return;
    }

    if (!shouldPollProjectKnowledge) {
      projectKnowledgePollingAttemptsRef.current[activeProjectId] = 0;
      return;
    }

    if (projectKnowledgeLoading) {
      return;
    }

    const attempts =
      projectKnowledgePollingAttemptsRef.current[activeProjectId] ?? 0;

    if (attempts >= PROJECT_KNOWLEDGE_POLLING_MAX_ATTEMPTS) {
      return;
    }

    const timer = window.setTimeout(() => {
      projectKnowledgePollingAttemptsRef.current[activeProjectId] =
        attempts + 1;
      setProjectKnowledgeReloadToken((value) => value + 1);
    }, PROJECT_KNOWLEDGE_POLLING_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeProjectId, projectKnowledgeLoading, shouldPollProjectKnowledge]);

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
    scopedConversations.length,
    {
      projectKnowledgeCount: projectKnowledgeCatalog.length,
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
            conversations: scopedConversations,
            conversationsLoading,
            conversationsError,
            refreshConversations,
            knowledgeCatalog,
            knowledgeCatalogLoading,
            knowledgeCatalogError,
            projectKnowledgeCatalog,
            projectKnowledgeLoading,
            projectKnowledgeError,
            refreshProjectKnowledge,
            agentsCatalog,
            agentsCatalogLoading,
            agentsCatalogError,
            skillsCatalog,
            skillsCatalogLoading,
            skillsCatalogError,
          }}
        />
      </div>
    </section>
  );
};
