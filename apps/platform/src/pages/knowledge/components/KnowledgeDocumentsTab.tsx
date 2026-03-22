import {
  CloudUploadOutlined,
  FileTextOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Dropdown,
  Empty,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import type {
  KnowledgeDetailResponse,
  KnowledgeDiagnosticsDocumentResponse,
  KnowledgeDocumentResponse,
} from '@api/knowledge';
import {
  buildKnowledgeDocumentActionMenuItems,
  formatKnowledgeDateTime,
  KNOWLEDGE_DOCUMENT_STATUS_META,
} from '../knowledgeDomain.shared';

interface KnowledgeDocumentsTabProps {
  activeKnowledge: KnowledgeDetailResponse;
  activeDiagnosticsDocumentMap: ReadonlyMap<
    string,
    KnowledgeDiagnosticsDocumentResponse
  >;
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

export const KnowledgeDocumentsTab = ({
  activeKnowledge,
  activeDiagnosticsDocumentMap,
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
                <div>{t('knowledge.documents.tooltipFormat', { value: document.mimeType })}</div>
                <div>{t('knowledge.documents.tooltipIndexedAt', { value: formatKnowledgeDateTime(indexedAt) })}</div>
                <div>{t('knowledge.documents.tooltipChunkCount', { count: document.chunkCount })}</div>
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
                  <Tag color="error">{t('knowledge.documents.missingStorage')}</Tag>
                ) : null}
                {documentDiagnostics?.staleProcessing ? (
                  <Tag color="warning">{t('knowledge.documents.staleProcessing')}</Tag>
                ) : null}
              </div>
            </div>
          </Tooltip>

          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: buildKnowledgeDocumentActionMenuItems(document, busy),
              onClick: ({ key }) => onDocumentMenuAction(document, key),
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              loading={busy}
              aria-label={t('knowledge.documents.moreActions', { fileName: document.fileName })}
            />
          </Dropdown>
        </div>

        <Typography.Text className="mt-3 block text-xs text-slate-500">
          {t('knowledge.documents.uploadedAt', {
            uploadedAt: formatKnowledgeDateTime(document.uploadedAt),
            indexedAt: formatKnowledgeDateTime(indexedAt),
          })}
        </Typography.Text>

        {document.errorMessage ? (
          <Alert
            className="mt-4"
            type="error"
            showIcon
            title={t('knowledge.documents.failedTitle')}
            description={document.errorMessage}
            action={
              <Button
                size="small"
                type="link"
                disabled={busy}
                loading={retryingDocumentId === document.id}
                onClick={() => onRetryDocument(document)}
              >
                {t('knowledge.documents.retry')}
              </Button>
            }
          />
        ) : null}
      </article>
    );
  };

  return (
    <div className="space-y-4">
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
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
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
          <div className="mt-4 space-y-3">
            {activeKnowledge.documents.map(renderDocumentCard)}
          </div>
        )}
      </div>
    </div>
  );
};
