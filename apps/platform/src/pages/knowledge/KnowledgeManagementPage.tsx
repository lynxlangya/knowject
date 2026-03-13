import {
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { isApiError } from '@knowject/request';
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Tag,
  Typography,
} from 'antd';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  createKnowledge,
  deleteKnowledge,
  getKnowledgeDetail,
  listKnowledge,
  updateKnowledge,
  uploadKnowledgeDocument,
  type CreateKnowledgeRequest,
  type KnowledgeDetailResponse,
  type KnowledgeDocumentResponse,
  type KnowledgeDocumentStatus,
  type KnowledgeIndexStatus,
  type KnowledgeSourceType,
  type KnowledgeSummaryResponse,
  type UpdateKnowledgeRequest,
} from '@api/knowledge';

interface KnowledgeFormValues {
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const INDEX_STATUS_META: Record<
  KnowledgeIndexStatus,
  { label: string; color: string }
> = {
  idle: { label: '待索引', color: 'default' },
  pending: { label: '排队中', color: 'gold' },
  processing: { label: '处理中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
};

const DOCUMENT_STATUS_META: Record<
  KnowledgeDocumentStatus,
  { label: string; color: string }
> = {
  pending: { label: '待处理', color: 'gold' },
  processing: { label: '处理中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
};

const SOURCE_TYPE_META: Record<
  KnowledgeSourceType,
  { label: string; color: string; description: string }
> = {
  global_docs: {
    label: '全局文档',
    color: 'blue',
    description: '面向可上传文档的正式知识库类型，当前支持最小上传与索引闭环。',
  },
  global_code: {
    label: '全局代码',
    color: 'purple',
    description: '当前只冻结命名空间与检索契约，真实代码导入仍延后到后续阶段。',
  },
};

const MAX_POLLING_ATTEMPTS = 20;
const POLLING_INTERVAL_MS = 1500;

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '未记录';
  }

  return dateTimeFormatter.format(new Date(value));
};

const pickNextActiveKnowledgeId = (
  items: KnowledgeSummaryResponse[],
  preferredId: string | null,
  currentId: string | null,
): string | null => {
  if (preferredId && items.some((item) => item.id === preferredId)) {
    return preferredId;
  }

  if (currentId && items.some((item) => item.id === currentId)) {
    return currentId;
  }

  return items[0]?.id ?? null;
};

const hasProcessingDocuments = (knowledge: KnowledgeDetailResponse | null): boolean => {
  return (
    knowledge?.documents.some(
      (document) =>
        document.status === 'pending' || document.status === 'processing',
    ) ?? false
  );
};

const toKnowledgePayload = (
  values: KnowledgeFormValues,
  mode: 'create' | 'edit',
): CreateKnowledgeRequest | UpdateKnowledgeRequest => {
  const payload = {
    name: values.name.trim(),
    description: values.description?.trim() ?? '',
  };

  if (mode === 'create') {
    return {
      ...payload,
      sourceType: values.sourceType,
    };
  }

  return payload;
};

const buildKnowledgeStats = (items: KnowledgeSummaryResponse[]) => {
  const totalDocuments = items.reduce(
    (sum, knowledge) => sum + knowledge.documentCount,
    0,
  );
  const totalChunks = items.reduce((sum, knowledge) => sum + knowledge.chunkCount, 0);
  const processingCount = items.filter(
    (knowledge) =>
      knowledge.indexStatus === 'pending' || knowledge.indexStatus === 'processing',
  ).length;

  return [
    {
      label: '知识库总数',
      value: `${items.length} 个`,
      hint: '当前正式持久化到 MongoDB 的全局知识库数量。',
    },
    {
      label: '文档总数',
      value: `${totalDocuments} 份`,
      hint: '已写入正式文档记录的上传文件数量。',
    },
    {
      label: '索引中',
      value: `${processingCount} 个`,
      hint: '存在排队中或处理中任务的知识库数量。',
    },
    {
      label: '累计分块',
      value: `${totalChunks} 段`,
      hint: '成功写入向量索引后的累计 chunk 数。',
    },
  ];
};

const renderDocumentCard = (document: KnowledgeDocumentResponse) => {
  const statusMeta = DOCUMENT_STATUS_META[document.status];

  return (
    <article
      key={document.id}
      className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Typography.Text strong className="text-slate-800!">
          {document.fileName}
        </Typography.Text>
        <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
        <Tag>{document.mimeType}</Tag>
      </div>

      <div className="mt-3 grid gap-3 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="text-slate-400">上传时间</div>
          <div className="mt-1 text-slate-600">{formatDateTime(document.uploadedAt)}</div>
        </div>
        <div>
          <div className="text-slate-400">处理完成</div>
          <div className="mt-1 text-slate-600">
            {formatDateTime(document.processedAt)}
          </div>
        </div>
        <div>
          <div className="text-slate-400">最近索引</div>
          <div className="mt-1 text-slate-600">
            {formatDateTime(document.lastIndexedAt)}
          </div>
        </div>
        <div>
          <div className="text-slate-400">分块数量</div>
          <div className="mt-1 text-slate-600">{document.chunkCount}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>上传人：{document.uploadedBy}</span>
        <span>Embedding：{document.embeddingProvider}</span>
        <span>模型：{document.embeddingModel}</span>
        <span>重试次数：{document.retryCount}</span>
      </div>

      {document.errorMessage ? (
        <Alert
          className="mt-3"
          type="error"
          showIcon
          message="处理失败"
          description={document.errorMessage}
        />
      ) : null}
    </article>
  );
};

export const KnowledgeManagementPage = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<KnowledgeFormValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isFirstLoadRef = useRef(true);
  const preferredActiveIdRef = useRef<string | null>(null);
  const pollingAttemptsRef = useRef<Record<string, number>>({});
  const [items, setItems] = useState<KnowledgeSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeKnowledgeId, setActiveKnowledgeId] = useState<string | null>(null);
  const [activeKnowledge, setActiveKnowledge] = useState<KnowledgeDetailResponse | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [listReloadToken, setListReloadToken] = useState(0);
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(null);

  const stats = buildKnowledgeStats(items);
  const activeSummary =
    items.find((knowledge) => knowledge.id === activeKnowledgeId) ?? null;
  const activeSourceMeta = activeKnowledge
    ? SOURCE_TYPE_META[activeKnowledge.sourceType]
    : null;
  const shouldPoll = hasProcessingDocuments(activeKnowledge);
  const pollingAttempts = activeKnowledgeId
    ? pollingAttemptsRef.current[activeKnowledgeId] ?? 0
    : 0;
  const pollingStopped = shouldPoll && pollingAttempts >= MAX_POLLING_ATTEMPTS;

  useEffect(() => {
    let isMounted = true;

    const loadKnowledgeList = async () => {
      if (isFirstLoadRef.current) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const result = await listKnowledge();

        if (!isMounted) {
          return;
        }

        setItems(result.items);
        setError(null);
        setActiveKnowledgeId((currentId) => {
          const nextId = pickNextActiveKnowledgeId(
            result.items,
            preferredActiveIdRef.current,
            currentId,
          );

          preferredActiveIdRef.current = null;
          return nextId;
        });
      } catch (currentError) {
        if (!isMounted) {
          return;
        }

        console.error(currentError);
        setError(
          isApiError(currentError)
            ? currentError.message
            : '加载知识库列表失败，请稍后重试',
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setLoading(false);
        setRefreshing(false);
        isFirstLoadRef.current = false;
      }
    };

    void loadKnowledgeList();

    return () => {
      isMounted = false;
    };
  }, [listReloadToken]);

  useEffect(() => {
    if (!activeKnowledgeId) {
      setActiveKnowledge(null);
      setDetailError(null);
      return;
    }

    let isMounted = true;

    const loadKnowledgeDetail = async () => {
      setDetailLoading(true);

      try {
        const result = await getKnowledgeDetail(activeKnowledgeId);

        if (!isMounted) {
          return;
        }

        setActiveKnowledge(result.knowledge);
        setDetailError(null);
      } catch (currentError) {
        if (!isMounted) {
          return;
        }

        console.error(currentError);
        setActiveKnowledge(null);
        setDetailError(
          isApiError(currentError)
            ? currentError.message
            : '加载知识库详情失败，请稍后重试',
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setDetailLoading(false);
      }
    };

    void loadKnowledgeDetail();

    return () => {
      isMounted = false;
    };
  }, [activeKnowledgeId, detailReloadToken]);

  useEffect(() => {
    if (!activeKnowledgeId) {
      return;
    }

    if (!shouldPoll) {
      pollingAttemptsRef.current[activeKnowledgeId] = 0;
      return;
    }

    if (detailLoading) {
      return;
    }

    const attempts = pollingAttemptsRef.current[activeKnowledgeId] ?? 0;

    if (attempts >= MAX_POLLING_ATTEMPTS) {
      return;
    }

    const timer = window.setTimeout(() => {
      pollingAttemptsRef.current[activeKnowledgeId] = attempts + 1;
      setDetailReloadToken((value) => value + 1);
      preferredActiveIdRef.current = activeKnowledgeId;
      setListReloadToken((value) => value + 1);
    }, POLLING_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeKnowledgeId, detailLoading, shouldPoll]);

  const reloadKnowledgeList = (preferredId?: string | null) => {
    preferredActiveIdRef.current = preferredId ?? null;
    setListReloadToken((value) => value + 1);
  };

  const reloadKnowledgeDetail = () => {
    setDetailReloadToken((value) => value + 1);
  };

  const resetPollingAttempts = (knowledgeId?: string | null) => {
    if (!knowledgeId) {
      return;
    }

    pollingAttemptsRef.current[knowledgeId] = 0;
  };

  const openCreateModal = () => {
    form.setFieldsValue({
      name: '',
      description: '',
      sourceType: 'global_docs',
    });
    setModalMode('create');
  };

  const openEditModal = () => {
    if (!activeKnowledge) {
      message.info('请先选择一个知识库');
      return;
    }

    form.setFieldsValue({
      name: activeKnowledge.name,
      description: activeKnowledge.description,
      sourceType: activeKnowledge.sourceType,
    });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    form.resetFields();
  };

  const handleSubmitKnowledge = async (values: KnowledgeFormValues) => {
    setModalSubmitting(true);

    try {
      if (modalMode === 'create') {
        const result = await createKnowledge(
          toKnowledgePayload(values, 'create') as CreateKnowledgeRequest,
        );

        pollingAttemptsRef.current[result.knowledge.id] = 0;
        message.success('知识库已创建');
        closeModal();
        reloadKnowledgeList(result.knowledge.id);
        return;
      }

      if (!activeKnowledgeId) {
        message.warning('当前没有可编辑的知识库');
        return;
      }

      const result = await updateKnowledge(
        activeKnowledgeId,
        toKnowledgePayload(values, 'edit') as UpdateKnowledgeRequest,
      );

      message.success('知识库信息已更新');
      closeModal();
      reloadKnowledgeList(result.knowledge.id);
      reloadKnowledgeDetail();
    } catch (currentError) {
      console.error(currentError);
      message.error(
        isApiError(currentError)
          ? currentError.message
          : modalMode === 'create'
            ? '创建知识库失败，请稍后重试'
            : '更新知识库失败，请稍后重试',
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteKnowledge = async () => {
    if (!activeKnowledgeId) {
      message.warning('当前没有可删除的知识库');
      return;
    }

    setDeletingKnowledgeId(activeKnowledgeId);

    try {
      const nextCandidateId =
        items.find((knowledge) => knowledge.id !== activeKnowledgeId)?.id ?? null;

      await deleteKnowledge(activeKnowledgeId);

      delete pollingAttemptsRef.current[activeKnowledgeId];
      setActiveKnowledge(null);
      setDetailError(null);
      message.success('知识库已删除');
      reloadKnowledgeList(nextCandidateId);
    } catch (currentError) {
      console.error(currentError);
      message.error(
        isApiError(currentError)
          ? currentError.message
          : '删除知识库失败，请稍后重试',
      );
    } finally {
      setDeletingKnowledgeId(null);
    }
  };

  const handleUploadClick = () => {
    if (!activeKnowledge) {
      message.info('请先选择一个知识库');
      return;
    }

    if (activeKnowledge.sourceType !== 'global_docs') {
      message.info('global_code 目前只冻结命名空间，暂不支持真实导入');
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !activeKnowledgeId) {
      return;
    }

    setUploading(true);

    try {
      await uploadKnowledgeDocument(activeKnowledgeId, file);

      pollingAttemptsRef.current[activeKnowledgeId] = 0;
      message.success('文档已上传，正在进入索引队列');
      reloadKnowledgeList(activeKnowledgeId);
      reloadKnowledgeDetail();
    } catch (currentError) {
      console.error(currentError);
      message.error(
        isApiError(currentError)
          ? currentError.message
          : '上传文档失败，请稍后重试',
      );
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-105 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <Card className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!">
        <Typography.Title level={4} className="text-slate-800!">
          知识库
        </Typography.Title>
        <Typography.Paragraph className="text-slate-500!">
          {error}
        </Typography.Paragraph>
        <Button onClick={() => reloadKnowledgeList()}>重新加载</Button>
      </Card>
    );
  }

  return (
    <section className="flex min-h-full flex-col gap-4">
      <Card
        className="rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!"
        styles={{ body: { padding: '22px 22px 20px' } }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Typography.Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              全局知识资产
            </Typography.Text>
            <Typography.Title level={3} className="mb-0! mt-2 text-slate-800!">
              全局知识库正式接线与状态观测
            </Typography.Title>
            <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
              当前页面已切到正式后端知识库接口，负责最小管理闭环：列表、创建、编辑、删除、上传文档与观察
              `pending / processing / completed / failed` 状态流。业务主数据继续由 MongoDB 托管，向量索引只走统一检索链路。
            </Typography.Paragraph>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              新建知识库
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => {
                resetPollingAttempts(activeKnowledgeId);
                reloadKnowledgeList(activeKnowledgeId);
                reloadKnowledgeDetail();
              }}
            >
              刷新状态
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4"
            >
              <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {item.label}
              </Typography.Text>
              <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                {item.value}
              </Typography.Title>
              <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
                {item.hint}
              </Typography.Paragraph>
            </div>
          ))}
        </div>
      </Card>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card
          className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
          styles={{ body: { padding: '20px' } }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <Typography.Title level={5} className="mb-0! text-slate-800!">
                知识库列表
              </Typography.Title>
              <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-500!">
                只让 `/knowledge` 切正式接口，`skills / agents` 保持现有壳层，避免这轮范围漂移。
              </Typography.Paragraph>
            </div>
            <Typography.Text className="text-xs text-slate-400">
              共 {items.length} 个
            </Typography.Text>
          </div>

          {items.length === 0 ? (
            <Empty
              className="my-10"
              description="还没有正式知识库，先创建一个再上传文档。"
            >
              <Button type="primary" onClick={openCreateModal}>
                创建第一个知识库
              </Button>
            </Empty>
          ) : (
            <div className="mt-5 space-y-3">
              {items.map((knowledge) => {
                const indexStatusMeta = INDEX_STATUS_META[knowledge.indexStatus];
                const sourceTypeMeta = SOURCE_TYPE_META[knowledge.sourceType];
                const isActive = knowledge.id === activeKnowledgeId;

                return (
                  <button
                    key={knowledge.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      pollingAttemptsRef.current[knowledge.id] = 0;
                      setActiveKnowledgeId(knowledge.id);
                    }}
                    className={`w-full rounded-[20px] border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-slate-800 bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography.Text
                        strong
                        className={isActive ? 'text-white!' : 'text-slate-800!'}
                      >
                        {knowledge.name}
                      </Typography.Text>
                      <Tag color={indexStatusMeta.color}>{indexStatusMeta.label}</Tag>
                      <Tag color={sourceTypeMeta.color}>{sourceTypeMeta.label}</Tag>
                    </div>

                    <Typography.Paragraph
                      className={`mb-0! mt-3 text-sm! leading-6! ${
                        isActive ? 'text-slate-200!' : 'text-slate-500!'
                      }`}
                    >
                      {knowledge.description || '当前未填写描述。'}
                    </Typography.Paragraph>

                    <div
                      className={`mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      <span>文档：{knowledge.documentCount}</span>
                      <span>分块：{knowledge.chunkCount}</span>
                      <span>最近更新：{formatDateTime(knowledge.updatedAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
          styles={{ body: { padding: '20px' } }}
        >
          {!activeKnowledgeId ? (
            <Empty
              className="my-16"
              description="请选择左侧知识库，查看文档与状态详情。"
            />
          ) : detailLoading && !activeKnowledge ? (
            <div className="flex min-h-90 items-center justify-center">
              <Spin size="large" />
            </div>
          ) : detailError ? (
            <div className="space-y-4">
              <Alert type="error" showIcon message={detailError} />
              <Button onClick={reloadKnowledgeDetail}>重试加载详情</Button>
            </div>
          ) : activeKnowledge ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography.Title level={4} className="mb-0! text-slate-800!">
                      {activeKnowledge.name}
                    </Typography.Title>
                    {activeSourceMeta ? (
                      <Tag color={activeSourceMeta.color}>{activeSourceMeta.label}</Tag>
                    ) : null}
                    <Tag color={INDEX_STATUS_META[activeKnowledge.indexStatus].color}>
                      {INDEX_STATUS_META[activeKnowledge.indexStatus].label}
                    </Tag>
                  </div>
                  <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
                    {activeKnowledge.description || '当前未填写描述。'}
                  </Typography.Paragraph>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    icon={<CloudUploadOutlined />}
                    loading={uploading}
                    disabled={activeKnowledge.sourceType !== 'global_docs'}
                    onClick={handleUploadClick}
                  >
                    上传文档
                  </Button>
                  <Button icon={<EditOutlined />} onClick={openEditModal}>
                    编辑
                  </Button>
                  <Popconfirm
                    title="删除知识库"
                    description="会删除 Mongo 元数据、原始文件，并清理对应 Chroma 向量记录。"
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{
                      danger: true,
                      loading: deletingKnowledgeId === activeKnowledge.id,
                    }}
                    onConfirm={() => void handleDeleteKnowledge()}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      loading={deletingKnowledgeId === activeKnowledge.id}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <Typography.Text className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    文档数量
                  </Typography.Text>
                  <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                    {activeKnowledge.documentCount}
                  </Typography.Title>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <Typography.Text className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    分块数量
                  </Typography.Text>
                  <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                    {activeKnowledge.chunkCount}
                  </Typography.Title>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <Typography.Text className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    最近更新
                  </Typography.Text>
                  <Typography.Title level={5} className="mb-0! mt-2 text-slate-800!">
                    {formatDateTime(activeKnowledge.updatedAt)}
                  </Typography.Title>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[18px] border border-slate-200 px-4 py-4">
                  <Typography.Text className="text-xs text-slate-400">
                    维护人
                  </Typography.Text>
                  <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-700!">
                    {activeKnowledge.maintainerId}
                  </Typography.Paragraph>
                </div>
                <div className="rounded-[18px] border border-slate-200 px-4 py-4">
                  <Typography.Text className="text-xs text-slate-400">
                    创建人
                  </Typography.Text>
                  <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-700!">
                    {activeKnowledge.createdBy}
                  </Typography.Paragraph>
                </div>
                <div className="rounded-[18px] border border-slate-200 px-4 py-4">
                  <Typography.Text className="text-xs text-slate-400">
                    创建时间
                  </Typography.Text>
                  <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-700!">
                    {formatDateTime(activeKnowledge.createdAt)}
                  </Typography.Paragraph>
                </div>
                <div className="rounded-[18px] border border-slate-200 px-4 py-4">
                  <Typography.Text className="text-xs text-slate-400">
                    类型说明
                  </Typography.Text>
                  <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-700!">
                    {activeSourceMeta?.description ?? '未记录'}
                  </Typography.Paragraph>
                </div>
              </div>

              <Alert
                type={activeKnowledge.sourceType === 'global_docs' ? 'info' : 'warning'}
                showIcon
                message={
                  activeKnowledge.sourceType === 'global_docs'
                    ? '当前最稳妥上传格式是 md / txt，pdf 仍会走失败态用于验证状态机。'
                    : 'global_code 当前只保留集合与契约，不做真实导入、分块或上传入口。'
                }
              />

              {shouldPoll ? (
                <Alert
                  type={pollingStopped ? 'warning' : 'info'}
                  showIcon
                  message={
                    pollingStopped
                      ? '自动刷新已达到本轮上限，请手动点击“刷新状态”继续观察。'
                      : '检测到待处理文档，页面会做最小轮询以更新索引状态。'
                  }
                />
              ) : null}

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileTextOutlined className="text-slate-400" />
                    <Typography.Title level={5} className="mb-0! text-slate-800!">
                      文档列表
                    </Typography.Title>
                  </div>
                  <Typography.Text className="text-xs text-slate-400">
                    共 {activeKnowledge.documents.length} 份
                  </Typography.Text>
                </div>

                {activeKnowledge.documents.length === 0 ? (
                  <Empty
                    className="my-12"
                    description={
                      activeKnowledge.sourceType === 'global_docs'
                        ? '当前知识库还没有文档，上传一份 md 或 txt 开始索引。'
                        : 'global_code 当前还没有真实代码导入入口。'
                    }
                  >
                    {activeKnowledge.sourceType === 'global_docs' ? (
                      <Button
                        type="primary"
                        icon={<CloudUploadOutlined />}
                        loading={uploading}
                        onClick={handleUploadClick}
                      >
                        上传第一份文档
                      </Button>
                    ) : null}
                  </Empty>
                ) : (
                  <div className="mt-4 space-y-3">
                    {activeKnowledge.documents.map(renderDocumentCard)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Empty
              className="my-16"
              description={
                activeSummary
                  ? `知识库“${activeSummary.name}”详情暂不可用，请稍后重试。`
                  : '请选择左侧知识库查看详情。'
              }
            />
          )}
        </Card>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.pdf,text/markdown,text/plain,application/pdf"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <Modal
        title={modalMode === 'create' ? '新建知识库' : '编辑知识库'}
        open={modalMode !== null}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={modalSubmitting}
        destroyOnHidden
      >
        <Form<KnowledgeFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSubmitKnowledge(values)}
          initialValues={{
            name: '',
            description: '',
            sourceType: 'global_docs',
          }}
        >
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[
              {
                required: true,
                message: '请输入知识库名称',
              },
            ]}
          >
            <Input maxLength={80} placeholder="例如：产品规范库" />
          </Form.Item>

          {modalMode === 'create' ? (
            <Form.Item name="sourceType" label="来源类型">
              <Select
                options={[
                  { value: 'global_docs', label: 'global_docs · 全局文档' },
                  { value: 'global_code', label: 'global_code · 全局代码（预留）' },
                ]}
              />
            </Form.Item>
          ) : null}

          <Form.Item name="description" label="描述">
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 5 }}
              maxLength={240}
              placeholder="描述知识库的职责、内容范围和维护边界。"
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
};
