import {
  CloudUploadOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Dropdown,
  Empty,
  Tooltip,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import type {
  KnowledgeDetailResponse,
  KnowledgeDocumentResponse,
} from '@api/knowledge';
import {
  buildKnowledgeDocumentActionMenuItems,
  formatKnowledgeDateTime,
} from '../knowledgeDomain.shared';
import type { KnowledgeDocumentStatus } from '@api/knowledge';
import type { CSSProperties } from 'react';

interface KnowledgeDocumentsTabProps {
  activeKnowledge: KnowledgeDetailResponse;
  shouldPoll: boolean;
  pollingStopped: boolean;
  uploading: boolean;
  retryingDocumentId: string | null;
  isDocumentBusy: (documentId: string) => boolean;
  onUploadDocument: () => void;
  onRetryDocument: (document: KnowledgeDocumentResponse) => void;
  onDocumentMenuAction: (
    document: KnowledgeDocumentResponse,
    key: string,
  ) => void;
}

// ── File type config ──────────────────────────────────────────────────────────

interface FileTypeConfig {
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
}

const FILE_TYPE_CONFIGS: Array<{
  exts?: readonly string[];
  mimePrefixes?: readonly string[];
  mimeEquals?: readonly string[];
  config: FileTypeConfig;
}> = [
  { exts: ['pdf'],                mimeEquals: ['application/pdf'],           config: { icon: <FilePdfOutlined />,       accent: '#E84040', accentBg: 'rgba(232,64,64,0.08)' } },
  { exts: ['doc','docx'],         mimePrefixes: ['word','document'],         config: { icon: <FileWordOutlined />,     accent: '#4A90D9', accentBg: 'rgba(74,144,217,0.08)' } },
  { exts: ['xls','xlsx','csv'],   mimePrefixes: ['excel','spreadsheet'],     config: { icon: <FileExcelOutlined />,    accent: '#34A853', accentBg: 'rgba(52,168,83,0.08)' } },
  { exts: ['ppt','pptx'],         mimePrefixes: ['powerpoint','presentation'],config:{ icon: <FilePptOutlined />,    accent: '#FF6B35', accentBg: 'rgba(255,107,53,0.08)' } },
  { exts: ['png','jpg','jpeg','gif','bmp','svg','webp','ico'], mimePrefixes: ['image/'], config: { icon: <FileImageOutlined />,   accent: '#9B59B6', accentBg: 'rgba(155,89,182,0.08)' } },
  { exts: ['md','markdown'],       mimeEquals: ['text/markdown'],            config: { icon: <FileMarkdownOutlined />, accent: '#1A8A77', accentBg: 'rgba(40,184,160,0.08)' } },
  { exts: ['zip','tar','gz','rar','7z'], mimePrefixes: ['zip','compressed'], config: { icon: <FileZipOutlined />,      accent: '#D4A017', accentBg: 'rgba(212,160,23,0.08)' } },
  { exts: ['txt','rtf'],           mimePrefixes: ['text/'],                 config: { icon: <FileTextOutlined />,     accent: '#64748b', accentBg: 'rgba(100,116,139,0.06)' } },
];

const DEFAULT_FILE_CONFIG: FileTypeConfig = {
  icon: <FileOutlined />,
  accent: '#94A3B8',
  accentBg: 'rgba(148,163,184,0.06)',
};

const getFileTypeConfig = (fileName: string, mimeType: string): FileTypeConfig => {
  const ext = (fileName.split('.').pop() ?? '').toLowerCase();
  for (const entry of FILE_TYPE_CONFIGS) {
    if (entry.exts?.includes(ext)) return entry.config;
    if (entry.mimeEquals?.some((m) => mimeType === m)) return entry.config;
    if (entry.mimePrefixes?.some((m) => mimeType.startsWith(m))) return entry.config;
  }
  return DEFAULT_FILE_CONFIG;
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_DOT_COLOR: Record<KnowledgeDocumentStatus, string> = {
  completed: '#28B8A0',
  processing: '#5EC8E8',
  pending: '#D4A017',
  failed: '#F87171',
};

// ── Card ─────────────────────────────────────────────────────────────────────

const DocumentCard = ({
  document,
  busy,
  accentConfig,
  dotColor,
  onRetry,
  retryingDocumentId,
  onMenuAction,
  t,
}: {
  document: KnowledgeDocumentResponse;
  busy: boolean;
  accentConfig: FileTypeConfig;
  dotColor: string;
  onRetry: () => void;
  retryingDocumentId: string | null;
  onMenuAction: (key: string) => void;
  t: ReturnType<typeof useTranslation<'pages'>>['t'];
}) => {
  return (
    <article
      className="doc-tile"
      style={
        {
          '--tile-accent': accentConfig.accent,
          '--tile-accent-bg': accentConfig.accentBg,
        } as CSSProperties
      }
    >
      {/* Status dot */}
      <span
        className="doc-tile__dot"
        style={{ background: dotColor }}
        aria-label={document.status}
      />

      {/* Menu */}
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: buildKnowledgeDocumentActionMenuItems(document, busy),
          onClick: ({ key }) => onMenuAction(key),
        }}
      >
        <button
          type="button"
          className="doc-tile__menu"
          aria-label="Document menu"
        >
          <MoreOutlined />
        </button>
      </Dropdown>

      {/* Icon */}
      <Tooltip
        title={
          <div className="space-y-1 text-xs">
            <div>{document.mimeType}</div>
            <div>{formatKnowledgeDateTime(document.uploadedAt)}</div>
          </div>
        }
        placement="right"
      >
        <div className="doc-tile__icon">{accentConfig.icon}</div>
      </Tooltip>

      {/* File name */}
      <Tooltip title={document.fileName} placement="top">
        <p className="doc-tile__name">{document.fileName}</p>
      </Tooltip>

      {/* Error */}
      {document.errorMessage ? (
        <Alert
          className="doc-tile__error"
          type="error"
          showIcon
          message={document.errorMessage}
          action={
            <Button
              size="small"
              type="link"
              disabled={busy}
              loading={retryingDocumentId === document.id}
              onClick={onRetry}
            >
              {t('knowledge.documents.retry')}
            </Button>
          }
        />
      ) : null}
    </article>
  );
};

// ── Tab ──────────────────────────────────────────────────────────────────────

export const KnowledgeDocumentsTab = ({
  activeKnowledge,
  shouldPoll,
  pollingStopped,
  uploading,
  retryingDocumentId,
  isDocumentBusy,
  onUploadDocument,
  onRetryDocument,
  onDocumentMenuAction,
}: KnowledgeDocumentsTabProps) => {
  const { t } = useTranslation('pages');

  return (
    <div className="space-y-4">
      {shouldPoll ? (
        <Alert
          type={pollingStopped ? 'warning' : 'info'}
          showIcon
          title={
            pollingStopped
              ? t('knowledge.documents.pollingStopped')
              : t('knowledge.documents.pollingActive')
          }
        />
      ) : null}

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileTextOutlined className="text-slate-400" />
            <Typography.Title level={5} className="mb-0! text-slate-800!">
              {t('knowledge.documents.listTitle')}
            </Typography.Title>
          </div>
          <Typography.Text className="text-xs text-slate-400">
            {t('knowledge.documents.listCount', {
              count: activeKnowledge.documents.length,
            })}
          </Typography.Text>
        </div>

        {activeKnowledge.documents.length === 0 ? (
          <Empty
            className="my-12"
            description={
              activeKnowledge.sourceType === 'global_docs'
                ? t('knowledge.documents.emptyDocs')
                : t('knowledge.documents.emptyCode')
            }
          >
            {activeKnowledge.sourceType === 'global_docs' ? (
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={uploading}
                onClick={onUploadDocument}
              >
                {t('knowledge.documents.uploadFirst')}
              </Button>
            ) : null}
          </Empty>
        ) : (
          <div className="doc-tile-grid">
            {activeKnowledge.documents.map((document) => {
              const busy = isDocumentBusy(document.id);
              const accentConfig = getFileTypeConfig(
                document.fileName,
                document.mimeType,
              );
              const dotColor = STATUS_DOT_COLOR[document.status];

              return (
                <DocumentCard
                  key={document.id}
                  document={document}
                  busy={busy}
                  accentConfig={accentConfig}
                  dotColor={dotColor}
                  onRetry={() => onRetryDocument(document)}
                  retryingDocumentId={retryingDocumentId}
                  onMenuAction={(key) =>
                    onDocumentMenuAction(document, key)
                  }
                  t={t}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
