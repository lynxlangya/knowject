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
import { useTranslation } from 'react-i18next';
import { extractApiErrorMessage } from '@api/error';
import {
  uploadKnowledgeDocument,
  type KnowledgeDocumentResponse,
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
import { tp } from './knowledge.i18n';

export const KnowledgeManagementPage = () => {
  const { message, modal } = App.useApp();
  const { t } = useTranslation('pages');
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

  const activeOverviewStats = activeKnowledge
    ? buildKnowledgeDetailOverviewStats(activeKnowledge)
    : [];
  const knowledgeRebuildBlockedReason =
    buildKnowledgeRebuildBlockedReason(activeKnowledge);

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
    successMessage: tp('upload.success'),
    uploadErrorMessage: tp('upload.error'),
    closeTextInputOnSubmit: 'before',
    getUploadUnavailableReason: (knowledgeId) => {
      const targetKnowledge =
        activeKnowledge?.id === knowledgeId
          ? activeKnowledge
          : items.find((knowledge) => knowledge.id === knowledgeId) ?? null;

      if (!targetKnowledge) {
        return tp('upload.emptyTarget');
      }

      if (targetKnowledge.sourceType !== 'global_docs') {
        return tp('upload.sourceUnavailable');
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
      message.info(tp('upload.emptyTarget'));
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
          {t('knowledge.management.title')}
        </Typography.Title>
        <Typography.Paragraph className="text-slate-500!">
          {error}
        </Typography.Paragraph>
        <Button onClick={() => reloadKnowledgeList()}>{t('knowledge.management.reload')}</Button>
      </Card>
    );
  }

  return (
    <GlobalAssetPageLayout
      header={
        <GlobalAssetPageHeader
          title={t('knowledge.management.headerTitle')}
          subtitle={KNOWLEDGE_PAGE_SUBTITLE}
          summaryItems={stats}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
              >
                {t('knowledge.management.create')}
              </Button>
              <Button
                aria-label={t('knowledge.management.refreshAria')}
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
            description={t('knowledge.management.emptyDetail')}
          />
        ) : detailLoading && !activeKnowledge ? (
          <div className="flex min-h-90 items-center justify-center">
            <Spin size="large" />
          </div>
        ) : detailError ? (
          <div className="space-y-4">
            <Alert type="error" showIcon title={detailError} />
            <Button onClick={reloadKnowledgeDetail}>{t('knowledge.management.retryDetail')}</Button>
          </div>
        ) : activeKnowledge ? (
          <div className="space-y-4">
            <KnowledgeDetailHeader
              activeKnowledge={activeKnowledge}
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
                ? t('knowledge.management.detailUnavailable', {
                    name: activeSummary.name,
                  })
                : t('knowledge.management.detailPrompt')
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
            label={t('knowledge.management.form.name')}
            rules={[
              {
                required: true,
                message: t('knowledge.management.form.nameRequired'),
              },
            ]}
          >
            <Input maxLength={80} placeholder={t('knowledge.management.form.namePlaceholder')} />
          </Form.Item>

          {isCreateMode ? (
            <Form.Item name="sourceType" label={t('knowledge.management.form.sourceType')}>
              <Select options={KNOWLEDGE_SOURCE_TYPE_OPTIONS} />
            </Form.Item>
          ) : null}

          <Form.Item name="description" label={t('knowledge.management.form.description')}>
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 5 }}
              maxLength={240}
              placeholder={t('knowledge.management.form.descriptionPlaceholder')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </GlobalAssetPageLayout>
  );
};
