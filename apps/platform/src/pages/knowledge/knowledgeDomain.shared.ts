import type {
  KnowledgeDetailResponse,
  KnowledgeDocumentResponse,
  KnowledgeDocumentStatus,
  KnowledgeIndexStatus,
  KnowledgeSourceType,
  KnowledgeSummaryResponse,
} from '@api/knowledge';
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { createElement } from 'react';

export interface KnowledgeSourceMeta {
  label: string;
  color: string;
}

export interface KnowledgeDetailOverviewStat {
  label: string;
  value: string;
  emphasis: 'number' | 'time';
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const compactDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
});

export const KNOWLEDGE_INDEX_STATUS_META: Record<
  KnowledgeIndexStatus,
  { label: string; color: string }
> = {
  idle: { label: '待索引', color: 'default' },
  pending: { label: '排队中', color: 'gold' },
  processing: { label: '处理中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
};

export const KNOWLEDGE_INDEX_STATUS_CLASS: Record<
  KnowledgeIndexStatus,
  string
> = {
  idle: 'border-slate-200 bg-slate-100 text-slate-600',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-sky-200 bg-sky-50 text-sky-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const KNOWLEDGE_DOCUMENT_STATUS_META: Record<
  KnowledgeDocumentStatus,
  { label: string; color: string }
> = {
  pending: { label: '排队中', color: 'gold' },
  processing: { label: '处理中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
};

export const KNOWLEDGE_SOURCE_TYPE_META: Record<
  KnowledgeSourceType,
  KnowledgeSourceMeta
> = {
  global_docs: {
    label: '全局文档',
    color: 'blue',
  },
  global_code: {
    label: '全局代码',
    color: 'purple',
  },
};

export const KNOWLEDGE_SOURCE_CLASS: Record<KnowledgeSourceType, string> = {
  global_docs: 'border-slate-200 bg-white text-slate-500',
  global_code: 'border-violet-200 bg-violet-50 text-violet-700',
};

export const KNOWLEDGE_REBUILD_TOOLTIP =
  '重新清理并构建当前知识库下的全部文档向量。';

export const formatKnowledgeDateTime = (
  value: string | null | undefined,
): string => {
  if (!value) {
    return '未记录';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '未记录';
  }

  return dateTimeFormatter.format(date);
};

export const formatKnowledgeCompactDate = (
  value: string | null | undefined,
): string => {
  if (!value) {
    return '未记录';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '未记录';
  }

  return compactDateFormatter.format(date);
};

export const getKnowledgeInitials = (name: string): string => {
  const trimmed = name.trim();

  if (!trimmed) {
    return '知';
  }

  if (/^[a-z0-9]/i.test(trimmed)) {
    return trimmed.slice(0, 2).toUpperCase();
  }

  return trimmed[0] ?? '知';
};

export const pickNextActiveKnowledgeId = (
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

export const hasProcessingKnowledgeDocuments = (
  knowledge: KnowledgeDetailResponse | null,
): boolean => {
  return (
    knowledge?.documents.some(
      (document) =>
        document.status === 'pending' || document.status === 'processing',
    ) ?? false
  );
};

export const resolveKnowledgeIndexStatus = (
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

export const patchKnowledgeDetailDocument = (
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

export const removeKnowledgeDetailDocument = (
  knowledge: KnowledgeDetailResponse,
  documentId: string,
): KnowledgeDetailResponse => {
  const targetDocument = knowledge.documents.find(
    (document) => document.id === documentId,
  );
  const documents = knowledge.documents.filter(
    (document) => document.id !== documentId,
  );

  return {
    ...knowledge,
    documents,
    documentCount: Math.max(
      knowledge.documentCount - (targetDocument ? 1 : 0),
      0,
    ),
    chunkCount: Math.max(
      knowledge.chunkCount - (targetDocument?.chunkCount ?? 0),
      0,
    ),
    indexStatus: resolveKnowledgeIndexStatus(documents),
    updatedAt: new Date().toISOString(),
  };
};

export const queueKnowledgeDocumentForPending = (
  document: KnowledgeDocumentResponse,
): KnowledgeDocumentResponse => {
  return {
    ...document,
    status: 'pending',
    errorMessage: null,
    processedAt: null,
    updatedAt: new Date().toISOString(),
  };
};

export const queueKnowledgeForPending = (
  knowledge: KnowledgeDetailResponse,
): KnowledgeDetailResponse => {
  const documents = knowledge.documents.map(queueKnowledgeDocumentForPending);

  return {
    ...knowledge,
    documents,
    indexStatus: resolveKnowledgeIndexStatus(documents),
    updatedAt: new Date().toISOString(),
  };
};

export const buildKnowledgeRebuildBlockedReason = (
  knowledge: KnowledgeDetailResponse | null,
): string | null => {
  if (!knowledge) {
    return '请先选择一个知识库';
  }

  if (knowledge.documents.length === 0) {
    return '当前知识库没有可重建文档';
  }

  if (
    knowledge.documents.some(
      (document) =>
        document.status === 'pending' || document.status === 'processing',
    )
  ) {
    return '当前仍有文档在排队或处理中，暂不允许整库重建';
  }

  return null;
};

export const buildKnowledgeDetailOverviewStats = (
  knowledge: KnowledgeDetailResponse,
  options?: {
    includeChunkCount?: boolean;
  },
): KnowledgeDetailOverviewStat[] => {
  const items: KnowledgeDetailOverviewStat[] = [
    {
      label: '文档数量',
      value: `${knowledge.documentCount}`,
      emphasis: 'number',
    },
  ];

  if (options?.includeChunkCount) {
    items.push({
      label: '分块数量',
      value: `${knowledge.chunkCount}`,
      emphasis: 'number',
    });
  }

  items.push({
    label: '最近更新',
    value: formatKnowledgeDateTime(knowledge.updatedAt),
    emphasis: 'time',
  });

  return items;
};

export const buildKnowledgeDocumentActionMenuItems = (
  document: KnowledgeDocumentResponse,
  busy: boolean,
): NonNullable<MenuProps['items']> => {
  const commonItems: NonNullable<MenuProps['items']> = [
    {
      key: 'preview',
      icon: createElement(EyeOutlined),
      label: '预览',
    },
    {
      key: 'download',
      icon: createElement(DownloadOutlined),
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
        icon: createElement(ReloadOutlined),
        label: '刷新状态',
        disabled: busy,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        icon: createElement(DeleteOutlined),
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
            icon: createElement(ReloadOutlined),
            label: '重试索引',
            disabled: busy,
          },
        ]
      : []),
    {
      key: 'rebuild',
      icon: createElement(ToolOutlined),
      label: '重建索引',
      disabled: busy,
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: createElement(DeleteOutlined),
      label: '删除文档',
      danger: true,
      disabled: busy,
    },
  ];
};
