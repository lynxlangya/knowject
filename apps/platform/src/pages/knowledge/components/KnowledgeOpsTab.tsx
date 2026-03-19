import { DatabaseOutlined, ReloadOutlined, ToolOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Spin, Tag, Tooltip, Typography } from 'antd';
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
  return (
    <section className="overflow-hidden rounded-card-lg border border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(241,245,249,0.88))] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ToolOutlined className="text-slate-400" />
            <Typography.Title level={5} className="mb-0! text-slate-800!">
              索引运维
            </Typography.Title>
          </div>
          <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-500!">
            查看当前 collection、indexer 与文档健康快照，并在这里发起最小 rebuild。
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
                重建全部文档
              </Button>
            </span>
          </Tooltip>
          <Button
            icon={<ReloadOutlined />}
            loading={diagnosticsLoading}
            onClick={onReloadDiagnostics}
          >
            刷新诊断
          </Button>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {diagnosticsError ? (
          <Alert
            type="warning"
            showIcon
            title="诊断信息暂时不可用"
            description={diagnosticsError}
          />
        ) : activeDiagnostics ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: '待处理文档',
                  value: `${activeDiagnostics.documentSummary.pending + activeDiagnostics.documentSummary.processing}`,
                  accent: 'text-sky-700',
                },
                {
                  label: '失败文档',
                  value: `${activeDiagnostics.documentSummary.failed}`,
                  accent:
                    activeDiagnostics.documentSummary.failed > 0
                      ? 'text-rose-700'
                      : 'text-slate-700',
                },
                {
                  label: '原文件缺失',
                  value: `${activeDiagnostics.documentSummary.missingStorage}`,
                  accent:
                    activeDiagnostics.documentSummary.missingStorage > 0
                      ? 'text-amber-700'
                      : 'text-slate-700',
                },
                {
                  label: '处理卡住',
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
                Indexer · {activeDiagnostics.indexer.status === 'ok' ? '运行正常' : '降级'}
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
                title="Collection 检查已降级"
                description={activeDiagnostics.collection.errorMessage}
              />
            ) : null}

            {activeDiagnostics.indexer.errorMessage ? (
              <Alert
                type="warning"
                showIcon
                title="Indexer 运行态已降级"
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
                title="检测到需要人工处理的文档"
                description={`失败 ${activeDiagnostics.documentSummary.failed} 份，原文件缺失 ${activeDiagnostics.documentSummary.missingStorage} 份，处理卡住 ${activeDiagnostics.documentSummary.staleProcessing} 份。`}
              />
            ) : (
              <Alert
                type="success"
                showIcon
                title="当前未发现阻塞性风险"
                description={`Indexer ${
                  activeDiagnostics.indexer.service ?? 'unknown'
                } 已返回最新诊断，当前 collection 目标为 ${activeDiagnostics.expectedCollectionName}。`}
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
