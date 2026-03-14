import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
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
  Tooltip,
  Typography,
} from 'antd';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  createKnowledge,
  deleteKnowledge,
  getKnowledgeDetail,
  listKnowledge,
  updateKnowledge,
  uploadKnowledgeDocument,
  deleteKnowledgeDocument,
  retryKnowledgeDocument,
  type CreateKnowledgeRequest,
  type KnowledgeDetailResponse,
  type KnowledgeDocumentResponse,
  type KnowledgeDocumentStatus,
  type KnowledgeIndexStatus,
  type KnowledgeSourceType,
  type KnowledgeSummaryResponse,
  type UpdateKnowledgeRequest,
} from '@api/knowledge';
import { KnowledgeSourcePickerModal } from './components/KnowledgeSourcePickerModal';
import {
  KnowledgeTextInputModal,
  type KnowledgeTextInputValues,
} from './components/KnowledgeTextInputModal';
import type { MenuProps } from 'antd';

interface KnowledgeFormValues {
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
}

interface KnowledgeSourceMeta {
  label: string;
  color: string;
}

type UploadFlowStep = 'picker' | 'text';
const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const compactDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
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

const KNOWLEDGE_INDEX_STATUS_CLASS: Record<KnowledgeIndexStatus, string> = {
  idle: 'border-slate-200 bg-slate-100 text-slate-600',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-sky-200 bg-sky-50 text-sky-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
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

const SOURCE_TYPE_META: Record<KnowledgeSourceType, KnowledgeSourceMeta> = {
  global_docs: {
    label: '全局文档',
    color: 'blue',
  },
  global_code: {
    label: '全局代码',
    color: 'purple',
  },
};

const KNOWLEDGE_SOURCE_CLASS: Record<KnowledgeSourceType, string> = {
  global_docs: 'border-slate-200 bg-white text-slate-500',
  global_code: 'border-violet-200 bg-violet-50 text-violet-700',
};

const DOCUMENT_UPLOAD_ACCEPT =
  '.md,.markdown,.txt,text/markdown,text/plain';
const DOCUMENT_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const DOCUMENT_UPLOAD_SOFT_WARNING_BYTES = 20 * 1024 * 1024;
const SUPPORTED_DOCUMENT_EXTENSIONS = ['.md', '.markdown', '.txt'] as const;
const MAX_POLLING_ATTEMPTS = 20;
const POLLING_INTERVAL_MS = 1500;
const KNOWLEDGE_PAGE_SUBTITLE = '统一索引全局文档，供技能与智能体复用';
const KNOWLEDGE_UPLOAD_TOOLTIP =
  '支持 .md /.txt 上传，单文件上限 50 MB，20 MB 以上建议拆分上传。';

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '未记录';
  }

  return dateTimeFormatter.format(new Date(value));
};

const formatCompactDate = (value: string | null | undefined): string => {
  if (!value) {
    return '未记录';
  }

  return compactDateFormatter.format(new Date(value));
};

const getKnowledgeInitials = (name: string): string => {
  const trimmed = name.trim();

  if (!trimmed) {
    return '知';
  }

  if (/^[a-z0-9]/i.test(trimmed)) {
    return trimmed.slice(0, 2).toUpperCase();
  }

  return trimmed[0] ?? '知';
};

const getFileExtension = (fileName: string): string => {
  const extensionIndex = fileName.lastIndexOf('.');

  if (extensionIndex < 0) {
    return '';
  }

  return fileName.slice(extensionIndex).toLowerCase();
};

const validateKnowledgeSourceFile = (file: File): string | null => {
  const extension = getFileExtension(file.name);

  if (!SUPPORTED_DOCUMENT_EXTENSIONS.includes(extension as (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number])) {
    return '仅支持 md、markdown、txt 文件';
  }

  if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
    return '文件大小不能超过 50 MB';
  }

  return null;
};

const shouldWarnLargeKnowledgeSourceFile = (file: File): boolean => {
  return file.size > DOCUMENT_UPLOAD_SOFT_WARNING_BYTES;
};

const sanitizeTextSourceTitle = (value: string): string => {
  return value.replace(/[\\/:*?"<>|]+/g, '-').trim();
};

const buildFallbackTextSourceFileName = (): string => {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, '0'),
    `${now.getDate()}`.padStart(2, '0'),
    '-',
    `${now.getHours()}`.padStart(2, '0'),
    `${now.getMinutes()}`.padStart(2, '0'),
    `${now.getSeconds()}`.padStart(2, '0'),
  ];

  return `文本来源-${parts.join('')}.txt`;
};

const createTextSourceFile = ({
  title,
  content,
}: KnowledgeTextInputValues): File => {
  const normalizedTitle = sanitizeTextSourceTitle(title?.trim() ?? '').replace(
    /\.txt$/i,
    '',
  );
  const trimmedContent = content.trim();
  const fileName = normalizedTitle
    ? `${normalizedTitle}.txt`
    : buildFallbackTextSourceFileName();
  const fileContent = normalizedTitle
    ? `${normalizedTitle}\n\n${trimmedContent}`
    : trimmedContent;

  return new File([fileContent], fileName, {
    type: 'text/plain;charset=utf-8',
  });
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

const resolveKnowledgeIndexStatus = (
  documents: Array<Pick<KnowledgeDocumentResponse, 'status'>>,
): KnowledgeIndexStatus => {
  if (documents.length === 0) {
    return 'idle';
  }

  if (documents.some((document) => document.status === 'processing')) {
    return 'processing';
  }

  if (documents.some((document) => document.status === 'pending')) {
    return 'pending';
  }

  if (documents.some((document) => document.status === 'failed')) {
    return 'failed';
  }

  if (documents.every((document) => document.status === 'completed')) {
    return 'completed';
  }

  return 'idle';
};

const patchDocumentInKnowledgeDetail = (
  knowledge: KnowledgeDetailResponse,
  documentId: string,
  patch: Partial<KnowledgeDocumentResponse>,
): KnowledgeDetailResponse => {
  const documents = knowledge.documents.map((document) =>
    document.id === documentId
      ? {
          ...document,
          ...patch,
        }
      : document,
  );

  return {
    ...knowledge,
    documents,
    indexStatus: resolveKnowledgeIndexStatus(documents),
    updatedAt: new Date().toISOString(),
  };
};

const removeDocumentFromKnowledgeDetail = (
  knowledge: KnowledgeDetailResponse,
  documentId: string,
): KnowledgeDetailResponse => {
  const targetDocument = knowledge.documents.find((document) => document.id === documentId);
  const documents = knowledge.documents.filter((document) => document.id !== documentId);

  return {
    ...knowledge,
    documents,
    documentCount: Math.max(knowledge.documentCount - (targetDocument ? 1 : 0), 0),
    chunkCount: Math.max(knowledge.chunkCount - (targetDocument?.chunkCount ?? 0), 0),
    indexStatus: resolveKnowledgeIndexStatus(documents),
    updatedAt: new Date().toISOString(),
  };
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

  return [
    {
      label: '知识库总数',
      value: `${items.length} 个`,
    },
    {
      label: '文档总数',
      value: `${totalDocuments} 份`,
    },
  ];
};

const buildKnowledgeDetailOverviewStats = (knowledge: KnowledgeDetailResponse) => {
  return [
    {
      label: '文档数量',
      value: `${knowledge.documentCount}`,
      emphasis: 'number' as const,
    },
    {
      label: '最近更新',
      value: formatDateTime(knowledge.updatedAt),
      emphasis: 'time' as const,
    },
  ];
};

export const KnowledgeManagementPage = () => {
  const { message, modal } = App.useApp();
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
  const [uploadFlowStep, setUploadFlowStep] = useState<UploadFlowStep | null>(null);
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(null);
  const [retryingDocumentId, setRetryingDocumentId] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const stats = buildKnowledgeStats(items);
  const activeSummary =
    items.find((knowledge) => knowledge.id === activeKnowledgeId) ?? null;
  const activeSourceMeta = activeKnowledge
    ? SOURCE_TYPE_META[activeKnowledge.sourceType]
    : null;
  const activeOverviewStats = activeKnowledge
    ? buildKnowledgeDetailOverviewStats(activeKnowledge)
    : [];
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

        console.error(
          '[KnowledgeManagement] 加载知识库列表失败:',
          currentError,
        );
        setError(
          extractApiErrorMessage(currentError, '加载知识库列表失败，请稍后重试'),
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

        console.error(
          '[KnowledgeManagement] 加载知识库详情失败:',
          currentError,
        );
        setActiveKnowledge(null);
        setDetailError(
          extractApiErrorMessage(currentError, '加载知识库详情失败，请稍后重试'),
        );
      } finally {
        if (isMounted) {
          setDetailLoading(false);
        }
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

  const closeUploadFlow = () => {
    setUploadFlowStep(null);
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
      console.error(
        '[KnowledgeManagement] 创建或更新知识库失败:',
        currentError,
      );
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

      delete pollingAttemptsRef.current[activeKnowledgeId];
      setActiveKnowledge(null);
      setDetailError(null);
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

  const openUploadFlow = () => {
    if (!activeKnowledge) {
      message.info('请先选择一个知识库');
      return;
    }

    if (activeKnowledge.sourceType !== 'global_docs') {
      message.info('global_code 目前只冻结命名空间，暂不支持真实导入');
      return;
    }

    setUploadFlowStep('picker');
  };

  const uploadKnowledgeSource = async (file: File) => {
    if (!activeKnowledgeId || !activeKnowledge) {
      message.info('请先选择一个知识库');
      return;
    }

    if (activeKnowledge.sourceType !== 'global_docs') {
      message.info('global_code 目前只冻结命名空间，暂不支持真实导入');
      return;
    }

    const validationError = validateKnowledgeSourceFile(file);

    if (validationError) {
      message.error(validationError);
      return;
    }

    if (shouldWarnLargeKnowledgeSourceFile(file)) {
      message.warning('文件超过 20 MB，建议按主题拆分上传，索引更快也更稳');
    }

    setUploading(true);

    try {
      await uploadKnowledgeDocument(activeKnowledgeId, file);

      pollingAttemptsRef.current[activeKnowledgeId] = 0;
      message.success('文档已上传，正在进入索引队列');
      reloadKnowledgeList(activeKnowledgeId);
      reloadKnowledgeDetail();
    } catch (currentError) {
      console.error('[KnowledgeManagement] 上传文档失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '上传文档失败，请稍后重试'),
      );
    } finally {
      setUploading(false);
    }
  };

  const triggerDocumentUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSelectedFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    closeUploadFlow();

    if (files.length > 1) {
      message.info('当前一次仅支持上传 1 个文件');
    }

    await uploadKnowledgeSource(files[0]);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    await handleSelectedFiles(files);
  };

  const handleOpenTextInput = () => {
    setUploadFlowStep('text');
  };

  const handleBackToSourcePicker = () => {
    setUploadFlowStep('picker');
  };

  const handleSubmitTextSource = async (values: KnowledgeTextInputValues) => {
    closeUploadFlow();
    await uploadKnowledgeSource(createTextSourceFile(values));
  };

  const patchActiveKnowledgeDocument = (
    documentId: string,
    patch: Partial<KnowledgeDocumentResponse>,
  ) => {
    setActiveKnowledge((current) => {
      if (!current) {
        return current;
      }

      return patchDocumentInKnowledgeDetail(current, documentId, patch);
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

      return removeDocumentFromKnowledgeDetail(current, documentId);
    });
  };

  const isDocumentBusy = (documentId: string): boolean => {
    return retryingDocumentId === documentId || deletingDocumentId === documentId;
  };

  const refreshDocumentStatus = (knowledgeId: string) => {
    resetPollingAttempts(knowledgeId);
    reloadKnowledgeList(knowledgeId);
    reloadKnowledgeDetail();
  };

  const handleRetryDocument = async (document: KnowledgeDocumentResponse) => {
    if (!activeKnowledgeId) {
      message.info('请先选择一个知识库');
      return;
    }

    setRetryingDocumentId(document.id);

    try {
      await retryKnowledgeDocument(activeKnowledgeId, document.id);

      patchActiveKnowledgeDocument(document.id, {
        status: 'pending',
        errorMessage: null,
        processedAt: null,
        updatedAt: new Date().toISOString(),
      });
      patchKnowledgeSummary(activeKnowledgeId, {
        indexStatus: 'pending',
        updatedAt: new Date().toISOString(),
      });
      resetPollingAttempts(activeKnowledgeId);
      message.success(
        document.status === 'completed'
          ? '文档已进入重新索引队列'
          : '文档已重新进入索引队列',
      );
      refreshDocumentStatus(activeKnowledgeId);
    } catch (currentError) {
      console.error(
        '[KnowledgeManagement] 重试文档索引失败:',
        currentError,
      );
      message.error(
        extractApiErrorMessage(
          currentError,
          document.status === 'completed'
            ? '重新索引失败，请稍后重试'
            : '重试索引失败，请稍后重试',
        ),
      );
    } finally {
      setRetryingDocumentId(null);
    }
  };

  const handleDeleteDocument = async (document: KnowledgeDocumentResponse) => {
    if (!activeKnowledgeId) {
      message.info('请先选择一个知识库');
      return;
    }

    setDeletingDocumentId(document.id);

    try {
      await deleteKnowledgeDocument(activeKnowledgeId, document.id);

      removeActiveKnowledgeDocument(document.id);
      patchKnowledgeSummary(activeKnowledgeId, {
        documentCount: Math.max((activeSummary?.documentCount ?? 1) - 1, 0),
        chunkCount: Math.max((activeSummary?.chunkCount ?? 0) - document.chunkCount, 0),
        updatedAt: new Date().toISOString(),
      });
      message.success('文档已删除');
      refreshDocumentStatus(activeKnowledgeId);
    } catch (currentError) {
      console.error('[KnowledgeManagement] 删除文档失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '删除文档失败，请稍后重试'),
      );
    } finally {
      setDeletingDocumentId(null);
    }
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
      {
        key: 'retry',
        icon: <ReloadOutlined />,
        label: document.status === 'completed' ? '重新索引' : '重试索引',
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
      refreshDocumentStatus(document.knowledgeId);
      return;
    }

    if (key === 'retry') {
      void handleRetryDocument(document);
      return;
    }

    if (key === 'delete') {
      confirmDeleteDocument(document);
    }
  };

  const renderDocumentCard = (document: KnowledgeDocumentResponse) => {
    const statusMeta = DOCUMENT_STATUS_META[document.status];
    const indexedAt = document.lastIndexedAt ?? document.processedAt;
    const busy = isDocumentBusy(document.id);

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
                <div>索引完成：{formatDateTime(indexedAt)}</div>
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
              </div>
            </div>
          </Tooltip>

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
              aria-label={`更多操作：${document.fileName}`}
            />
          </Dropdown>
        </div>

        <Typography.Text className="mt-3 block text-xs text-slate-500">
          上传于 {formatDateTime(document.uploadedAt)}
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
    <section className="flex min-h-full flex-col gap-4 pr-4 md:pr-5">
      <Card
        className="rounded-[24px]! border-slate-200! shadow-[0_12px_30px_rgba(15,23,42,0.04)]!"
        styles={{ body: { padding: '22px 22px 20px' } }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Typography.Title level={3} className="mb-0! text-slate-800!">
              全局知识库
            </Typography.Title>
            <Typography.Paragraph className="mb-0! mt-2 text-sm! text-slate-500!">
              {KNOWLEDGE_PAGE_SUBTITLE}
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
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="min-w-[160px] rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4"
            >
              <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {item.label}
              </Typography.Text>
              <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
                {item.value}
              </Typography.Title>
            </div>
          ))}
        </div>
      </Card>

      {error ? <Alert type="error" showIcon title={error} /> : null}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card
          className="rounded-[24px]! border-slate-200! shadow-[0_8px_24px_rgba(15,23,42,0.035)]!"
          styles={{ body: { padding: '20px' } }}
        >
          <div className="flex items-center justify-between gap-3">
            <Typography.Title level={5} className="mb-0! text-slate-800!">
              知识库列表
            </Typography.Title>
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
            <div className="mt-5 flex flex-col gap-2">
              {items.map((knowledge) => {
                const indexStatusMeta = INDEX_STATUS_META[knowledge.indexStatus];
                const sourceTypeMeta = SOURCE_TYPE_META[knowledge.sourceType];
                const isActive = knowledge.id === activeKnowledgeId;
                const compactMeta = `${knowledge.documentCount} 份文档 · ${formatCompactDate(
                  knowledge.updatedAt,
                )} 更新`;

                return (
                  <button
                    key={knowledge.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      pollingAttemptsRef.current[knowledge.id] = 0;
                      setActiveKnowledgeId(knowledge.id);
                    }}
                    className={`w-full rounded-[16px] border px-3 py-2.5 text-left transition ${
                      isActive
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                    }`}
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
                          <Typography.Text className="truncate text-[13px] font-semibold text-slate-800!">
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

                        <Typography.Text className="mt-1 block truncate text-[11px] text-slate-500">
                          {compactMeta}
                        </Typography.Text>
                      </div>
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
                  <Tooltip
                    title={
                      activeKnowledge.sourceType === 'global_docs'
                        ? KNOWLEDGE_UPLOAD_TOOLTIP
                        : 'global_code 当前不支持上传文档。'
                    }
                  >
                    <span>
                      <Button
                        icon={<CloudUploadOutlined />}
                        loading={uploading}
                        disabled={activeKnowledge.sourceType !== 'global_docs'}
                        onClick={openUploadFlow}
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

              <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="grid gap-px bg-slate-200 md:grid-cols-2">
                  {activeOverviewStats.map((item) => (
                    <div
                      key={item.label}
                      className="bg-slate-50/75 px-4 py-4"
                    >
                      <Typography.Text className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                        {item.label}
                      </Typography.Text>
                      <Typography.Text
                        className={`mt-3 block text-slate-800 ${
                          item.emphasis === 'number'
                            ? 'text-[30px] font-semibold leading-none tracking-tight'
                            : 'text-lg font-semibold leading-7'
                        }`}
                      >
                        {item.value}
                      </Typography.Text>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-4">
                  {shouldPoll ? (
                    <Alert
                      type={pollingStopped ? 'warning' : 'info'}
                      showIcon
                      title={
                        pollingStopped
                          ? '自动刷新已达到本轮上限，请手动刷新继续观察。'
                          : '检测到待处理文档，页面会做最小轮询以更新索引状态。'
                      }
                    />
                  ) : null}
                </div>

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
                          ? '当前知识库还没有文档，上传一份 .md 或 .txt 开始索引。'
                          : 'global_code 当前还没有真实代码导入入口。'
                      }
                    >
                      {activeKnowledge.sourceType === 'global_docs' ? (
                        <Button
                          type="primary"
                          icon={<CloudUploadOutlined />}
                          loading={uploading}
                          onClick={openUploadFlow}
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
        accept={DOCUMENT_UPLOAD_ACCEPT}
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
        submitting={uploading}
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
