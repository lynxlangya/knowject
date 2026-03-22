import {
  deleteKnowledgeDocument,
  rebuildKnowledge,
  rebuildKnowledgeDocument,
  retryKnowledgeDocument,
  type KnowledgeDocumentResponse,
} from '@api/knowledge';
import { useCallback, useState } from 'react';
import { tp } from './knowledge.i18n';

interface KnowledgeActionMessageApi {
  error: (content: string) => void;
  success: (content: string) => void;
}

interface UseKnowledgeDocumentActionsOptions {
  message: KnowledgeActionMessageApi;
  extractErrorMessage?: (error: unknown, fallback: string) => string;
  onRefreshKnowledgeState: (
    knowledgeId: string,
    options?: {
      reloadDiagnostics?: boolean;
    },
  ) => void;
  onRetryQueued?: (
    knowledgeId: string,
    document: KnowledgeDocumentResponse,
  ) => void;
  onRebuildDocumentQueued?: (
    knowledgeId: string,
    document: KnowledgeDocumentResponse,
  ) => void;
  onRebuildKnowledgeQueued?: (knowledgeId: string) => void;
  onDocumentDeleted?: (
    knowledgeId: string,
    document: KnowledgeDocumentResponse,
  ) => void;
  messages?: {
    retrySuccess?: (document: KnowledgeDocumentResponse) => string;
    retryError?: (document: KnowledgeDocumentResponse) => string;
    rebuildDocumentSuccess?: (document: KnowledgeDocumentResponse) => string;
    rebuildDocumentError?: (document: KnowledgeDocumentResponse) => string;
    rebuildKnowledgeSuccess?: (knowledgeId: string) => string;
    rebuildKnowledgeError?: (knowledgeId: string) => string;
    deleteDocumentSuccess?: (document: KnowledgeDocumentResponse) => string;
    deleteDocumentError?: (document: KnowledgeDocumentResponse) => string;
  };
}

export const useKnowledgeDocumentActions = ({
  message,
  extractErrorMessage,
  onRefreshKnowledgeState,
  onRetryQueued,
  onRebuildDocumentQueued,
  onRebuildKnowledgeQueued,
  onDocumentDeleted,
  messages,
}: UseKnowledgeDocumentActionsOptions) => {
  const [retryingDocumentId, setRetryingDocumentId] = useState<string | null>(
    null,
  );
  const [rebuildingDocumentId, setRebuildingDocumentId] = useState<
    string | null
  >(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null,
  );
  const [rebuildingKnowledgeId, setRebuildingKnowledgeId] = useState<
    string | null
  >(null);

  const isDocumentBusy = useCallback(
    (documentId: string) => {
      return (
        retryingDocumentId === documentId ||
        rebuildingDocumentId === documentId ||
        deletingDocumentId === documentId
      );
    },
    [deletingDocumentId, rebuildingDocumentId, retryingDocumentId],
  );

  const retryDocument = useCallback(
    async (document: KnowledgeDocumentResponse) => {
      setRetryingDocumentId(document.id);

      try {
        await retryKnowledgeDocument(document.knowledgeId, document.id);

        onRetryQueued?.(document.knowledgeId, document);
        message.success(
          messages?.retrySuccess?.(document) ??
            (document.status === 'completed'
              ? tp('actionFeedback.retryQueued')
              : tp('actionFeedback.retryRequeued')),
        );
        onRefreshKnowledgeState(document.knowledgeId, {
          reloadDiagnostics: true,
        });
      } catch (currentError) {
        console.error('[KnowledgeActions] 重试文档索引失败:', currentError);
        const fallback =
          messages?.retryError?.(document) ??
          (document.status === 'completed'
            ? tp('actionFeedback.retryFailed')
            : tp('actionFeedback.retryQueueFailed'));
        message.error(
          extractErrorMessage
            ? extractErrorMessage(currentError, fallback)
            : fallback,
        );
      } finally {
        setRetryingDocumentId(null);
      }
    },
    [
      message,
      messages,
      onRefreshKnowledgeState,
      onRetryQueued,
      extractErrorMessage,
    ],
  );

  const rebuildDocument = useCallback(
    async (document: KnowledgeDocumentResponse) => {
      setRebuildingDocumentId(document.id);

      try {
        await rebuildKnowledgeDocument(document.knowledgeId, document.id);

        onRebuildDocumentQueued?.(document.knowledgeId, document);
        message.success(
          messages?.rebuildDocumentSuccess?.(document) ??
            tp('actionFeedback.rebuildDocumentQueued'),
        );
        onRefreshKnowledgeState(document.knowledgeId, {
          reloadDiagnostics: true,
        });
      } catch (currentError) {
        console.error('[KnowledgeActions] 重建文档索引失败:', currentError);
        const fallback =
          messages?.rebuildDocumentError?.(document) ??
          tp('actionFeedback.rebuildDocumentFailed');
        message.error(
          extractErrorMessage
            ? extractErrorMessage(currentError, fallback)
            : fallback,
        );
      } finally {
        setRebuildingDocumentId(null);
      }
    },
    [
      message,
      messages,
      onRebuildDocumentQueued,
      onRefreshKnowledgeState,
      extractErrorMessage,
    ],
  );

  const rebuildKnowledgeDocuments = useCallback(
    async (knowledgeId: string) => {
      setRebuildingKnowledgeId(knowledgeId);

      try {
        await rebuildKnowledge(knowledgeId);

        onRebuildKnowledgeQueued?.(knowledgeId);
        message.success(
          messages?.rebuildKnowledgeSuccess?.(knowledgeId) ??
            tp('actionFeedback.rebuildKnowledgeQueued'),
        );
        onRefreshKnowledgeState(knowledgeId, {
          reloadDiagnostics: true,
        });
      } catch (currentError) {
        console.error('[KnowledgeActions] 重建知识库失败:', currentError);
        const fallback =
          messages?.rebuildKnowledgeError?.(knowledgeId) ??
          tp('actionFeedback.rebuildKnowledgeFailed');
        message.error(
          extractErrorMessage
            ? extractErrorMessage(currentError, fallback)
            : fallback,
        );
      } finally {
        setRebuildingKnowledgeId(null);
      }
    },
    [
      message,
      messages,
      onRebuildKnowledgeQueued,
      onRefreshKnowledgeState,
      extractErrorMessage,
    ],
  );

  const deleteDocument = useCallback(
    async (document: KnowledgeDocumentResponse) => {
      setDeletingDocumentId(document.id);

      try {
        await deleteKnowledgeDocument(document.knowledgeId, document.id);

        onDocumentDeleted?.(document.knowledgeId, document);
        message.success(
          messages?.deleteDocumentSuccess?.(document) ??
            tp('actionFeedback.deleteDocumentSuccess'),
        );
        onRefreshKnowledgeState(document.knowledgeId, {
          reloadDiagnostics: true,
        });
      } catch (currentError) {
        console.error('[KnowledgeActions] 删除文档失败:', currentError);
        const fallback =
          messages?.deleteDocumentError?.(document) ??
          tp('actionFeedback.deleteDocumentFailed');
        message.error(
          extractErrorMessage
            ? extractErrorMessage(currentError, fallback)
            : fallback,
        );
      } finally {
        setDeletingDocumentId(null);
      }
    },
    [
      message,
      messages,
      onDocumentDeleted,
      onRefreshKnowledgeState,
      extractErrorMessage,
    ],
  );

  return {
    retryingDocumentId,
    rebuildingDocumentId,
    deletingDocumentId,
    rebuildingKnowledgeId,
    isDocumentBusy,
    retryDocument,
    rebuildDocument,
    rebuildKnowledgeDocuments,
    deleteDocument,
  };
};
