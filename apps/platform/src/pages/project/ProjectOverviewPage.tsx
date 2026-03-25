import { Alert } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OverviewActivityChart } from './components/overview/OverviewActivityChart';
import { OverviewInsightList } from './components/overview/OverviewInsightList';
import { OverviewKnowledgeHealthCard } from './components/overview/OverviewKnowledgeHealthCard';
import { OverviewMetricStrip } from './components/overview/OverviewMetricStrip';
import { OverviewResourceCoverageCard } from './components/overview/OverviewResourceCoverageCard';
import { useProjectPageContext } from './projectPageContext';
import { buildProjectOverviewSummary } from './projectOverview.adapter';
import { buildProjectOverviewInsights } from './projectOverview.insights';

export const ProjectOverviewPage = () => {
  const { t, i18n } = useTranslation('project');
  const { activeProject, conversations, projectKnowledge } = useProjectPageContext();
  const locale = i18n.resolvedLanguage || 'en';
  const formatDateTime = (value: string): string => {
    return new Intl.DateTimeFormat(locale, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  };
  const formatUtcWeekday = (value: string): string => {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00.000Z`));
  };
  const formatUtcDate = (value: string): string => {
    return new Intl.DateTimeFormat(locale, {
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00.000Z`));
  };

  const overviewSummary = useMemo(() => {
    return buildProjectOverviewSummary({
      project: activeProject,
      conversations: conversations.error ? undefined : conversations.items,
      projectKnowledge: projectKnowledge.error ? undefined : projectKnowledge.items,
    });
  }, [
    activeProject,
    conversations.error,
    conversations.items,
    projectKnowledge.error,
    projectKnowledge.items,
  ]);

  const overviewInsights = useMemo(() => {
    return buildProjectOverviewInsights(overviewSummary);
  }, [overviewSummary]);

  const partialLoadErrors = [conversations.error, projectKnowledge.error].filter(
    (value): value is string => Boolean(value),
  );

  const totalResourceCount =
    overviewSummary.coverage.knowledge +
    overviewSummary.coverage.skills +
    overviewSummary.coverage.agents;
  const indexedCount = overviewSummary.knowledge.statusBreakdown.completed;
  const indexingRate = overviewSummary.knowledge.totalKnowledgeCount
    ? Math.round((indexedCount / overviewSummary.knowledge.totalKnowledgeCount) * 100)
    : 0;

  const knowledgeStateLabel = !overviewSummary.knowledge.available
    ? t('overview.states.unavailable')
    : overviewSummary.knowledge.statusBreakdown.failed > 0
      ? t('overview.states.requiresAttention')
      : overviewSummary.knowledge.statusBreakdown.pending +
            overviewSummary.knowledge.statusBreakdown.processing >
          0
        ? t('overview.states.syncing')
        : t('overview.states.healthy');

  const coverageStateLabel = totalResourceCount === 0
    ? t('overview.states.noResources')
    : overviewSummary.coverage.skills === 0 || overviewSummary.coverage.agents === 0
      ? t('overview.states.partialCoverage')
      : t('overview.states.ready');

  return (
    <section className="flex flex-col gap-4">
      {partialLoadErrors.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          message={t('overview.states.partialLoadTitle')}
          description={partialLoadErrors.join(' | ')}
        />
      ) : null}

      <OverviewMetricStrip
        eyebrow={t('overview.summary.eyebrow')}
        title={t('overview.summary.title')}
        description={t('overview.summary.description')}
        items={[
          {
            id: 'active-conversations',
            label: t('overview.summary.metrics.activeConversations'),
            value: String(overviewSummary.activity.activeConversationCount7d),
            hint: overviewSummary.activity.available
              ? overviewSummary.activity.lastConversationActivityAt
                ? t('overview.summary.hints.lastActivity', {
                    value: formatDateTime(overviewSummary.activity.lastConversationActivityAt),
                  })
                : t('overview.states.noActivity')
              : t('overview.states.unavailable'),
            tone: overviewSummary.activity.available ? 'default' : 'warning',
          },
          {
            id: 'knowledge-total',
            label: t('overview.summary.metrics.knowledgeTotal'),
            value: String(overviewSummary.knowledge.totalKnowledgeCount),
            hint: overviewSummary.knowledge.available
              ? t('overview.summary.hints.indexReady', {
                  completed: overviewSummary.knowledge.statusBreakdown.completed,
                  total: overviewSummary.knowledge.totalKnowledgeCount,
                })
              : t('overview.states.unavailable'),
            tone: overviewSummary.knowledge.statusBreakdown.failed > 0 ? 'warning' : 'positive',
          },
          {
            id: 'documents-total',
            label: t('overview.summary.metrics.documents'),
            value: String(overviewSummary.knowledge.knowledgeDocumentCount),
            hint: t('overview.summary.hints.knowledgeWithDocuments', {
              count: overviewSummary.knowledge.knowledgeWithDocumentsCount,
            }),
            tone: overviewSummary.knowledge.knowledgeDocumentCount > 0 ? 'positive' : 'warning',
          },
          {
            id: 'resource-coverage',
            label: t('overview.summary.metrics.resourceCoverage'),
            value: String(totalResourceCount),
            hint: t('overview.summary.hints.coverageMix', {
              knowledge: overviewSummary.coverage.knowledge,
              skills: overviewSummary.coverage.skills,
              agents: overviewSummary.coverage.agents,
            }),
            tone: totalResourceCount > 0 ? 'default' : 'warning',
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <OverviewActivityChart
          title={t('overview.activity.title')}
          description={t('overview.activity.description')}
          points={
            overviewSummary.activity.available
              ? overviewSummary.activity.trend7d.map((bucket) => ({
                  id: bucket.date,
                  label: formatUtcWeekday(bucket.date),
                  tooltip: formatUtcDate(bucket.date),
                  value: bucket.count,
                }))
              : []
          }
          avgLabel={t('overview.activity.avg')}
          peakLabel={t('overview.activity.peak')}
          emptyLabel={t('overview.states.unavailable')}
        />
        <OverviewKnowledgeHealthCard
          title={t('overview.knowledge.title')}
          description={t('overview.knowledge.description')}
          stateLabel={knowledgeStateLabel}
          knowledgeTotalLabel={t('overview.knowledge.metrics.total')}
          knowledgeTotalValue={String(overviewSummary.knowledge.totalKnowledgeCount)}
          documentTotalLabel={t('overview.knowledge.metrics.documents')}
          documentTotalValue={String(overviewSummary.knowledge.knowledgeDocumentCount)}
          indexedLabel={t('overview.knowledge.metrics.indexed')}
          indexedValue={String(indexedCount)}
          indexingRateLabel={t('overview.knowledge.metrics.rate')}
          indexingRateValue={`${indexingRate}%`}
          indexingProgressPercent={indexingRate}
          statusItems={[
            {
              id: 'completed',
              label: t('overview.knowledge.status.completed'),
              value: overviewSummary.knowledge.statusBreakdown.completed,
              tone: 'positive',
            },
            {
              id: 'processing',
              label: t('overview.knowledge.status.processing'),
              value: overviewSummary.knowledge.statusBreakdown.processing,
              tone: 'neutral',
            },
            {
              id: 'pending',
              label: t('overview.knowledge.status.pending'),
              value: overviewSummary.knowledge.statusBreakdown.pending,
              tone: 'warning',
            },
            {
              id: 'failed',
              label: t('overview.knowledge.status.failed'),
              value: overviewSummary.knowledge.statusBreakdown.failed,
              tone: 'risk',
            },
          ]}
        />
        <OverviewInsightList
          title={t('overview.insights.title')}
          description={t('overview.insights.description')}
          emptyLabel={t('overview.insights.empty')}
          items={overviewInsights.map((insight) => ({
            id: insight.id,
            level: insight.level,
            levelLabel: t(`overview.insights.levels.${insight.level}`),
            title: t(`overview.insights.items.${insight.id}.title`),
            description: t(`overview.insights.items.${insight.id}.description`),
          }))}
        />
      </div>

      <OverviewResourceCoverageCard
        title={t('overview.coverage.title')}
        description={t('overview.coverage.description')}
        stateLabel={coverageStateLabel}
        totalLabel={t('overview.coverage.total')}
        totalValue={String(totalResourceCount)}
        items={[
          {
            id: 'knowledge',
            label: t('overview.coverage.items.knowledge'),
            value: overviewSummary.coverage.knowledge,
            share: Math.round((overviewSummary.coverage.knowledge / Math.max(totalResourceCount, 1)) * 100),
          },
          {
            id: 'skills',
            label: t('overview.coverage.items.skills'),
            value: overviewSummary.coverage.skills,
            share: Math.round((overviewSummary.coverage.skills / Math.max(totalResourceCount, 1)) * 100),
          },
          {
            id: 'agents',
            label: t('overview.coverage.items.agents'),
            value: overviewSummary.coverage.agents,
            share: Math.round((overviewSummary.coverage.agents / Math.max(totalResourceCount, 1)) * 100),
          },
        ]}
      />
    </section>
  );
};
