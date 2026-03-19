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
import { useRef } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  uploadKnowledgeDocument,
  type KnowledgeDocumentResponse,
  type KnowledgeDiagnosticsDocumentResponse,
  type KnowledgeSummaryResponse,
} from '@api/knowledge';
import {
  GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME,
  GlobalAssetPageHeader,
  GlobalAssetPageLayout,
} from '@pages/assets/components/GlobalAssetLayout';
import { buildKnowledgeStats } from './adapters/knowledgeStats.adapter';
import { KnowledgeDetailHeader } from './components/KnowledgeDetailHeader';
import { KnowledgeSidebar } from './components/KnowledgeSidebar';
import { KnowledgeSourcePickerModal } from './components/KnowledgeSourcePickerModal';
import { KnowledgeTextInputModal } from './components/KnowledgeTextInputModal';
import {
  KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY,
  KNOWLEDGE_FORM_INITIAL_VALUES,
  KNOWLEDGE_PAGE_SUBTITLE,
  KNOWLEDGE_SOURCE_TYPE_OPTIONS,
} from './constants/knowledgeManagement.constants';
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
import { useKnowledgeCrudActions } from './hooks/useKnowledgeCrudActions';
import { useKnowledgeDocumentMenuActions } from './hooks/useKnowledgeDocumentMenuActions';
import { useKnowledgeModalState } from './hooks/useKnowledgeModalState';
import { useKnowledgeRefreshCoordination } from './hooks/useKnowledgeRefreshCoordination';
import { useKnowledgeTabOrchestration } from './hooks/useKnowledgeTabOrchestration';
import type { KnowledgeFormValues } from './types/knowledgeManagement.types';
import { useKnowledgeDetailState } from './useKnowledgeDetailState';
import { useKnowledgeDocumentActions } from './useKnowledgeDocumentActions';
import { useKnowledgeListState } from './useKnowledgeListState';
import { useKnowledgeUploadFlow } from './useKnowledgeUploadFlow';
import {
  formatKnowledgeBatchUploadProgress,
  formatKnowledgeBatchUploadSuccessMessage,
} from './utils/knowledgeMessages';

export const KnowledgeManagementPage = () => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<KnowledgeFormValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const {
    refreshDocumentStatus,
    refreshCurrentKnowledge,
    selectKnowledge,
  } = useKnowledgeRefreshCoordination({
    activeKnowledgeId,
    resetPollingAttempts,
    reloadKnowledgeList,
    reloadKnowledgeDetail,
    refreshKnowledgeState,
    setActiveKnowledgeId,
  });

  const {
    modalMode,
    modalOpen,
    modalTitle,
    openCreateModal,
    openEditModal,
    closeModal,
    isCreateMode,
  } = useKnowledgeModalState({
    form,
    activeKnowledge,
    message,
  });

  const {
    modalSubmitting,
    deletingKnowledgeId,
    submitKnowledge: handleSubmitKnowledge,
    deleteActiveKnowledge: handleDeleteKnowledge,
  } = useKnowledgeCrudActions({
    message,
    extractErrorMessage: extractApiErrorMessage,
    modalMode,
    activeKnowledgeId,
    items,
    closeModal,
    reloadKnowledgeList,
    reloadKnowledgeDetail,
    resetPollingAttempts,
    clearActiveKnowledge: () => setActiveKnowledge(null),
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

  const { handleDocumentMenuAction } = useKnowledgeDocumentMenuActions({
    message,
    modal,
    onRefreshDocumentStatus: refreshDocumentStatus,
    onRetryDocument: handleRetryDocument,
    onRebuildDocument: handleRebuildDocument,
    onDeleteDocument: handleDeleteDocument,
  });

  const { activeTabResetKey, tabItems } = useKnowledgeTabOrchestration({
    activeKnowledgeId,
    activeKnowledge,
    activeDiagnosticsDocumentMap,
    shouldPoll,
    pollingStopped,
    uploading,
    retryingDocumentId,
    isDocumentBusy,
    onUploadDocument: () => {
      if (activeKnowledge) {
        openUploadFlow(activeKnowledge.id);
      }
    },
    onRetryDocument: (document) => {
      void handleRetryDocument(document);
    },
    onDocumentMenuAction: handleDocumentMenuAction,
    activeDiagnostics,
    diagnosticsLoading,
    diagnosticsError,
    knowledgeRebuildBlockedReason,
    rebuildingKnowledgeId,
    onRebuildKnowledge: handleRebuildKnowledge,
    onReloadDiagnostics: reloadKnowledgeDiagnostics,
  });

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
                onClick={refreshCurrentKnowledge}
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
          onSelectKnowledge={selectKnowledge}
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
              key={activeTabResetKey}
              defaultActiveKey="documents"
              items={tabItems}
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
        title={modalTitle}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={modalSubmitting}
        destroyOnHidden
      >
        <Form<KnowledgeFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSubmitKnowledge(values)}
          initialValues={KNOWLEDGE_FORM_INITIAL_VALUES}
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

          {isCreateMode ? (
            <Form.Item name="sourceType" label="来源类型">
              <Select options={KNOWLEDGE_SOURCE_TYPE_OPTIONS} />
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
