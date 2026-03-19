import {
  createKnowledge,
  deleteKnowledge,
  updateKnowledge,
  type KnowledgeSummaryResponse,
} from '@api/knowledge';
import { useState } from 'react';
import { toKnowledgePayload } from '../adapters/knowledgePayload.adapter';
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
        toKnowledgePayload(values, 'edit'),
      );

      message.success('知识库信息已更新');
      closeModal();
      reloadKnowledgeList(result.knowledge.id);
      reloadKnowledgeDetail();
    } catch (currentError) {
      console.error('[KnowledgeManagement] 创建或更新知识库失败:', currentError);
      message.error(
        extractErrorMessage(
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

  const deleteActiveKnowledge = async () => {
    if (!activeKnowledgeId) {
      message.warning('当前没有可删除的知识库');
      return;
    }

    setDeletingKnowledgeId(activeKnowledgeId);

    try {
      const nextCandidateId =
        items.find((knowledge) => knowledge.id !== activeKnowledgeId)?.id ?? null;

      await deleteKnowledge(activeKnowledgeId);

      resetPollingAttempts(activeKnowledgeId);
      clearActiveKnowledge();
      message.success('知识库已删除');
      reloadKnowledgeList(nextCandidateId);
    } catch (currentError) {
      console.error('[KnowledgeManagement] 删除知识库失败:', currentError);
      message.error(extractErrorMessage(currentError, '删除知识库失败，请稍后重试'));
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
