import { DatabaseOutlined, ReloadOutlined, ToolOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Spin, Tag, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { KnowledgeDiagnosticsResponse } from '@api/knowledge';
import { KNOWLEDGE_REBUILD_TOOLTIP } from '../knowledgeDomain.shared';

interface KnowledgeOpsTabProps {
  activeKnowledgeId: string;
  activeDiagnostics: KnowledgeDiagnosticsResponse | null;
  diagnosticsLoading: boolean;
  diagnosticsError: string | null;
  knowledgeRebuildBlockedReason: string | null;
  rebuildingKnowledgeId: string | null;
  onRebuildKnowledge: () => Promise<void>;
  onReloadDiagnostics: () => void;
}

export const KnowledgeOpsTab = ({
  activeKnowledgeId,
  activeDiagnostics,
  diagnosticsLoading,
  diagnosticsError,
  knowledgeRebuildBlockedReason,
  rebuildingKnowledgeId,
  onRebuildKnowledge,
  onReloadDiagnostics,
}: KnowledgeOpsTabProps) => {
  const { t } = useTranslation('pages');

  return (
    <section className="overflow-hidden rounded-card-lg border border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(241,245,249,0.88))] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ToolOutlined className="text-slate-400" />
            <Typography.Title level={5} className="mb-0! text-slate-800!">
              {t('knowledge.ops.title')}
            </Typography.Title>
          </div>
          <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-500!">
            {t('knowledge.ops.description')}
          </Typography.Paragraph>
        </div>

        <div className="flex flex-wrap gap-2">
          <Tooltip title={knowledgeRebuildBlockedReason ?? KNOWLEDGE_REBUILD_TOOLTIP}>
            <span>
              <Button
                icon={<ToolOutlined />}
                loading={rebuildingKnowledgeId === activeKnowledgeId}
                disabled={Boolean(knowledgeRebuildBlockedReason)}
                onClick={() => void onRebuildKnowledge()}
              >
                {t('knowledge.ops.rebuildAll')}
              </Button>
            </span>
          </Tooltip>
          <Button
            icon={<ReloadOutlined />}
            loading={diagnosticsLoading}
            onClick={onReloadDiagnostics}
          >
            {t('knowledge.ops.reloadDiagnostics')}
          </Button>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {diagnosticsError ? (
          <Alert
            type="warning"
            showIcon
            title={t('knowledge.ops.unavailable')}
            description={diagnosticsError}
          />
        ) : activeDiagnostics ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: t('knowledge.ops.pendingDocuments'),
                  value: `${activeDiagnostics.documentSummary.pending + activeDiagnostics.documentSummary.processing}`,
                  accent: 'text-sky-700',
                },
                {
                  label: t('knowledge.ops.failedDocuments'),
                  value: `${activeDiagnostics.documentSummary.failed}`,
                  accent:
                    activeDiagnostics.documentSummary.failed > 0
                      ? 'text-rose-700'
                      : 'text-slate-700',
                },
                {
                  label: t('knowledge.ops.missingStorage'),
                  value: `${activeDiagnostics.documentSummary.missingStorage}`,
                  accent:
                    activeDiagnostics.documentSummary.missingStorage > 0
                      ? 'text-amber-700'
                      : 'text-slate-700',
                },
                {
                  label: t('knowledge.ops.staleProcessing'),
                  value: `${activeDiagnostics.documentSummary.staleProcessing}`,
                  accent:
                    activeDiagnostics.documentSummary.staleProcessing > 0
                      ? 'text-amber-700'
                      : 'text-slate-700',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-4"
                >
                  <Typography.Text className="text-caption font-medium uppercase tracking-[0.14em] text-slate-400">
                    {item.label}
                  </Typography.Text>
                  <Typography.Text
                    className={`mt-3 block text-[28px] font-semibold leading-none tracking-tight ${item.accent}`}
                  >
                    {item.value}
                  </Typography.Text>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Tag
                color={activeDiagnostics.collection.exists ? 'success' : 'error'}
              >
                Collection · {activeDiagnostics.collection.name}
              </Tag>
              <Tag
                color={
                  activeDiagnostics.indexer.status === 'ok' ? 'success' : 'warning'
                }
              >
                Indexer · {activeDiagnostics.indexer.status === 'ok'
                  ? t('knowledge.ops.indexerOk')
                  : t('knowledge.ops.indexerDegraded')}
              </Tag>
              {activeDiagnostics.indexer.embeddingProvider ? (
                <Tag color="blue">
                  Embedding · {activeDiagnostics.indexer.embeddingProvider}
                </Tag>
              ) : null}
              {activeDiagnostics.indexer.chunkSize !== null &&
              activeDiagnostics.indexer.chunkOverlap !== null ? (
                <Tag color="default">
                  Chunk · {activeDiagnostics.indexer.chunkSize} /{' '}
                  {activeDiagnostics.indexer.chunkOverlap}
                </Tag>
              ) : null}
            </div>

            {activeDiagnostics.collection.errorMessage ? (
              <Alert
                type="warning"
                showIcon
                icon={<DatabaseOutlined />}
                title={t('knowledge.ops.collectionDegraded')}
                description={activeDiagnostics.collection.errorMessage}
              />
            ) : null}

            {activeDiagnostics.indexer.errorMessage ? (
              <Alert
                type="warning"
                showIcon
                title={t('knowledge.ops.indexerDegradedTitle')}
                description={activeDiagnostics.indexer.errorMessage}
              />
            ) : null}

            {activeDiagnostics.documentSummary.failed > 0 ||
            activeDiagnostics.documentSummary.missingStorage > 0 ||
            activeDiagnostics.documentSummary.staleProcessing > 0 ? (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                title={t('knowledge.ops.manualAttention')}
                description={t('knowledge.ops.manualAttentionDescription', {
                  failed: activeDiagnostics.documentSummary.failed,
                  missingStorage: activeDiagnostics.documentSummary.missingStorage,
                  staleProcessing: activeDiagnostics.documentSummary.staleProcessing,
                })}
              />
            ) : (
              <Alert
                type="success"
                showIcon
                title={t('knowledge.ops.healthyTitle')}
                description={t('knowledge.ops.healthyDescription', {
                  service: activeDiagnostics.indexer.service ?? 'unknown',
                  collection: activeDiagnostics.expectedCollectionName,
                })}
              />
            )}
          </>
        ) : (
          <div className="flex min-h-30 items-center justify-center">
            <Spin size="large" />
          </div>
        )}
      </div>
    </section>
  );
};
