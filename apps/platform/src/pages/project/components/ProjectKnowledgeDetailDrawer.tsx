import {
  CloudUploadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  LinkOutlined,
  MoreOutlined,
  ReloadOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type {
  KnowledgeDetailResponse,
  KnowledgeDiagnosticsResponse,
  KnowledgeDocumentResponse,
} from "@api/knowledge";
import {
  Alert,
  App,
  Button,
  Drawer,
  Dropdown,
  Empty,
  Skeleton,
  Spin,
  Tag,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import type { ProjectResourceItem } from "@app/project/project.types";
import {
  buildKnowledgeDocumentActionMenuItems,
  buildKnowledgeDetailOverviewStats,
  formatKnowledgeDateTime,
  KNOWLEDGE_DOCUMENT_STATUS_META,
  KNOWLEDGE_INDEX_STATUS_META,
} from "@pages/knowledge/knowledgeDomain.shared";
import { KnowledgeSearchTab } from "@pages/knowledge/components/KnowledgeSearchTab";
import { tp } from "../project.i18n";

interface ProjectKnowledgeDetailDrawerProps {
  open: boolean;
  knowledgeItem: ProjectResourceItem | null;
  knowledge: KnowledgeDetailResponse | null;
  loading: boolean;
  error: string | null;
  diagnostics: KnowledgeDiagnosticsResponse | null;
  diagnosticsLoading: boolean;
  diagnosticsError: string | null;
  uploading: boolean;
  unbindingGlobal: boolean;
  deletingKnowledge: boolean;
  rebuildingKnowledge: boolean;
  isDocumentBusy: (documentId: string) => boolean;
  onClose: () => void;
  onRefresh: () => void;
  onUploadDocument: () => void;
  onEditKnowledge: () => void;
  onDeleteKnowledge: () => void;
  onRebuildKnowledge: () => void;
  onUnbindGlobalKnowledge: () => void;
  onOpenGlobalManagement: () => void;
  onRefreshDiagnostics: () => void;
  onRetryDocument: (document: KnowledgeDocumentResponse) => void;
  onRebuildDocument: (document: KnowledgeDocumentResponse) => void;
  onDeleteDocument: (document: KnowledgeDocumentResponse) => void;
}

export const ProjectKnowledgeDetailDrawer = ({
  open,
  knowledgeItem,
  knowledge,
  loading,
  error,
  diagnostics,
  diagnosticsLoading,
  diagnosticsError,
  uploading,
  unbindingGlobal,
  deletingKnowledge,
  rebuildingKnowledge,
  isDocumentBusy,
  onClose,
  onRefresh,
  onUploadDocument,
  onEditKnowledge,
  onDeleteKnowledge,
  onRebuildKnowledge,
  onUnbindGlobalKnowledge,
  onOpenGlobalManagement,
  onRefreshDiagnostics,
  onRetryDocument,
  onRebuildDocument,
  onDeleteDocument,
}: ProjectKnowledgeDetailDrawerProps) => {
  const { message } = App.useApp();
  const readOnlyGlobal = knowledgeItem?.source === "global";

  const buildDocumentActionMenuItems = (
    document: KnowledgeDocumentResponse,
  ): NonNullable<MenuProps["items"]> => {
    return buildKnowledgeDocumentActionMenuItems(
      document,
      isDocumentBusy(document.id),
    );
  };

  const handleDocumentMenuAction = (
    document: KnowledgeDocumentResponse,
    key: string,
  ) => {
    if (key === "preview") {
      message.info(tp('resources.detail.previewSoon', { name: document.fileName }));
      return;
    }

    if (key === "download") {
      message.info(tp('resources.detail.downloadSoon', { name: document.fileName }));
      return;
    }

    if (key === "refresh") {
      onRefresh();
      return;
    }

    if (key === "retry") {
      onRetryDocument(document);
      return;
    }

    if (key === "rebuild") {
      onRebuildDocument(document);
      return;
    }

    if (key === "delete") {
      onDeleteDocument(document);
    }
  };

  const renderDocumentCard = (document: KnowledgeDocumentResponse) => {
    const statusMeta = KNOWLEDGE_DOCUMENT_STATUS_META[document.status];
    const busy = isDocumentBusy(document.id);
    const diagnosticsDocument = diagnostics?.documents.find(
      (item) => item.id === document.id,
    );

    return (
      <article
        key={document.id}
        className="rounded-card border border-slate-200 bg-slate-50/80 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <Tooltip
            title={
              <div className="space-y-1 text-xs">
                <div>{tp('resources.detail.tooltipFormat', { value: document.mimeType })}</div>
                <div>{tp('resources.detail.tooltipUploadAt', { value: formatKnowledgeDateTime(document.uploadedAt) })}</div>
                <div>
                  {tp('resources.detail.tooltipLatestIndex')}
                  {formatKnowledgeDateTime(
                    document.lastIndexedAt ?? document.processedAt,
                  )}
                </div>
                <div>{tp('resources.detail.tooltipChunkCount', { value: document.chunkCount })}</div>
              </div>
            }
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Typography.Text strong className="text-slate-800!">
                  {document.fileName}
                </Typography.Text>
                <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                {diagnosticsDocument?.missingStorage ? (
                  <Tag color="error">{tp('resources.detail.missingStorage')}</Tag>
                ) : null}
                {diagnosticsDocument?.staleProcessing ? (
                  <Tag color="warning">{tp('resources.detail.staleProcessing')}</Tag>
                ) : null}
              </div>
            </div>
          </Tooltip>

          {!readOnlyGlobal ? (
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: buildDocumentActionMenuItems(document),
                onClick: ({ key }) => handleDocumentMenuAction(document, key),
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                loading={busy}
                aria-label={tp('resources.detail.documentActions', { name: document.fileName })}
              />
            </Dropdown>
          ) : null}
        </div>

        <Typography.Text className="mt-3 block text-xs text-slate-500">
          {tp('resources.detail.uploadAt', {
            value: formatKnowledgeDateTime(document.uploadedAt),
          })}{' '}
          ·{' '}
          {tp('resources.detail.latestIndex', {
            value: formatKnowledgeDateTime(document.lastIndexedAt ?? document.processedAt),
          })}
        </Typography.Text>

        {document.errorMessage ? (
          <Alert
            className="mt-4"
            type="error"
            showIcon
            title={tp('resources.detail.failed')}
            description={document.errorMessage}
          />
        ) : null}
      </article>
    );
  };

  const headerExtra = readOnlyGlobal ? (
    <div className="flex items-center gap-2">
      <Button onClick={onRefresh} icon={<ReloadOutlined />}>
        {tp('resources.detail.refresh')}
      </Button>
      <Button icon={<LinkOutlined />} onClick={onOpenGlobalManagement}>
        {tp('resources.detail.openGlobal')}
      </Button>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items: [
            {
              key: "unbind",
              icon: <LinkOutlined />,
              label: tp('resources.detail.unbind'),
              danger: true,
              disabled: unbindingGlobal,
            },
          ],
          onClick: ({ key }) => {
            if (key === "unbind") {
              onUnbindGlobalKnowledge();
            }
          },
        }}
      >
        <Button icon={<MoreOutlined />} loading={unbindingGlobal} />
      </Dropdown>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Button onClick={onRefresh} icon={<ReloadOutlined />}>
        {tp('resources.detail.refresh')}
      </Button>
      <Button
        type="primary"
        icon={<CloudUploadOutlined />}
        loading={uploading}
        onClick={onUploadDocument}
      >
        {tp('resources.detail.upload')}
      </Button>
      <Button onClick={onEditKnowledge}>{tp('resources.editKnowledge')}</Button>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items: [
            {
              key: "rebuild",
              icon: <ToolOutlined />,
              label: tp('resources.detail.rebuild'),
              disabled:
                rebuildingKnowledge || loading || !knowledge?.documents.length,
            },
            {
              type: "divider",
            },
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: tp('resources.detail.delete'),
              danger: true,
              disabled: deletingKnowledge,
            },
          ],
          onClick: ({ key }) => {
            if (key === "rebuild") {
              onRebuildKnowledge();
              return;
            }

            if (key === "delete") {
              onDeleteKnowledge();
            }
          },
        }}
      >
        <Button
          icon={<MoreOutlined />}
          loading={deletingKnowledge || rebuildingKnowledge}
        />
      </Dropdown>
    </div>
  );

  return (
    <Drawer
      title={knowledgeItem?.name ?? tp('resources.group.knowledgeTitle')}
      open={open}
      onClose={onClose}
      size={720}
      destroyOnHidden
      extra={knowledgeItem ? headerExtra : null}
    >
      {!knowledgeItem ? null : loading ? (
        <div className="space-y-4">
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : error ? (
        <Alert
          type="error"
          showIcon
          title={tp('resources.alertProjectKnowledge')}
          description={error}
        />
      ) : knowledge ? (
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.92))] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={readOnlyGlobal ? "blue" : "green"}>
                {readOnlyGlobal
                  ? tp('resources.group.sourceGlobal')
                  : tp('resources.group.sourceProject')}
              </Tag>
              <Tag color={KNOWLEDGE_INDEX_STATUS_META[knowledge.indexStatus].color}>
                {KNOWLEDGE_INDEX_STATUS_META[knowledge.indexStatus].label}
              </Tag>
            </div>

            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
              {knowledge.description || tp('resources.access.noDescription')}
            </Typography.Paragraph>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {buildKnowledgeDetailOverviewStats(knowledge, {
                includeChunkCount: true,
              }).map((item) => (
                <div
                  key={item.label}
                  className="rounded-panel border border-white/70 bg-white/80 px-4 py-3"
                >
                  <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                    {item.label}
                  </Typography.Text>
                  <Typography.Title
                    level={item.emphasis === "number" ? 4 : 5}
                    className="mb-0! mt-2 text-slate-800!"
                  >
                    {item.value}
                  </Typography.Title>
                </div>
              ))}
            </div>
          </section>

          {readOnlyGlobal ? (
            <Alert
              type="info"
              showIcon
              title={tp('resources.access.globalTitle')}
              description={tp('resources.access.globalPickerDescription')}
            />
          ) : null}

          <Tabs
            key={knowledgeItem.id}
            defaultActiveKey="documents"
            items={[
              {
                key: "documents",
                label: tp('resources.detail.documentsTab'),
                children:
                  knowledge.documents.length === 0 ? (
                    <Empty
                      className="my-12"
                      description={
                        readOnlyGlobal
                          ? tp('resources.access.empty')
                          : tp('resources.uploadDocument')
                      }
                    >
                      {!readOnlyGlobal ? (
                        <Button
                          type="primary"
                          icon={<CloudUploadOutlined />}
                          loading={uploading}
                          onClick={onUploadDocument}
                        >
                          {tp('resources.uploadDocument')}
                        </Button>
                      ) : null}
                    </Empty>
                  ) : (
                    <div className="space-y-3">
                      {knowledge.documents.map(renderDocumentCard)}
                    </div>
                  ),
              },
              {
                key: "ops",
                label: tp('resources.detail.opsTab'),
                children: diagnosticsLoading ? (
                  <div className="flex min-h-60 items-center justify-center">
                    <Spin size="large" />
                  </div>
                ) : diagnosticsError ? (
                  <Alert
                    type="warning"
                    showIcon
                    title={tp('resources.detail.diagnosticsTitle')}
                    description={diagnosticsError}
                    action={
                      <Button size="small" onClick={onRefreshDiagnostics}>
                        {tp('resources.detail.diagnosticsRefresh')}
                      </Button>
                    }
                  />
                ) : diagnostics ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-card border border-slate-200 bg-slate-50/70 px-4 py-4">
                        <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Collection
                        </Typography.Text>
                        <Typography.Title
                          level={5}
                          className="mb-0! mt-2 text-slate-800!"
                        >
                          {diagnostics.collection.exists ? 'OK' : 'N/A'}
                        </Typography.Title>
                        <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                          {diagnostics.expectedCollectionName}
                        </Typography.Paragraph>
                      </div>
                      <div className="rounded-card border border-slate-200 bg-slate-50/70 px-4 py-4">
                        <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Indexer
                        </Typography.Text>
                        <Typography.Title
                          level={5}
                          className="mb-0! mt-2 text-slate-800!"
                        >
                          {diagnostics.indexer.status === "ok"
                            ? 'OK'
                            : 'Degraded'}
                        </Typography.Title>
                        <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                          {diagnostics.indexer.service ?? 'N/A'}
                        </Typography.Paragraph>
                      </div>
                      <div className="rounded-card border border-slate-200 bg-slate-50/70 px-4 py-4">
                        <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          {tp('resources.detail.abnormalDocs')}
                        </Typography.Text>
                        <Typography.Title
                          level={5}
                          className="mb-0! mt-2 text-slate-800!"
                        >
                          {diagnostics.documentSummary.failed +
                            diagnostics.documentSummary.missingStorage +
                            diagnostics.documentSummary.staleProcessing}
                        </Typography.Title>
                        <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                          {tp('resources.detail.abnormalDocsHint')}
                        </Typography.Paragraph>
                      </div>
                    </div>

                    {diagnostics.collection.errorMessage ? (
                      <Alert
                        type="warning"
                        showIcon
                        title={tp('resources.detail.collectionAbnormal')}
                        description={diagnostics.collection.errorMessage}
                      />
                    ) : null}

                    {diagnostics.indexer.errorMessage ? (
                      <Alert
                        type="warning"
                        showIcon
                        title={tp('resources.detail.indexerDegraded')}
                        description={diagnostics.indexer.errorMessage}
                      />
                    ) : null}

                    <div className="rounded-card border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <FileTextOutlined className="text-slate-400" />
                          <Typography.Title
                            level={5}
                            className="mb-0! text-slate-800!"
                          >
                            {tp('resources.detail.diagnosticsTitle')}
                          </Typography.Title>
                        </div>
                        <Button onClick={onRefreshDiagnostics}>{tp('resources.detail.diagnosticsRefresh')}</Button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {diagnostics.documents.length === 0 ? (
                          <Empty description={tp('resources.detail.diagnosticsEmpty')} />
                        ) : (
                          diagnostics.documents.map((document) => (
                            <div
                              key={document.id}
                              className="rounded-panel border border-slate-200 bg-slate-50/70 px-4 py-3"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Typography.Text className="font-medium text-slate-800!">
                                  {document.fileName}
                                </Typography.Text>
                                <Tag
                                  color={
                                    KNOWLEDGE_DOCUMENT_STATUS_META[document.status].color
                                  }
                                >
                                {KNOWLEDGE_DOCUMENT_STATUS_META[document.status].label}
                              </Tag>
                              {document.missingStorage ? (
                                  <Tag color="error">{tp('resources.detail.diagnosticsMissingStorage')}</Tag>
                              ) : null}
                              {document.staleProcessing ? (
                                  <Tag color="warning">{tp('resources.detail.diagnosticsStale')}</Tag>
                              ) : null}
                            </div>
                            <Typography.Text className="mt-2 block text-xs text-slate-500">
                                {tp('resources.detail.diagnosticsLatestIndex')}
                                {formatKnowledgeDateTime(document.lastIndexedAt)} ·
                                {tp('resources.detail.diagnosticsUpdatedAt', {
                                  value: formatKnowledgeDateTime(document.updatedAt),
                                })}
                              </Typography.Text>
                              {document.errorMessage ? (
                                <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-rose-500!">
                                  {document.errorMessage}
                                </Typography.Paragraph>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty description={tp('resources.detail.noOps')} />
                ),
              },
              {
                key: "search",
                label: tp('resources.detail.searchTab'),
                children: <KnowledgeSearchTab knowledgeId={knowledge.id} />,
              },
            ]}
          />
        </div>
      ) : (
        <Empty className="my-16" description={tp('resources.detail.empty')} />
      )}
    </Drawer>
  );
};
