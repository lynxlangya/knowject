import {
  createKnowledge,
  deleteKnowledge,
  updateKnowledge,
  type KnowledgeSummaryResponse,
} from '@api/knowledge';
import { useState } from 'react';
import { toKnowledgePayload } from '../adapters/knowledgePayload.adapter';
import { tp } from '../knowledge.i18n';
import type {
  KnowledgeFormValues,
  KnowledgeModalMode,
} from '../types/knowledgeManagement.types';

interface KnowledgeCrudMessageApi {
  success: (content: string) => void;
  warning: (content: string) => void;
  error: (content: string) => void;
}

interface UseKnowledgeCrudActionsOptions {
  message: KnowledgeCrudMessageApi;
  extractErrorMessage: (error: unknown, fallback: string) => string;
  modalMode: KnowledgeModalMode;
  activeKnowledgeId: string | null;
  items: KnowledgeSummaryResponse[];
  closeModal: () => void;
  reloadKnowledgeList: (preferredId?: string | null) => void;
  reloadKnowledgeDetail: () => void;
  resetPollingAttempts: (nextKnowledgeId?: string | null) => void;
  clearActiveKnowledge: () => void;
}

export const useKnowledgeCrudActions = ({
  message,
  extractErrorMessage,
  modalMode,
  activeKnowledgeId,
  items,
  closeModal,
  reloadKnowledgeList,
  reloadKnowledgeDetail,
  resetPollingAttempts,
  clearActiveKnowledge,
}: UseKnowledgeCrudActionsOptions) => {
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(
    null,
  );

  const submitKnowledge = async (values: KnowledgeFormValues) => {
    setModalSubmitting(true);

    try {
      if (modalMode === 'create') {
        const result = await createKnowledge(toKnowledgePayload(values, 'create'));

        resetPollingAttempts(result.knowledge.id);
        message.success(tp('crud.created'));
        closeModal();
        reloadKnowledgeList(result.knowledge.id);
        return;
      }

      if (!activeKnowledgeId) {
        message.warning(tp('crud.noEditable'));
        return;
      }

      const result = await updateKnowledge(
        activeKnowledgeId,
        toKnowledgePayload(values, 'edit'),
      );

      message.success(tp('crud.updated'));
      closeModal();
      reloadKnowledgeList(result.knowledge.id);
      reloadKnowledgeDetail();
    } catch (currentError) {
      console.error('[KnowledgeManagement] 创建或更新知识库失败:', currentError);
      message.error(
        extractErrorMessage(
          currentError,
          modalMode === 'create'
            ? tp('crud.createFailed')
            : tp('crud.updateFailed'),
        ),
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  const deleteActiveKnowledge = async () => {
    if (!activeKnowledgeId) {
      message.warning(tp('crud.noDeletable'));
      return;
    }

    setDeletingKnowledgeId(activeKnowledgeId);

    try {
      const nextCandidateId =
        items.find((knowledge) => knowledge.id !== activeKnowledgeId)?.id ?? null;

      await deleteKnowledge(activeKnowledgeId);

      resetPollingAttempts(activeKnowledgeId);
      clearActiveKnowledge();
      message.success(tp('crud.deleted'));
      reloadKnowledgeList(nextCandidateId);
    } catch (currentError) {
      console.error('[KnowledgeManagement] 删除知识库失败:', currentError);
      message.error(extractErrorMessage(currentError, tp('crud.deleteFailed')));
    } finally {
      setDeletingKnowledgeId(null);
    }
  };

  return {
    modalSubmitting,
    deletingKnowledgeId,
    submitKnowledge,
    deleteActiveKnowledge,
  };
};
