import { Alert, Button, Card, Empty, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  buildProjectChatPath,
  buildProjectMembersPath,
  buildProjectResourcesPath,
} from '@app/navigation/paths';
import { useProjectPageContext } from './projectPageContext';
import { getRecentProjectResources } from './projectResourceMappers';

export const ProjectOverviewPage = () => {
  const { t, i18n } = useTranslation('project');
  const navigate = useNavigate();
  const {
    activeProject,
    conversations,
    globalAssetCatalogs,
    projectKnowledge,
  } = useProjectPageContext();
  const recentConversations = conversations.items.slice(0, 3);
  const recentResources = getRecentProjectResources(activeProject, {
    knowledgeCatalog: globalAssetCatalogs.knowledge.items,
    projectKnowledgeCatalog: projectKnowledge.items,
    agentsCatalog: globalAssetCatalogs.agents.items,
    skillsCatalog: globalAssetCatalogs.skills.items,
  });
  const resourceTypeLabels = {
    knowledge: t('header.knowledge'),
    skills: t('header.skills'),
    agents: t('header.agents'),
  } as const;
  const formatConversationUpdatedAt = (value: string): string => {
    return new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-3">
        {conversations.error ? (
          <Alert
            type="warning"
            showIcon
            message={t('overview.partialLoad')}
            description={conversations.error}
          />
        ) : null}

        <Card
          className="rounded-3xl! border-slate-200! shadow-surface!"
          styles={{ body: { padding: '0' } }}
        >
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Typography.Text className="text-caption font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {t('overview.conversationsEyebrow')}
                  </Typography.Text>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-caption font-medium text-slate-500">
                    {t('overview.recentCount', { count: recentConversations.length })}
                  </span>
                </div>
                <Typography.Title level={4} className="mb-1! mt-0! text-slate-800!">
                  {t('overview.recentTitle')}
                </Typography.Title>
                <Typography.Text className="text-sm text-slate-500">
                  {t('overview.recentDescription')}
                </Typography.Text>
              </div>
              <Button
                className="h-10! rounded-full! border-slate-200! px-4! text-sm! font-medium! text-slate-600!"
                onClick={() => navigate(buildProjectChatPath(activeProject.id))}
              >
                {t('overview.viewAll')}
              </Button>
            </div>
          </div>

          {recentConversations.length > 0 ? (
            <div className="px-4 py-4">
              <div className="overflow-hidden rounded-card-lg border border-slate-200 bg-white">
                {recentConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="group w-full border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50/70"
                    onClick={() =>
                      navigate(buildProjectChatPath(activeProject.id, conversation.id))
                    }
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full bg-slate-300 transition-colors duration-200 group-hover:bg-emerald-400"
                            aria-hidden="true"
                          />
                          <Typography.Text className="text-caption font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {t('overview.recentActive')}
                          </Typography.Text>
                        </div>
                        <Typography.Text className="block truncate text-body font-semibold text-slate-800">
                          {conversation.title}
                        </Typography.Text>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-caption font-medium text-slate-500">
                        {formatConversationUpdatedAt(conversation.updatedAt)}
                      </span>
                    </div>
                    <Typography.Paragraph className="mb-0! text-label! leading-6! text-slate-500! [display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {conversation.preview}
                    </Typography.Paragraph>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="rounded-card-lg border border-dashed border-slate-200 bg-slate-50/40 px-6 py-10">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('overview.emptyConversations')}
                />
              </div>
            </div>
          )}
        </Card>

        <Card
          className="rounded-3xl! border-slate-200! shadow-surface!"
          styles={{ body: { padding: '20px 20px 20px' } }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <Typography.Title level={4} className="mb-1! text-slate-800!">
                {t('overview.resourcesTitle')}
              </Typography.Title>
              <Typography.Text className="text-sm text-slate-500">
                {t('overview.resourcesDescription')}
              </Typography.Text>
            </div>
            <Button onClick={() => navigate(buildProjectResourcesPath(activeProject.id))}>
              {t('overview.openResources')}
            </Button>
          </div>

          {recentResources.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {recentResources.map((resource) => (
                <article
                  key={resource.id}
                  className="rounded-card border border-slate-200 bg-slate-50/55 px-4 py-4"
                >
                  <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    {resourceTypeLabels[resource.type]}
                  </Typography.Text>
                  <Typography.Title level={5} className="mb-1! mt-2 text-slate-800!">
                    {resource.name}
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0! text-sm! text-slate-600!">
                    {resource.description}
                  </Typography.Paragraph>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('overview.emptyResources')}
            />
          )}
        </Card>
      </div>

      <Card
        className="self-start rounded-3xl! border-slate-200! shadow-surface!"
        styles={{ body: { padding: '20px 20px 20px' } }}
      >
        <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {t('overview.quickActionsEyebrow')}
        </Typography.Text>
        <Typography.Title level={3} className="mb-2! mt-3 text-slate-800!">
          {t('overview.quickActionsTitle')}
        </Typography.Title>
        <Typography.Paragraph className="mb-6! text-sm! text-slate-600!">
          {t('overview.quickActionsDescription')}
        </Typography.Paragraph>

        <div className="flex flex-col gap-3">
          <Button
            block
            type="primary"
            size="large"
            className="h-12! rounded-panel! text-base! font-semibold!"
            onClick={() =>
              navigate(buildProjectChatPath(activeProject.id, recentConversations[0]?.id))
            }
          >
            {t('overview.continueChat')}
          </Button>
          <Button
            block
            size="large"
            className="h-12! rounded-panel! text-base! font-medium!"
            onClick={() => navigate(buildProjectResourcesPath(activeProject.id))}
          >
            {t('overview.addResources')}
          </Button>
          <Button
            block
            size="large"
            className="h-12! rounded-panel! text-base! font-medium!"
            onClick={() => navigate(buildProjectMembersPath(activeProject.id))}
          >
            {t('overview.viewMembers')}
          </Button>
        </div>
      </Card>
    </section>
  );
};
