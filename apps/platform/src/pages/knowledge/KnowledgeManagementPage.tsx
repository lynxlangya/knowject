import {
  CloudUploadOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Tag,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { extractApiErrorMessage } from "@api/error";
import {
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
  updateKnowledge,
  uploadKnowledgeDocument,
  type CreateKnowledgeRequest,
  type KnowledgeDocumentResponse,
  type KnowledgeSourceType,
  type KnowledgeSummaryResponse,
  type UpdateKnowledgeRequest,
} from "@api/knowledge";
import { KnowledgeSourcePickerModal } from "./components/KnowledgeSourcePickerModal";
import { KnowledgeSearchTab } from "./components/KnowledgeSearchTab";
import { KnowledgeTextInputModal } from "./components/KnowledgeTextInputModal";
import {
  DOCUMENT_UPLOAD_ACCEPT,
  KNOWLEDGE_UPLOAD_TOOLTIP,
} from "./knowledgeUpload.shared";
import {
  GLOBAL_ASSET_CONTENT_CARD_CLASS_NAME,
  GlobalAssetPageHeader,
  GlobalAssetPageLayout,
  GlobalAssetSidebar,
  GlobalAssetSidebarItem,
  GlobalAssetSidebarSection,
  type GlobalAssetSummaryItem,
} from "@pages/assets/components/GlobalAssetLayout";
import {
  buildKnowledgeDetailOverviewStats,
  buildKnowledgeDocumentActionMenuItems,
  buildKnowledgeRebuildBlockedReason,
  formatKnowledgeCompactDate,
  formatKnowledgeDateTime,
  getKnowledgeInitials,
  KNOWLEDGE_DOCUMENT_STATUS_META,
  KNOWLEDGE_INDEX_STATUS_CLASS,
  KNOWLEDGE_INDEX_STATUS_META,
  KNOWLEDGE_REBUILD_TOOLTIP,
  KNOWLEDGE_SOURCE_CLASS,
  KNOWLEDGE_SOURCE_TYPE_META,
  patchKnowledgeDetailDocument,
  pickNextActiveKnowledgeId,
  queueKnowledgeDocumentForPending,
  queueKnowledgeForPending,
  removeKnowledgeDetailDocument,
} from "./knowledgeDomain.shared";
import { useKnowledgeDetailState } from "./useKnowledgeDetailState";
import { useKnowledgeDocumentActions } from "./useKnowledgeDocumentActions";
import { useKnowledgeUploadFlow } from "./useKnowledgeUploadFlow";

interface KnowledgeFormValues {
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
}

const KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY = "knowledge-batch-upload";

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
const KNOWLEDGE_PAGE_SUBTITLE = "统一索引全局文档，供技能与智能体复用";

const toKnowledgePayload = (
  values: KnowledgeFormValues,
  mode: "create" | "edit",
): CreateKnowledgeRequest | UpdateKnowledgeRequest => {
  const payload = {
    name: values.name.trim(),
    description: values.description?.trim() ?? "",
  };

  if (mode === "create") {
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
      knowledge.indexStatus === "pending" ||
      knowledge.indexStatus === "processing",
  ).length;
  const failedCount = items.filter(
    (knowledge) => knowledge.indexStatus === "failed",
  ).length;
  const attentionCount = processingCount + failedCount;

  return [
    {
      label: "知识库总数",
      value: `${items.length} 个`,
      hint: "当前纳入治理的全局知识集合。",
    },
    {
      label: "文档总数",
      value: `${totalDocuments} 份`,
      hint: "已上传到各知识库的原始文档规模。",
    },
    {
      label: "分块总量",
      value: `${totalChunks} 段`,
      hint: "直接反映当前检索与向量索引体量。",
    },
    {
      label: "需关注索引",
      value: `${attentionCount} 个`,
      hint:
        attentionCount === 0
          ? "当前没有排队、处理中或失败的知识库。"
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
  const isFirstLoadRef = useRef(true);
  const preferredActiveIdRef = useRef<string | null>(null);
  const [items, setItems] = useState<KnowledgeSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeKnowledgeId, setActiveKnowledgeId] = useState<string | null>(
    null,
  );
  const [activeTabKey, setActiveTabKey] = useState("documents");
  const [listReloadToken, setListReloadToken] = useState(0);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(
    null,
  );

  const stats = buildKnowledgeStats(items);
  const activeSummary =
    items.find((knowledge) => knowledge.id === activeKnowledgeId) ?? null;
  const reloadKnowledgeList = (preferredId?: string | null) => {
    preferredActiveIdRef.current = preferredId ?? null;
    setListReloadToken((value) => value + 1);
  };
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
      preferredActiveIdRef.current = knowledgeId;
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
  const activeDiagnosticsDocumentMap = new Map(
    (activeDiagnostics?.documents ?? []).map((document) => [
      document.id,
      document,
    ]),
  );

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

        console.error(
          "[KnowledgeManagement] 加载知识库列表失败:",
          currentError,
        );
        setError(
          extractApiErrorMessage(
            currentError,
            "加载知识库列表失败，请稍后重试",
          ),
        );
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
          isFirstLoadRef.current = false;
        }
      }
    };

    void loadKnowledgeList();

    return () => {
      isMounted = false;
    };
  }, [listReloadToken]);

  useEffect(() => {
    setActiveTabKey("documents");
  }, [activeKnowledgeId]);

  const openCreateModal = () => {
    form.setFieldsValue({
      name: "",
      description: "",
      sourceType: "global_docs",
    });
    setModalMode("create");
  };

  const openEditModal = () => {
    if (!activeKnowledge) {
      message.info("请先选择一个知识库");
      return;
    }

    form.setFieldsValue({
      name: activeKnowledge.name,
      description: activeKnowledge.description,
      sourceType: activeKnowledge.sourceType,
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    form.resetFields();
  };

  const handleSubmitKnowledge = async (values: KnowledgeFormValues) => {
    setModalSubmitting(true);

    try {
      if (modalMode === "create") {
        const result = await createKnowledge(
          toKnowledgePayload(values, "create") as CreateKnowledgeRequest,
        );

        resetPollingAttempts(result.knowledge.id);
        message.success("知识库已创建");
        closeModal();
        reloadKnowledgeList(result.knowledge.id);
        return;
      }

      if (!activeKnowledgeId) {
        message.warning("当前没有可编辑的知识库");
        return;
      }

      const result = await updateKnowledge(
        activeKnowledgeId,
        toKnowledgePayload(values, "edit") as UpdateKnowledgeRequest,
      );

      message.success("知识库信息已更新");
      closeModal();
      reloadKnowledgeList(result.knowledge.id);
      reloadKnowledgeDetail();
    } catch (currentError) {
      console.error(
        "[KnowledgeManagement] 创建或更新知识库失败:",
        currentError,
      );
      message.error(
        extractApiErrorMessage(
          currentError,
          modalMode === "create"
            ? "创建知识库失败，请稍后重试"
            : "更新知识库失败，请稍后重试",
        ),
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteKnowledge = async () => {
    if (!activeKnowledgeId) {
      message.warning("当前没有可删除的知识库");
      return;
    }

    setDeletingKnowledgeId(activeKnowledgeId);

    try {
      const nextCandidateId =
        items.find((knowledge) => knowledge.id !== activeKnowledgeId)?.id ??
        null;

      await deleteKnowledge(activeKnowledgeId);

      resetPollingAttempts(activeKnowledgeId);
      setActiveKnowledge(null);
      message.success("知识库已删除");
      reloadKnowledgeList(nextCandidateId);
    } catch (currentError) {
      console.error("[KnowledgeManagement] 删除知识库失败:", currentError);
      message.error(
        extractApiErrorMessage(currentError, "删除知识库失败，请稍后重试"),
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
    successMessage: "文档已上传，正在进入索引队列",
    uploadErrorMessage: "上传文档失败，请稍后重试",
    closeTextInputOnSubmit: "before",
    getUploadUnavailableReason: (knowledgeId) => {
      const targetKnowledge =
        activeKnowledge?.id === knowledgeId
          ? activeKnowledge
          : items.find((knowledge) => knowledge.id === knowledgeId) ?? null;

      if (!targetKnowledge) {
        return "请先选择一个知识库";
      }

      if (targetKnowledge.sourceType !== "global_docs") {
        return "global_code 目前只冻结命名空间，暂不支持真实导入";
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
        indexStatus: "pending",
        updatedAt: new Date().toISOString(),
      });
    },
    onRebuildDocumentQueued: (knowledgeId, document) => {
      patchActiveKnowledgeDocument(
        document.id,
        queueKnowledgeDocumentForPending(document),
      );
      patchKnowledgeSummary(knowledgeId, {
        indexStatus: "pending",
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
        indexStatus: "pending",
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
      message.info("请先选择一个知识库");
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
      title: "删除文档",
      content:
        document.status === "pending" || document.status === "processing"
          ? "会删除文档记录与原始文件；若后台索引任务刚好完成，系统会继续尝试清理对应向量。"
          : "会删除文档记录、原始文件，并清理对应向量记录。",
      okText: "删除",
      cancelText: "取消",
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
    if (key === "preview") {
      message.info(`“${document.fileName}”预览原文即将开放`);
      return;
    }

    if (key === "download") {
      message.info(`“${document.fileName}”下载原文即将开放`);
      return;
    }

    if (key === "refresh") {
      refreshDocumentStatus(document.knowledgeId);
      return;
    }

    if (key === "retry") {
      void handleRetryDocument(document);
      return;
    }

    if (key === "rebuild") {
      void handleRebuildDocument(document);
      return;
    }

    if (key === "delete") {
      confirmDeleteDocument(document);
    }
  };

  const renderDocumentCard = (document: KnowledgeDocumentResponse) => {
    const statusMeta = KNOWLEDGE_DOCUMENT_STATUS_META[document.status];
    const indexedAt = document.lastIndexedAt ?? document.processedAt;
    const busy = isDocumentBusy(document.id);
    const documentDiagnostics =
      activeDiagnosticsDocumentMap.get(document.id) ?? null;

    return (
      <article
        key={document.id}
        className="rounded-card border border-slate-200 bg-slate-50/80 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <Tooltip
            title={
              <div className="space-y-1 text-xs">
                <div>格式：{document.mimeType}</div>
                <div>索引完成：{formatKnowledgeDateTime(indexedAt)}</div>
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
                {documentDiagnostics?.missingStorage ? (
                  <Tag color="error">原文件缺失</Tag>
                ) : null}
                {documentDiagnostics?.staleProcessing ? (
                  <Tag color="warning">处理卡住</Tag>
                ) : null}
              </div>
            </div>
          </Tooltip>

          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: buildKnowledgeDocumentActionMenuItems(document, busy),
              onClick: ({ key }) => handleDocumentMenuAction(document, key),
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              loading={busy}
              aria-label={`更多操作：${document.fileName}`}
            />
          </Dropdown>
        </div>

        <Typography.Text className="mt-3 block text-xs text-slate-500">
          上传于 {formatKnowledgeDateTime(document.uploadedAt)} · 最近索引{" "}
          {formatKnowledgeDateTime(indexedAt)}
        </Typography.Text>

        {document.errorMessage ? (
          <Alert
            className="mt-4"
            type="error"
            showIcon
            title="处理失败"
            description={document.errorMessage}
            action={
              <Button
                size="small"
                type="link"
                disabled={busy}
                loading={retryingDocumentId === document.id}
                onClick={() => {
                  void handleRetryDocument(document);
                }}
              >
                重试
              </Button>
            }
          />
        ) : null}
      </article>
    );
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
              <Tooltip title="刷新状态">
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
              </Tooltip>
            </div>
          }
        />
      }
      alert={error ? <Alert type="error" showIcon message={error} /> : null}
      sidebar={
        <GlobalAssetSidebar
          header={
            <div className="flex items-end justify-between gap-3">
              <Typography.Title level={5} className="mb-0! text-slate-800!">
                知识库列表
              </Typography.Title>
              <Typography.Text className="text-xs text-slate-400">
                共 {items.length} 个
              </Typography.Text>
            </div>
          }
        >
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
            <GlobalAssetSidebarSection>
              {items.map((knowledge) => {
                const indexStatusMeta =
                  KNOWLEDGE_INDEX_STATUS_META[knowledge.indexStatus];
                const sourceTypeMeta =
                  KNOWLEDGE_SOURCE_TYPE_META[knowledge.sourceType];
                const isActive = knowledge.id === activeKnowledgeId;
                const compactMeta = `${knowledge.documentCount} 份文档 · ${formatKnowledgeCompactDate(
                  knowledge.updatedAt,
                )} 更新`;

                return (
                  <GlobalAssetSidebarItem
                    key={knowledge.id}
                    active={isActive}
                    onClick={() => {
                      resetPollingAttempts(knowledge.id);
                      setActiveKnowledgeId(knowledge.id);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        size={36}
                        className="shrink-0 bg-slate-200 text-slate-600"
                      >
                        {getKnowledgeInitials(knowledge.name)}
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Typography.Text
                            className={`truncate text-label font-semibold ${
                              isActive ? "text-slate-900!" : "text-slate-800!"
                            }`}
                          >
                            {knowledge.name}
                          </Typography.Text>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${KNOWLEDGE_SOURCE_CLASS[knowledge.sourceType]}`}
                          >
                            {sourceTypeMeta.label}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${KNOWLEDGE_INDEX_STATUS_CLASS[knowledge.indexStatus]}`}
                          >
                            {indexStatusMeta.label}
                          </span>
                        </div>

                        <Typography.Text className="mt-1 block truncate text-caption text-slate-500">
                          {compactMeta}
                        </Typography.Text>
                      </div>
                    </div>
                  </GlobalAssetSidebarItem>
                );
              })}
            </GlobalAssetSidebarSection>
          )}
        </GlobalAssetSidebar>
      }
    >
      <Card
        className="rounded-3xl! border-slate-200! shadow-surface!"
        styles={{ body: { padding: "20px" } }}
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Typography.Title level={4} className="mb-0! text-slate-800!">
                    {activeKnowledge.name}
                  </Typography.Title>
                  {activeSourceMeta ? (
                    <Tag color={activeSourceMeta.color}>
                      {activeSourceMeta.label}
                    </Tag>
                  ) : null}
                  <Tag
                    color={
                      KNOWLEDGE_INDEX_STATUS_META[activeKnowledge.indexStatus].color
                    }
                  >
                    {KNOWLEDGE_INDEX_STATUS_META[activeKnowledge.indexStatus].label}
                  </Tag>
                </div>
                <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-600!">
                  {activeKnowledge.description || "当前未填写描述。"}
                </Typography.Paragraph>
              </div>

              <div className="flex flex-wrap gap-2">
                <Tooltip
                  title={
                    activeKnowledge.sourceType === "global_docs"
                      ? KNOWLEDGE_UPLOAD_TOOLTIP
                      : "global_code 当前不支持上传文档。"
                  }
                >
                  <span>
                    <Button
                      icon={<CloudUploadOutlined />}
                      loading={uploading}
                      disabled={activeKnowledge.sourceType !== "global_docs"}
                      onClick={() => openUploadFlow(activeKnowledge.id)}
                    >
                      上传文档
                    </Button>
                  </span>
                </Tooltip>
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

            <div className="overflow-hidden rounded-card-lg border border-slate-200 bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="grid gap-px bg-slate-200 md:grid-cols-2">
                {activeOverviewStats.map((item) => (
                  <div key={item.label} className="bg-slate-50/75 px-4 py-4">
                    <Typography.Text className="text-caption font-medium uppercase tracking-[0.14em] text-slate-400">
                      {item.label}
                    </Typography.Text>
                    <Typography.Text
                      className={`mt-3 block text-slate-800 ${
                        item.emphasis === "number"
                          ? "text-3xl font-semibold leading-none tracking-tight"
                          : "text-lg font-semibold leading-7"
                      }`}
                    >
                      {item.value}
                    </Typography.Text>
                  </div>
                ))}
              </div>
            </div>

            <Tabs
              activeKey={activeTabKey}
              onChange={setActiveTabKey}
              items={[
                {
                  key: "documents",
                  label: "文档",
                  children: (
                    <div className="space-y-4">
                      <div className="space-y-4">
                        {shouldPoll ? (
                          <Alert
                            type={pollingStopped ? "warning" : "info"}
                            showIcon
                            title={
                              pollingStopped
                                ? "自动刷新已达到本轮上限，请手动刷新继续观察。"
                                : "检测到待处理文档，页面会做最小轮询以更新索引状态。"
                            }
                          />
                        ) : null}
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <FileTextOutlined className="text-slate-400" />
                            <Typography.Title
                              level={5}
                              className="mb-0! text-slate-800!"
                            >
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
                              activeKnowledge.sourceType === "global_docs"
                                ? "当前知识库还没有文档，上传一份 .md 或 .txt 开始索引。"
                                : "global_code 当前还没有真实代码导入入口。"
                            }
                          >
                            {activeKnowledge.sourceType === "global_docs" ? (
                              <Button
                                type="primary"
                                icon={<CloudUploadOutlined />}
                                loading={uploading}
                                onClick={() => openUploadFlow(activeKnowledge.id)}
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
                  ),
                },
                {
                  key: "ops",
                  label: "运维",
                  children: (
                    <section className="overflow-hidden rounded-card-lg border border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(241,245,249,0.88))] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <ToolOutlined className="text-slate-400" />
                            <Typography.Title
                              level={5}
                              className="mb-0! text-slate-800!"
                            >
                              索引运维
                            </Typography.Title>
                          </div>
                          <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-500!">
                            查看当前 collection、indexer
                            与文档健康快照，并在这里发起最小 rebuild。
                          </Typography.Paragraph>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Tooltip
                            title={
                              knowledgeRebuildBlockedReason ??
                              KNOWLEDGE_REBUILD_TOOLTIP
                            }
                          >
                            <span>
                              <Button
                                icon={<ToolOutlined />}
                                loading={
                                  rebuildingKnowledgeId === activeKnowledge.id
                                }
                                disabled={Boolean(
                                  knowledgeRebuildBlockedReason,
                                )}
                                onClick={() => {
                                  void handleRebuildKnowledge();
                                }}
                              >
                                重建全部文档
                              </Button>
                            </span>
                          </Tooltip>
                          <Button
                            icon={<ReloadOutlined />}
                            loading={diagnosticsLoading}
                            onClick={reloadKnowledgeDiagnostics}
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
                                  label: "待处理文档",
                                  value: `${activeDiagnostics.documentSummary.pending + activeDiagnostics.documentSummary.processing}`,
                                  accent: "text-sky-700",
                                },
                                {
                                  label: "失败文档",
                                  value: `${activeDiagnostics.documentSummary.failed}`,
                                  accent:
                                    activeDiagnostics.documentSummary.failed > 0
                                      ? "text-rose-700"
                                      : "text-slate-700",
                                },
                                {
                                  label: "原文件缺失",
                                  value: `${activeDiagnostics.documentSummary.missingStorage}`,
                                  accent:
                                    activeDiagnostics.documentSummary
                                      .missingStorage > 0
                                      ? "text-amber-700"
                                      : "text-slate-700",
                                },
                                {
                                  label: "处理卡住",
                                  value: `${activeDiagnostics.documentSummary.staleProcessing}`,
                                  accent:
                                    activeDiagnostics.documentSummary
                                      .staleProcessing > 0
                                      ? "text-amber-700"
                                      : "text-slate-700",
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
                                color={
                                  activeDiagnostics.collection.exists
                                    ? "success"
                                    : "error"
                                }
                              >
                                Collection · {activeDiagnostics.collection.name}
                              </Tag>
                              <Tag
                                color={
                                  activeDiagnostics.indexer.status === "ok"
                                    ? "success"
                                    : "warning"
                                }
                              >
                                Indexer ·{" "}
                                {activeDiagnostics.indexer.status === "ok"
                                  ? "运行正常"
                                  : "降级"}
                              </Tag>
                              {activeDiagnostics.indexer.embeddingProvider ? (
                                <Tag color="blue">
                                  Embedding ·{" "}
                                  {activeDiagnostics.indexer.embeddingProvider}
                                </Tag>
                              ) : null}
                              {activeDiagnostics.indexer.chunkSize !== null &&
                              activeDiagnostics.indexer.chunkOverlap !==
                                null ? (
                                <Tag color="default">
                                  Chunk · {activeDiagnostics.indexer.chunkSize}{" "}
                                  / {activeDiagnostics.indexer.chunkOverlap}
                                </Tag>
                              ) : null}
                            </div>

                            {activeDiagnostics.collection.errorMessage ? (
                              <Alert
                                type="warning"
                                showIcon
                                icon={<DatabaseOutlined />}
                                title="Collection 检查已降级"
                                description={
                                  activeDiagnostics.collection.errorMessage
                                }
                              />
                            ) : null}

                            {activeDiagnostics.indexer.errorMessage ? (
                              <Alert
                                type="warning"
                                showIcon
                                title="Indexer 运行态已降级"
                                description={
                                  activeDiagnostics.indexer.errorMessage
                                }
                              />
                            ) : null}

                            {activeDiagnostics.documentSummary.failed > 0 ||
                            activeDiagnostics.documentSummary.missingStorage >
                              0 ||
                            activeDiagnostics.documentSummary.staleProcessing >
                              0 ? (
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
                                  activeDiagnostics.indexer.service ?? "unknown"
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
                  ),
                },
                {
                  key: "search",
                  label: "检索",
                  children: (
                    <KnowledgeSearchTab knowledgeId={activeKnowledge.id} />
                  ),
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
                : "请选择左侧知识库查看详情。"
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
        open={uploadFlowStep === "picker"}
        onCancel={closeUploadFlow}
        onUploadClick={triggerDocumentUpload}
        onTextInputClick={handleOpenTextInput}
        onDropFiles={(files) => {
          void handleSelectedFiles(files);
        }}
      />

      <KnowledgeTextInputModal
        open={uploadFlowStep === "text"}
        submitting={textUploadSubmitting}
        onBack={handleBackToSourcePicker}
        onCancel={closeUploadFlow}
        onSubmit={(values) => {
          void handleSubmitTextSource(values);
        }}
      />

      <Modal
        title={modalMode === "create" ? "新建知识库" : "编辑知识库"}
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
            name: "",
            description: "",
            sourceType: "global_docs",
          }}
        >
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[
              {
                required: true,
                message: "请输入知识库名称",
              },
            ]}
          >
            <Input maxLength={80} placeholder="例如：产品规范库" />
          </Form.Item>

          {modalMode === "create" ? (
            <Form.Item name="sourceType" label="来源类型">
              <Select
                options={[
                  { value: "global_docs", label: "global_docs · 全局文档" },
                  {
                    value: "global_code",
                    label: "global_code · 全局代码（预留）",
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
