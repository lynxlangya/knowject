import {
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Tabs,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  createKnowledge,
  deleteKnowledge,
  updateKnowledge,
  uploadKnowledgeDocument,
  type CreateKnowledgeRequest,
  type KnowledgeDocumentResponse,
  type KnowledgeDiagnosticsDocumentResponse,
  type KnowledgeSummaryResponse,
  type KnowledgeSourceType,
  type UpdateKnowledgeRequest,
} from '@api/knowledge';
import {
  GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME,
  GlobalAssetPageHeader,
  GlobalAssetPageLayout,
  type GlobalAssetSummaryItem,
} from '@pages/assets/components/GlobalAssetLayout';
import { KnowledgeDocumentsTab } from './components/KnowledgeDocumentsTab';
import { KnowledgeDetailHeader } from './components/KnowledgeDetailHeader';
import { KnowledgeOpsTab } from './components/KnowledgeOpsTab';
import { KnowledgeSearchTab } from './components/KnowledgeSearchTab';
import { KnowledgeSidebar } from './components/KnowledgeSidebar';
import { KnowledgeSourcePickerModal } from './components/KnowledgeSourcePickerModal';
import { KnowledgeTextInputModal } from './components/KnowledgeTextInputModal';
import {
  buildKnowledgeDetailOverviewStats,
  buildKnowledgeRebuildBlockedReason,
  KNOWLEDGE_SOURCE_TYPE_META,
  patchKnowledgeDetailDocument,
  queueKnowledgeDocumentForPending,
  queueKnowledgeForPending,
  removeKnowledgeDetailDocument,
} from './knowledgeDomain.shared';
import {
  DOCUMENT_UPLOAD_ACCEPT,
} from './knowledgeUpload.shared';
import { useKnowledgeDetailState } from './useKnowledgeDetailState';
import { useKnowledgeDocumentActions } from './useKnowledgeDocumentActions';
import { useKnowledgeListState } from './useKnowledgeListState';
import { useKnowledgeUploadFlow } from './useKnowledgeUploadFlow';

interface KnowledgeFormValues {
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
}

const KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY = 'knowledge-batch-upload';
const KNOWLEDGE_PAGE_SUBTITLE = '统一索引全局文档，供技能与智能体复用';

const formatKnowledgeBatchUploadProgress = (
  current: number,
  total: number,
): string => {
  return `正在上传文档 ${current}/${total}`;
};

const formatKnowledgeBatchUploadSuccessMessage = (
  successCount: number,
  totalCount: number,
): string => {
  if (successCount === totalCount) {
    return `已上传 ${successCount} 个文件，正在进入索引队列`;
  }

  return `已上传 ${successCount}/${totalCount} 个文件，正在进入索引队列`;
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

const buildKnowledgeStats = (
  items: KnowledgeSummaryResponse[],
): GlobalAssetSummaryItem[] => {
  const totalDocuments = items.reduce(
    (sum, knowledge) => sum + knowledge.documentCount,
    0,
  );
  const totalChunks = items.reduce(
    (sum, knowledge) => sum + knowledge.chunkCount,
    0,
  );
  const processingCount = items.filter(
    (knowledge) =>
      knowledge.indexStatus === 'pending' ||
      knowledge.indexStatus === 'processing',
  ).length;
  const failedCount = items.filter(
    (knowledge) => knowledge.indexStatus === 'failed',
  ).length;
  const attentionCount = processingCount + failedCount;

  return [
    {
      label: '知识库总数',
      value: `${items.length} 个`,
      hint: '当前纳入治理的全局知识集合。',
    },
    {
      label: '文档总数',
      value: `${totalDocuments} 份`,
      hint: '已上传到各知识库的原始文档规模。',
    },
    {
      label: '分块总量',
      value: `${totalChunks} 段`,
      hint: '直接反映当前检索与向量索引体量。',
    },
    {
      label: '需关注索引',
      value: `${attentionCount} 个`,
      hint:
        attentionCount === 0
          ? '当前没有排队、处理中或失败的知识库。'
          : failedCount === 0
            ? `${processingCount} 个仍在排队或处理中。`
            : `${failedCount} 个失败，${processingCount} 个排队或处理中。`,
    },
  ];
};

export const KnowledgeManagementPage = () => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<KnowledgeFormValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTabKey, setActiveTabKey] = useState('documents');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(
    null,
  );

  const {
    items,
    setItems,
    loading,
    refreshing,
    error,
    activeKnowledgeId,
    activeSummary,
    setActiveKnowledgeId,
    reloadKnowledgeList,
  } = useKnowledgeListState();

  const stats = buildKnowledgeStats(items);

  const {
    detail: activeKnowledge,
    setDetail: setActiveKnowledge,
    detailLoading,
    detailError,
    diagnostics: activeDiagnostics,
    diagnosticsLoading,
    diagnosticsError,
    refreshDetail: reloadKnowledgeDetail,
    refreshDiagnostics: reloadKnowledgeDiagnostics,
    refreshKnowledgeState,
    shouldPoll,
    pollingStopped,
    resetPollingAttempts,
  } = useKnowledgeDetailState({
    knowledgeId: activeKnowledgeId,
    autoPoll: true,
    onPollTick: (knowledgeId) => {
      reloadKnowledgeList(knowledgeId);
    },
  });

  const activeSourceMeta = activeKnowledge
    ? KNOWLEDGE_SOURCE_TYPE_META[activeKnowledge.sourceType]
    : null;
  const activeOverviewStats = activeKnowledge
    ? buildKnowledgeDetailOverviewStats(activeKnowledge)
    : [];
  const knowledgeRebuildBlockedReason =
    buildKnowledgeRebuildBlockedReason(activeKnowledge);
  const activeDiagnosticsDocumentMap = new Map<
    string,
    KnowledgeDiagnosticsDocumentResponse
  >((activeDiagnostics?.documents ?? []).map((document) => [document.id, document]));

  useEffect(() => {
    setActiveTabKey('documents');
  }, [activeKnowledgeId]);

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

        resetPollingAttempts(result.knowledge.id);
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
      console.error('[KnowledgeManagement] 创建或更新知识库失败:', currentError);
      message.error(
        extractApiErrorMessage(
          currentError,
          modalMode === 'create'
            ? '创建知识库失败，请稍后重试'
            : '更新知识库失败，请稍后重试',
        ),
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

      resetPollingAttempts(activeKnowledgeId);
      setActiveKnowledge(null);
      message.success('知识库已删除');
      reloadKnowledgeList(nextCandidateId);
    } catch (currentError) {
      console.error('[KnowledgeManagement] 删除知识库失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '删除知识库失败，请稍后重试'),
      );
    } finally {
      setDeletingKnowledgeId(null);
    }
  };

  const triggerDocumentUpload = () => {
    fileInputRef.current?.click();
  };

  const patchActiveKnowledgeDocument = (
    documentId: string,
    patch: Partial<KnowledgeDocumentResponse>,
  ) => {
    setActiveKnowledge((current) => {
      if (!current) {
        return current;
      }

      return patchKnowledgeDetailDocument(current, documentId, patch);
    });
  };

  const patchKnowledgeSummary = (
    knowledgeId: string,
    patch: Partial<KnowledgeSummaryResponse>,
  ) => {
    setItems((current) =>
      current.map((knowledge) =>
        knowledge.id === knowledgeId
          ? {
              ...knowledge,
              ...patch,
            }
          : knowledge,
      ),
    );
  };

  const removeActiveKnowledgeDocument = (documentId: string) => {
    setActiveKnowledge((current) => {
      if (!current) {
        return current;
      }

      return removeKnowledgeDetailDocument(current, documentId);
    });
  };

  const refreshDocumentStatus = (
    knowledgeId: string,
    options?: {
      reloadDiagnostics?: boolean;
    },
  ) => {
    resetPollingAttempts(knowledgeId);
    reloadKnowledgeList(knowledgeId);
    refreshKnowledgeState({
      reloadDiagnostics: options?.reloadDiagnostics,
    });
  };

  const patchKnowledgeSummaryAfterDelete = (
    knowledgeId: string,
    document: KnowledgeDocumentResponse,
  ) => {
    setItems((current) =>
      current.map((knowledge) =>
        knowledge.id === knowledgeId
          ? {
              ...knowledge,
              documentCount: Math.max(knowledge.documentCount - 1, 0),
              chunkCount: Math.max(knowledge.chunkCount - document.chunkCount, 0),
              updatedAt: new Date().toISOString(),
            }
          : knowledge,
      ),
    );
  };

  const {
    uploadFlowStep,
    uploadingKnowledgeId,
    textUploadSubmitting,
    openUploadFlow,
    closeUploadFlow,
    openTextInput: handleOpenTextInput,
    backToSourcePicker: handleBackToSourcePicker,
    handleSelectedFiles,
    handleFileChange,
    submitTextSource: handleSubmitTextSource,
  } = useKnowledgeUploadFlow({
    message,
    batchUploadMessageKey: KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY,
    formatBatchUploadProgress: formatKnowledgeBatchUploadProgress,
    formatBatchUploadSuccessMessage: formatKnowledgeBatchUploadSuccessMessage,
    uploadDocument: async (knowledgeId, file) => {
      await uploadKnowledgeDocument(knowledgeId, file);
    },
    refreshAfterUpload: (knowledgeId) => {
      refreshDocumentStatus(knowledgeId, {
        reloadDiagnostics: true,
      });
    },
    successMessage: '文档已上传，正在进入索引队列',
    uploadErrorMessage: '上传文档失败，请稍后重试',
    closeTextInputOnSubmit: 'before',
    getUploadUnavailableReason: (knowledgeId) => {
      const targetKnowledge =
        activeKnowledge?.id === knowledgeId
          ? activeKnowledge
          : items.find((knowledge) => knowledge.id === knowledgeId) ?? null;

      if (!targetKnowledge) {
        return '请先选择一个知识库';
      }

      if (targetKnowledge.sourceType !== 'global_docs') {
        return 'global_code 目前只冻结命名空间，暂不支持真实导入';
      }

      return null;
    },
    extractErrorMessage: extractApiErrorMessage,
  });
  const uploading = uploadingKnowledgeId === activeKnowledgeId;

  const {
    retryingDocumentId,
    rebuildingKnowledgeId,
    isDocumentBusy,
    retryDocument: handleRetryDocument,
    rebuildDocument: handleRebuildDocument,
    rebuildKnowledgeDocuments,
    deleteDocument: handleDeleteDocument,
  } = useKnowledgeDocumentActions({
    message,
    extractErrorMessage: extractApiErrorMessage,
    onRefreshKnowledgeState: refreshDocumentStatus,
    onRetryQueued: (knowledgeId, document) => {
      patchActiveKnowledgeDocument(
        document.id,
        queueKnowledgeDocumentForPending(document),
      );
      patchKnowledgeSummary(knowledgeId, {
        indexStatus: 'pending',
        updatedAt: new Date().toISOString(),
      });
    },
    onRebuildDocumentQueued: (knowledgeId, document) => {
      patchActiveKnowledgeDocument(
        document.id,
        queueKnowledgeDocumentForPending(document),
      );
      patchKnowledgeSummary(knowledgeId, {
        indexStatus: 'pending',
        updatedAt: new Date().toISOString(),
      });
    },
    onRebuildKnowledgeQueued: (knowledgeId) => {
      setActiveKnowledge((current) => {
        if (!current) {
          return current;
        }

        return queueKnowledgeForPending(current);
      });
      patchKnowledgeSummary(knowledgeId, {
        indexStatus: 'pending',
        updatedAt: new Date().toISOString(),
      });
    },
    onDocumentDeleted: (knowledgeId, document) => {
      removeActiveKnowledgeDocument(document.id);
      patchKnowledgeSummaryAfterDelete(knowledgeId, document);
    },
  });

  const handleRebuildKnowledge = async () => {
    if (!activeKnowledgeId || !activeKnowledge) {
      message.info('请先选择一个知识库');
      return;
    }

    if (knowledgeRebuildBlockedReason) {
      message.info(knowledgeRebuildBlockedReason);
      return;
    }

    await rebuildKnowledgeDocuments(activeKnowledgeId);
  };

  const confirmDeleteDocument = (document: KnowledgeDocumentResponse) => {
    modal.confirm({
      title: '删除文档',
      content:
        document.status === 'pending' || document.status === 'processing'
          ? '会删除文档记录与原始文件；若后台索引任务刚好完成，系统会继续尝试清理对应向量。'
          : '会删除文档记录、原始文件，并清理对应向量记录。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: async () => {
        await handleDeleteDocument(document);
      },
    });
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
      refreshDocumentStatus(document.knowledgeId);
      return;
    }

    if (key === 'retry') {
      void handleRetryDocument(document);
      return;
    }

    if (key === 'rebuild') {
      void handleRebuildDocument(document);
      return;
    }

    if (key === 'delete') {
      confirmDeleteDocument(document);
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
      <Card className={GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME}>
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
    <GlobalAssetPageLayout
      header={
        <GlobalAssetPageHeader
          title="全局知识库"
          subtitle={KNOWLEDGE_PAGE_SUBTITLE}
          summaryItems={stats}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
              >
                新建知识库
              </Button>
              <Button
                aria-label="刷新状态"
                shape="circle"
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={() => {
                  resetPollingAttempts(activeKnowledgeId);
                  reloadKnowledgeList(activeKnowledgeId);
                  reloadKnowledgeDetail();
                }}
              />
            </div>
          }
        />
      }
      alert={error ? <Alert type="error" showIcon message={error} /> : null}
      sidebar={
        <KnowledgeSidebar
          items={items}
          activeKnowledgeId={activeKnowledgeId}
          onSelectKnowledge={(knowledgeId) => {
            resetPollingAttempts(knowledgeId);
            setActiveKnowledgeId(knowledgeId);
          }}
          onCreateKnowledge={openCreateModal}
        />
      }
    >
      <Card
        className="rounded-3xl! border-slate-200! shadow-surface!"
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
            <Alert type="error" showIcon title={detailError} />
            <Button onClick={reloadKnowledgeDetail}>重试加载详情</Button>
          </div>
        ) : activeKnowledge ? (
          <div className="space-y-4">
            <KnowledgeDetailHeader
              activeKnowledge={activeKnowledge}
              activeSourceMeta={activeSourceMeta}
              activeOverviewStats={activeOverviewStats}
              uploading={uploading}
              deletingKnowledgeId={deletingKnowledgeId}
              onUploadDocument={() => openUploadFlow(activeKnowledge.id)}
              onEditKnowledge={openEditModal}
              onDeleteKnowledge={handleDeleteKnowledge}
            />

            <Tabs
              activeKey={activeTabKey}
              onChange={setActiveTabKey}
              items={[
                {
                  key: 'documents',
                  label: '文档',
                  children: (
                    <KnowledgeDocumentsTab
                      activeKnowledge={activeKnowledge}
                      activeDiagnosticsDocumentMap={activeDiagnosticsDocumentMap}
                      shouldPoll={shouldPoll}
                      pollingStopped={pollingStopped}
                      uploading={uploading}
                      retryingDocumentId={retryingDocumentId}
                      isDocumentBusy={isDocumentBusy}
                      onUploadDocument={() => openUploadFlow(activeKnowledge.id)}
                      onRetryDocument={(document) => {
                        void handleRetryDocument(document);
                      }}
                      onDocumentMenuAction={handleDocumentMenuAction}
                    />
                  ),
                },
                {
                  key: 'ops',
                  label: '运维',
                  children: (
                    <KnowledgeOpsTab
                      activeKnowledgeId={activeKnowledge.id}
                      activeDiagnostics={activeDiagnostics}
                      diagnosticsLoading={diagnosticsLoading}
                      diagnosticsError={diagnosticsError}
                      knowledgeRebuildBlockedReason={knowledgeRebuildBlockedReason}
                      rebuildingKnowledgeId={rebuildingKnowledgeId}
                      onRebuildKnowledge={handleRebuildKnowledge}
                      onReloadDiagnostics={reloadKnowledgeDiagnostics}
                    />
                  ),
                },
                {
                  key: 'search',
                  label: '检索',
                  children: <KnowledgeSearchTab knowledgeId={activeKnowledge.id} />,
                },
              ]}
            />
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

      <input
        ref={fileInputRef}
        type="file"
        accept={DOCUMENT_UPLOAD_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <KnowledgeSourcePickerModal
        open={uploadFlowStep === 'picker'}
        onCancel={closeUploadFlow}
        onUploadClick={triggerDocumentUpload}
        onTextInputClick={handleOpenTextInput}
        onDropFiles={(files) => {
          void handleSelectedFiles(files);
        }}
      />

      <KnowledgeTextInputModal
        open={uploadFlowStep === 'text'}
        submitting={textUploadSubmitting}
        onBack={handleBackToSourcePicker}
        onCancel={closeUploadFlow}
        onSubmit={(values) => {
          void handleSubmitTextSource(values);
        }}
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
                  {
                    value: 'global_code',
                    label: 'global_code · 全局代码（预留）',
                  },
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
    </GlobalAssetPageLayout>
  );
};
