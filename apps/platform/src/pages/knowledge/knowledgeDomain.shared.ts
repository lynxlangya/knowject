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
import i18n from '../../i18n';
import { tp } from './knowledge.i18n';

export interface KnowledgeSourceMeta {
  label: string;
  color: string;
}

export interface KnowledgeDetailOverviewStat {
  label: string;
  value: string;
  emphasis: 'number' | 'time';
}

const createMetaWithRuntimeLabel = <TMeta extends Record<string, unknown>>(
  meta: TMeta,
  labelKey: string,
): TMeta & { readonly label: string } => ({
  ...meta,
  get label(): string {
    return tp(labelKey);
  },
});

const getIntlLocale = (): string => {
  return i18n.resolvedLanguage === 'zh-CN' ? 'zh-CN' : 'en-US';
};

export const KNOWLEDGE_INDEX_STATUS_META: Record<
  KnowledgeIndexStatus,
  { label: string; color: string }
> = {
  idle: createMetaWithRuntimeLabel({ color: 'default' }, 'indexStatus.idle'),
  pending: createMetaWithRuntimeLabel({ color: 'gold' }, 'indexStatus.pending'),
  processing: createMetaWithRuntimeLabel(
    { color: 'processing' },
    'indexStatus.processing',
  ),
  completed: createMetaWithRuntimeLabel(
    { color: 'success' },
    'indexStatus.completed',
  ),
  failed: createMetaWithRuntimeLabel({ color: 'error' }, 'indexStatus.failed'),
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
  pending: createMetaWithRuntimeLabel(
    { color: 'gold' },
    'documentStatus.pending',
  ),
  processing: createMetaWithRuntimeLabel(
    { color: 'processing' },
    'documentStatus.processing',
  ),
  completed: createMetaWithRuntimeLabel(
    { color: 'success' },
    'documentStatus.completed',
  ),
  failed: createMetaWithRuntimeLabel(
    { color: 'error' },
    'documentStatus.failed',
  ),
};

export const KNOWLEDGE_SOURCE_TYPE_META: Record<
  KnowledgeSourceType,
  KnowledgeSourceMeta
> = {
  global_docs: createMetaWithRuntimeLabel(
    { color: 'blue' },
    'sourceMeta.global_docs',
  ),
  global_code: createMetaWithRuntimeLabel(
    { color: 'purple' },
    'sourceMeta.global_code',
  ),
};

export const KNOWLEDGE_SOURCE_CLASS: Record<KnowledgeSourceType, string> = {
  global_docs: 'border-slate-200 bg-white text-slate-500',
  global_code: 'border-violet-200 bg-violet-50 text-violet-700',
};

export const KNOWLEDGE_REBUILD_TOOLTIP =
  tp('rebuildTooltip');

export const formatKnowledgeDateTime = (
  value: string | null | undefined,
): string => {
  if (!value) {
    return tp('notRecorded');
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return tp('notRecorded');
  }

  return new Intl.DateTimeFormat(getIntlLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const formatKnowledgeCompactDate = (
  value: string | null | undefined,
): string => {
  if (!value) {
    return tp('notRecorded');
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return tp('notRecorded');
  }

  return new Intl.DateTimeFormat(getIntlLocale(), {
    month: 'numeric',
    day: 'numeric',
  }).format(date);
};

export const getKnowledgeInitials = (name: string): string => {
  const trimmed = name.trim();

  if (!trimmed) {
    return tp('initialsFallback');
  }

  if (/^[a-z0-9]/i.test(trimmed)) {
    return trimmed.slice(0, 2).toUpperCase();
  }

  return trimmed[0] ?? tp('initialsFallback');
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
    return tp('rebuildBlocked.noSelection');
  }

  if (knowledge.documents.length === 0) {
    return tp('rebuildBlocked.noDocuments');
  }

  if (
    knowledge.documents.some(
      (document) =>
        document.status === 'pending' || document.status === 'processing',
    )
  ) {
    return tp('rebuildBlocked.processing');
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
      label: tp('stats.documentCount'),
      value: `${knowledge.documentCount}`,
      emphasis: 'number',
    },
  ];

  if (options?.includeChunkCount) {
    items.push({
      label: tp('stats.chunkCount'),
      value: `${knowledge.chunkCount}`,
      emphasis: 'number',
    });
  }

  items.push({
    label: tp('stats.updatedAt'),
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
      label: tp('documentActions.preview'),
    },
    {
      key: 'download',
      icon: createElement(DownloadOutlined),
      label: tp('documentActions.download'),
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
        label: tp('documentActions.refresh'),
        disabled: busy,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        icon: createElement(DeleteOutlined),
        label: tp('documentActions.delete'),
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
            label: tp('documentActions.retry'),
            disabled: busy,
          },
        ]
      : []),
    {
      key: 'rebuild',
      icon: createElement(ToolOutlined),
      label: tp('documentActions.rebuild'),
      disabled: busy,
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: createElement(DeleteOutlined),
      label: tp('documentActions.delete'),
      danger: true,
      disabled: busy,
    },
  ];
};
