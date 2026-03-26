import { Alert } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OverviewActivityChart } from './components/overview/OverviewActivityChart';
import { OverviewInsightList } from './components/overview/OverviewInsightList';
import { OverviewKnowledgeHealthCard } from './components/overview/OverviewKnowledgeHealthCard';
import { OverviewMetricStrip } from './components/overview/OverviewMetricStrip';
import { useProjectPageContext } from './projectPageContext';
import { buildProjectOverviewSummary } from './projectOverview.adapter';
import { buildProjectOverviewInsights } from './projectOverview.insights';
import { resolveProjectOverviewSummaryItems } from './projectOverviewPage.helpers';

export const ProjectOverviewPage = () => {
  const { t, i18n } = useTranslation('project');
  const { activeProject, conversations, globalAssetCatalogs, projectKnowledge } =
    useProjectPageContext();
  const locale = i18n.resolvedLanguage || 'en';
  const requiresBoundGlobalKnowledge = activeProject.knowledgeBaseIds.length > 0;
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

  const boundKnowledge = useMemo(() => {
    if (!requiresBoundGlobalKnowledge) {
      return [];
    }

    const globalKnowledgeItems = resolveProjectOverviewSummaryItems({
      loading: globalAssetCatalogs.knowledge.loading,
      error: globalAssetCatalogs.knowledge.error,
      items: globalAssetCatalogs.knowledge.items,
    });

    if (!globalKnowledgeItems) {
      return undefined;
    }

    const boundKnowledgeIdSet = new Set(activeProject.knowledgeBaseIds);

    return globalKnowledgeItems.filter((item) => boundKnowledgeIdSet.has(item.id));
  }, [
    activeProject.knowledgeBaseIds,
    globalAssetCatalogs.knowledge.loading,
    globalAssetCatalogs.knowledge.error,
    globalAssetCatalogs.knowledge.items,
    requiresBoundGlobalKnowledge,
  ]);

  const overviewSummary = useMemo(() => {
    return buildProjectOverviewSummary({
      project: activeProject,
      conversations: resolveProjectOverviewSummaryItems({
        loading: conversations.loading,
        error: conversations.error,
        items: conversations.items,
      }),
      boundKnowledge,
      projectKnowledge: resolveProjectOverviewSummaryItems({
        loading: projectKnowledge.loading,
        error: projectKnowledge.error,
        items: projectKnowledge.items,
      }),
    });
  }, [
    activeProject,
    conversations.loading,
    conversations.error,
    conversations.items,
    boundKnowledge,
    projectKnowledge.loading,
    projectKnowledge.error,
    projectKnowledge.items,
  ]);

  const overviewInsights = useMemo(() => {
    return buildProjectOverviewInsights(overviewSummary);
  }, [overviewSummary]);

  const partialLoadErrors = [
    conversations.error,
    requiresBoundGlobalKnowledge ? globalAssetCatalogs.knowledge.error : null,
    projectKnowledge.error,
  ].filter((value): value is string => Boolean(value));

  const totalResourceCount =
    overviewSummary.coverage.knowledge +
    overviewSummary.coverage.skills +
    overviewSummary.coverage.agents;
  const indexedCount = overviewSummary.knowledge.statusBreakdown.completed;
  const readinessBaseCount = overviewSummary.knowledge.totalKnowledgeCount;
  const hasKnowledgeReadinessRate =
    overviewSummary.knowledge.available && readinessBaseCount > 0;
  const indexingRate = hasKnowledgeReadinessRate
    ? Math.round((indexedCount / readinessBaseCount) * 100)
    : null;

  const knowledgeStateLabel = !overviewSummary.knowledge.available
    ? t('overview.states.unavailable')
    : overviewSummary.knowledge.statusBreakdown.failed > 0
      ? t('overview.states.requiresAttention')
      : overviewSummary.knowledge.statusBreakdown.pending +
            overviewSummary.knowledge.statusBreakdown.processing >
          0
        ? t('overview.states.syncing')
        : t('overview.states.healthy');

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
            value: overviewSummary.activity.available
              ? String(overviewSummary.activity.activeConversationCount7d)
              : '—',
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
            value: overviewSummary.knowledge.available
              ? String(overviewSummary.knowledge.totalKnowledgeCount)
              : '—',
            hint: overviewSummary.knowledge.available
              ? readinessBaseCount > 0
                ? t('overview.summary.hints.indexReady', {
                    completed: overviewSummary.knowledge.statusBreakdown.completed,
                    total: readinessBaseCount,
                  })
                : t('overview.states.unavailable')
              : t('overview.states.unavailable'),
            tone: !overviewSummary.knowledge.available
              ? 'warning'
              : overviewSummary.knowledge.statusBreakdown.failed > 0
                ? 'warning'
                : 'positive',
          },
          {
            id: 'documents-total',
            label: t('overview.summary.metrics.documents'),
            value: overviewSummary.knowledge.available
              ? String(overviewSummary.knowledge.knowledgeDocumentCount)
              : '—',
            hint: overviewSummary.knowledge.available
              ? t('overview.summary.hints.knowledgeWithDocuments', {
                  count: overviewSummary.knowledge.knowledgeWithDocumentsCount,
                })
              : t('overview.states.unavailable'),
            tone: !overviewSummary.knowledge.available
              ? 'warning'
              : overviewSummary.knowledge.knowledgeDocumentCount > 0
                ? 'positive'
                : 'warning',
          },
          {
            id: 'resource-coverage',
            label: t('overview.summary.metrics.resourceCoverage'),
            value: overviewSummary.knowledge.available ? String(totalResourceCount) : '—',
            hint: overviewSummary.knowledge.available
              ? t('overview.summary.hints.coverageMix', {
                  knowledge: overviewSummary.coverage.knowledge,
                  skills: overviewSummary.coverage.skills,
                  agents: overviewSummary.coverage.agents,
                })
              : t('overview.states.unavailable'),
            tone: !overviewSummary.knowledge.available
              ? 'warning'
              : totalResourceCount > 0
                ? 'default'
                : 'warning',
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3 mb-4">
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
          statsAvailable={overviewSummary.activity.available}
        />
        <OverviewKnowledgeHealthCard
          title={t('overview.knowledge.title')}
          description={t('overview.knowledge.description')}
          stateLabel={knowledgeStateLabel}
          knowledgeTotalLabel={t('overview.knowledge.metrics.total')}
          knowledgeTotalValue={
            overviewSummary.knowledge.available
              ? String(overviewSummary.knowledge.totalKnowledgeCount)
              : '—'
          }
          documentTotalLabel={t('overview.knowledge.metrics.documents')}
          documentTotalValue={
            overviewSummary.knowledge.available
              ? String(overviewSummary.knowledge.knowledgeDocumentCount)
              : '—'
          }
          indexedLabel={t('overview.knowledge.metrics.indexed')}
          indexedValue={overviewSummary.knowledge.available ? String(indexedCount) : '—'}
          indexingRateLabel={t('overview.knowledge.metrics.rate')}
          indexingRateValue={indexingRate === null ? '—' : `${indexingRate}%`}
          indexingProgressPercent={indexingRate}
          statusItems={[
            {
              id: 'completed',
              label: t('overview.knowledge.status.completed'),
              value: overviewSummary.knowledge.available
                ? overviewSummary.knowledge.statusBreakdown.completed
                : '—',
              tone: 'positive',
            },
            {
              id: 'processing',
              label: t('overview.knowledge.status.processing'),
              value: overviewSummary.knowledge.available
                ? overviewSummary.knowledge.statusBreakdown.processing
                : '—',
              tone: 'neutral',
            },
            {
              id: 'pending',
              label: t('overview.knowledge.status.pending'),
              value: overviewSummary.knowledge.available
                ? overviewSummary.knowledge.statusBreakdown.pending
                : '—',
              tone: 'warning',
            },
            {
              id: 'failed',
              label: t('overview.knowledge.status.failed'),
              value: overviewSummary.knowledge.available
                ? overviewSummary.knowledge.statusBreakdown.failed
                : '—',
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
    </section>
  );
};
