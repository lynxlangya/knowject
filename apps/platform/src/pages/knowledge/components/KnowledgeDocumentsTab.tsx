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
              aria-label={`更多操作：${document.fileName}`}
            />
          </Dropdown>
        </div>

        <Typography.Text className="mt-3 block text-xs text-slate-500">
          上传于 {formatKnowledgeDateTime(document.uploadedAt)} · 最近索引{' '}
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
                onClick={() => onRetryDocument(document)}
              >
                重试
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
                onClick={onUploadDocument}
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
  );
};
