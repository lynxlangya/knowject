import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  LinkOutlined,
  MoreOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type {
  KnowledgeDetailResponse,
  KnowledgeDiagnosticsResponse,
  KnowledgeDocumentResponse,
} from '@api/knowledge';
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
} from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useState } from 'react';
import type { ProjectResourceItem } from '@app/project/project.types';

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

const INDEX_STATUS_META = {
  idle: {
    color: 'default',
    label: '待索引',
  },
  pending: {
    color: 'gold',
    label: '排队中',
  },
  processing: {
    color: 'processing',
    label: '处理中',
  },
  completed: {
    color: 'success',
    label: '已完成',
  },
  failed: {
    color: 'error',
    label: '失败',
  },
} as const;

const DOCUMENT_STATUS_META = {
  pending: {
    color: 'gold',
    label: '排队中',
  },
  processing: {
    color: 'processing',
    label: '处理中',
  },
  completed: {
    color: 'success',
    label: '已完成',
  },
  failed: {
    color: 'error',
    label: '失败',
  },
} as const;

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '未记录';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '未记录';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

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
  const [activeTabKey, setActiveTabKey] = useState('documents');
  const readOnlyGlobal = knowledgeItem?.source === 'global';

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTabKey('documents');
  }, [knowledgeItem?.id, open]);

  const buildDocumentActionMenuItems = (
    document: KnowledgeDocumentResponse,
  ): NonNullable<MenuProps['items']> => {
    const busy = isDocumentBusy(document.id);
    const commonItems: NonNullable<MenuProps['items']> = [
      {
        key: 'preview',
        icon: <EyeOutlined />,
        label: '预览',
      },
      {
        key: 'download',
        icon: <DownloadOutlined />,
        label: '下载',
      },
      {
        type: 'divider',
      },
    ];

    if (document.status === 'pending' || document.status === 'processing') {
      return [
        ...commonItems,
        {
          key: 'refresh',
          icon: <ReloadOutlined />,
          label: '刷新状态',
          disabled: busy,
        },
        {
          type: 'divider',
        },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: '删除文档',
          danger: true,
          disabled: busy,
        },
      ];
    }

    return [
      ...commonItems,
      ...(document.status === 'failed'
        ? [
            {
              key: 'retry',
              icon: <ReloadOutlined />,
              label: '重试索引',
              disabled: busy,
            },
          ]
        : []),
      {
        key: 'rebuild',
        icon: <ToolOutlined />,
        label: '重建索引',
        disabled: busy,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除文档',
        danger: true,
        disabled: busy,
      },
    ];
  };

  const handleDocumentMenuAction = (
    document: KnowledgeDocumentResponse,
    key: string,
  ) => {
    if (key === 'preview') {
      message.info(`“${document.fileName}”预览原文即将开放`);
      return;
    }

    if (key === 'download') {
      message.info(`“${document.fileName}”下载原文即将开放`);
      return;
    }

    if (key === 'refresh') {
      onRefresh();
      return;
    }

    if (key === 'retry') {
      onRetryDocument(document);
      return;
    }

    if (key === 'rebuild') {
      onRebuildDocument(document);
      return;
    }

    if (key === 'delete') {
      onDeleteDocument(document);
    }
  };

  const renderDocumentCard = (document: KnowledgeDocumentResponse) => {
    const statusMeta = DOCUMENT_STATUS_META[document.status];
    const busy = isDocumentBusy(document.id);
    const diagnosticsDocument = diagnostics?.documents.find((item) => item.id === document.id);

    return (
      <article
        key={document.id}
        className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <Tooltip
            title={
              <div className="space-y-1 text-xs">
                <div>格式：{document.mimeType}</div>
                <div>上传时间：{formatDateTime(document.uploadedAt)}</div>
                <div>最近索引：{formatDateTime(document.lastIndexedAt ?? document.processedAt)}</div>
                <div>分块数量：{document.chunkCount}</div>
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
                  <Tag color="error">原文件缺失</Tag>
                ) : null}
                {diagnosticsDocument?.staleProcessing ? (
                  <Tag color="warning">处理卡住</Tag>
                ) : null}
              </div>
            </div>
          </Tooltip>

          {!readOnlyGlobal ? (
            <Dropdown
              trigger={['click']}
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
                aria-label={`文档操作：${document.fileName}`}
              />
            </Dropdown>
          ) : null}
        </div>

        <Typography.Text className="mt-3 block text-xs text-slate-500">
          上传于 {formatDateTime(document.uploadedAt)} · 最近索引{' '}
          {formatDateTime(document.lastIndexedAt ?? document.processedAt)}
        </Typography.Text>

        {document.errorMessage ? (
          <Alert
            className="mt-4"
            type="error"
            showIcon
            message="处理失败"
            description={document.errorMessage}
          />
        ) : null}
      </article>
    );
  };

  const headerExtra = readOnlyGlobal ? (
    <div className="flex items-center gap-2">
      <Button onClick={onRefresh} icon={<ReloadOutlined />}>
        刷新
      </Button>
      <Button icon={<LinkOutlined />} onClick={onOpenGlobalManagement}>
        前往全局治理
      </Button>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: [
            {
              key: 'unbind',
              icon: <LinkOutlined />,
              label: '解除项目绑定',
              danger: true,
              disabled: unbindingGlobal,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'unbind') {
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
        刷新
      </Button>
      <Button type="primary" icon={<CloudUploadOutlined />} loading={uploading} onClick={onUploadDocument}>
        上传文档
      </Button>
      <Button onClick={onEditKnowledge}>编辑</Button>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: [
            {
              key: 'rebuild',
              icon: <ToolOutlined />,
              label: '重建全部文档',
              disabled: rebuildingKnowledge || loading || !knowledge?.documents.length,
            },
            {
              type: 'divider',
            },
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: '删除知识库',
              danger: true,
              disabled: deletingKnowledge,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'rebuild') {
              onRebuildKnowledge();
              return;
            }

            if (key === 'delete') {
              onDeleteKnowledge();
            }
          },
        }}
      >
        <Button icon={<MoreOutlined />} loading={deletingKnowledge || rebuildingKnowledge} />
      </Dropdown>
    </div>
  );

  return (
    <Drawer
      title={knowledgeItem?.name ?? '知识库详情'}
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
          message="加载知识库详情失败"
          description={error}
        />
      ) : knowledge ? (
        <div className="space-y-5">
          <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.92))] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={readOnlyGlobal ? 'blue' : 'green'}>
                {readOnlyGlobal ? '全局绑定' : '项目私有'}
              </Tag>
              <Tag color={INDEX_STATUS_META[knowledge.indexStatus].color}>
                {INDEX_STATUS_META[knowledge.indexStatus].label}
              </Tag>
            </div>

            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
              {knowledge.description || '暂无描述'}
            </Typography.Paragraph>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-white/70 bg-white/80 px-4 py-3">
                <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  文档
                </Typography.Text>
                <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                  {knowledge.documents.length}
                </Typography.Title>
              </div>
              <div className="rounded-[18px] border border-white/70 bg-white/80 px-4 py-3">
                <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  分块
                </Typography.Text>
                <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                  {knowledge.chunkCount}
                </Typography.Title>
              </div>
              <div className="rounded-[18px] border border-white/70 bg-white/80 px-4 py-3">
                <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  最近更新
                </Typography.Text>
                <Typography.Title level={5} className="mb-0! mt-2 text-slate-800!">
                  {formatDateTime(knowledge.updatedAt)}
                </Typography.Title>
              </div>
            </div>
          </section>

          {readOnlyGlobal ? (
            <Alert
              type="info"
              showIcon
              message="当前项目内对全局知识库保持只读"
              description="你可以在这里查看文档和状态，但全局知识库的编辑、删除和运维动作仍然回到全局知识库页面处理。"
            />
          ) : null}

          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            items={[
              {
                key: 'documents',
                label: `文档 ${knowledge.documents.length}`,
                children: knowledge.documents.length === 0 ? (
                  <Empty
                    className="my-12"
                    description={
                      readOnlyGlobal
                        ? '当前全局知识库还没有文档，或文档尚未同步到这里。'
                        : '当前知识库还没有文档，先上传一份 .md 或 .txt。'
                    }
                  >
                    {!readOnlyGlobal ? (
                      <Button
                        type="primary"
                        icon={<CloudUploadOutlined />}
                        loading={uploading}
                        onClick={onUploadDocument}
                      >
                        上传第一份文档
                      </Button>
                    ) : null}
                  </Empty>
                ) : (
                  <div className="space-y-3">{knowledge.documents.map(renderDocumentCard)}</div>
                ),
              },
              ...(!readOnlyGlobal
                ? [
                    {
                      key: 'ops',
                      label: '运维',
                      children: diagnosticsLoading ? (
                        <div className="flex min-h-60 items-center justify-center">
                          <Spin size="large" />
                        </div>
                      ) : diagnosticsError ? (
                        <Alert
                          type="warning"
                          showIcon
                          message="加载诊断信息失败"
                          description={diagnosticsError}
                          action={
                            <Button size="small" onClick={onRefreshDiagnostics}>
                              重新获取
                            </Button>
                          }
                        />
                      ) : diagnostics ? (
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                              <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                                Collection
                              </Typography.Text>
                              <Typography.Title level={5} className="mb-0! mt-2 text-slate-800!">
                                {diagnostics.collection.exists ? '已联通' : '未联通'}
                              </Typography.Title>
                              <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                                {diagnostics.expectedCollectionName}
                              </Typography.Paragraph>
                            </div>
                            <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                              <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                                Indexer
                              </Typography.Text>
                              <Typography.Title level={5} className="mb-0! mt-2 text-slate-800!">
                                {diagnostics.indexer.status === 'ok' ? '运行正常' : '降级'}
                              </Typography.Title>
                              <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                                {diagnostics.indexer.service ?? '未返回服务名'}
                              </Typography.Paragraph>
                            </div>
                            <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                              <Typography.Text className="text-xs uppercase tracking-[0.12em] text-slate-400">
                                异常文档
                              </Typography.Text>
                              <Typography.Title level={5} className="mb-0! mt-2 text-slate-800!">
                                {diagnostics.documentSummary.failed + diagnostics.documentSummary.missingStorage + diagnostics.documentSummary.staleProcessing}
                              </Typography.Title>
                              <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                                失败 / 原文件缺失 / 处理卡住
                              </Typography.Paragraph>
                            </div>
                          </div>

                          {diagnostics.collection.errorMessage ? (
                            <Alert
                              type="warning"
                              showIcon
                              message="Collection 状态异常"
                              description={diagnostics.collection.errorMessage}
                            />
                          ) : null}

                          {diagnostics.indexer.errorMessage ? (
                            <Alert
                              type="warning"
                              showIcon
                              message="Indexer 返回了降级信息"
                              description={diagnostics.indexer.errorMessage}
                            />
                          ) : null}

                          <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <FileTextOutlined className="text-slate-400" />
                                <Typography.Title level={5} className="mb-0! text-slate-800!">
                                  文档诊断
                                </Typography.Title>
                              </div>
                              <Button onClick={onRefreshDiagnostics}>刷新诊断</Button>
                            </div>

                            <div className="mt-4 space-y-3">
                              {diagnostics.documents.length === 0 ? (
                                <Empty description="当前没有文档诊断记录。" />
                              ) : (
                                diagnostics.documents.map((document) => (
                                  <div
                                    key={document.id}
                                    className="rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Typography.Text className="font-medium text-slate-800!">
                                        {document.fileName}
                                      </Typography.Text>
                                      <Tag color={DOCUMENT_STATUS_META[document.status].color}>
                                        {DOCUMENT_STATUS_META[document.status].label}
                                      </Tag>
                                      {document.missingStorage ? (
                                        <Tag color="error">原文件缺失</Tag>
                                      ) : null}
                                      {document.staleProcessing ? (
                                        <Tag color="warning">处理卡住</Tag>
                                      ) : null}
                                    </div>
                                    <Typography.Text className="mt-2 block text-xs text-slate-500">
                                      最近索引：{formatDateTime(document.lastIndexedAt)} · 更新时间：{formatDateTime(document.updatedAt)}
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
                        <Empty description="当前暂无可展示的运维信息。" />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ) : (
        <Empty className="my-16" description="请选择一个知识库查看详情。" />
      )}
    </Drawer>
  );
};
