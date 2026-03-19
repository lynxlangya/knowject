import type { KnowledgeDocumentResponse } from '@api/knowledge';
import { useCallback } from 'react';
import {
  buildKnowledgeDocumentDownloadPendingMessage,
  buildKnowledgeDocumentPreviewPendingMessage,
} from '../utils/knowledgeMessages';

interface KnowledgeDocumentActionMessageApi {
  info: (content: string) => void;
}

interface KnowledgeDocumentActionModalApi {
  confirm: (config: {
    title: string;
    content: string;
    okText: string;
    cancelText: string;
    okButtonProps: {
      danger: boolean;
    };
    centered: boolean;
    onOk: () => Promise<void>;
  }) => void;
}

interface UseKnowledgeDocumentMenuActionsOptions {
  message: KnowledgeDocumentActionMessageApi;
  modal: KnowledgeDocumentActionModalApi;
  onRefreshDocumentStatus: (knowledgeId: string) => void;
  onRetryDocument: (document: KnowledgeDocumentResponse) => Promise<void>;
  onRebuildDocument: (document: KnowledgeDocumentResponse) => Promise<void>;
  onDeleteDocument: (document: KnowledgeDocumentResponse) => Promise<void>;
}

export const useKnowledgeDocumentMenuActions = ({
  message,
  modal,
  onRefreshDocumentStatus,
  onRetryDocument,
  onRebuildDocument,
  onDeleteDocument,
}: UseKnowledgeDocumentMenuActionsOptions) => {
  const confirmDeleteDocument = useCallback(
    (document: KnowledgeDocumentResponse) => {
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
          await onDeleteDocument(document);
        },
      });
    },
    [modal, onDeleteDocument],
  );

  const handleDocumentMenuAction = useCallback(
    (document: KnowledgeDocumentResponse, key: string) => {
      if (key === 'preview') {
        message.info(buildKnowledgeDocumentPreviewPendingMessage(document.fileName));
        return;
      }

      if (key === 'download') {
        message.info(buildKnowledgeDocumentDownloadPendingMessage(document.fileName));
        return;
      }

      if (key === 'refresh') {
        onRefreshDocumentStatus(document.knowledgeId);
        return;
      }

      if (key === 'retry') {
        void onRetryDocument(document);
        return;
      }

      if (key === 'rebuild') {
        void onRebuildDocument(document);
        return;
      }

      if (key === 'delete') {
        confirmDeleteDocument(document);
      }
    },
    [
      confirmDeleteDocument,
      message,
      onRebuildDocument,
      onRefreshDocumentStatus,
      onRetryDocument,
    ],
  );

  return {
    handleDocumentMenuAction,
  };
};
