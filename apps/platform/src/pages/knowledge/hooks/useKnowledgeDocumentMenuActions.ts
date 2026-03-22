import type { KnowledgeDocumentResponse } from '@api/knowledge';
import { useCallback } from 'react';
import {
  buildKnowledgeDocumentDownloadPendingMessage,
  buildKnowledgeDocumentPreviewPendingMessage,
} from '../utils/knowledgeMessages';
import { tp } from '../knowledge.i18n';

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
        title: tp('modal.deleteDocumentTitle'),
        content:
          document.status === 'pending' || document.status === 'processing'
            ? tp('modal.deleteDocumentDescriptionDone')
            : tp('modal.deleteDocumentDescriptionDefault'),
        okText: tp('modal.delete'),
        cancelText: tp('modal.cancel'),
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
