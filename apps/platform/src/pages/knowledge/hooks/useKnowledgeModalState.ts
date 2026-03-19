import type { KnowledgeDetailResponse } from '@api/knowledge';
import type { FormInstance } from 'antd';
import { useCallback, useState } from 'react';
import { KNOWLEDGE_FORM_INITIAL_VALUES } from '../constants/knowledgeManagement.constants';
import type {
  KnowledgeFormValues,
  KnowledgeModalMode,
} from '../types/knowledgeManagement.types';

interface KnowledgeModalMessageApi {
  info: (content: string) => void;
}

interface UseKnowledgeModalStateOptions {
  form: FormInstance<KnowledgeFormValues>;
  activeKnowledge: KnowledgeDetailResponse | null;
  message: KnowledgeModalMessageApi;
}

export const useKnowledgeModalState = ({
  form,
  activeKnowledge,
  message,
}: UseKnowledgeModalStateOptions) => {
  const [modalMode, setModalMode] = useState<KnowledgeModalMode>(null);

  const openCreateModal = useCallback(() => {
    form.setFieldsValue(KNOWLEDGE_FORM_INITIAL_VALUES);
    setModalMode('create');
  }, [form]);

  const openEditModal = useCallback(() => {
    if (!activeKnowledge) {
      message.info('请先选择一个知识库');
      return;
    }

    form.setFieldsValue({
      name: activeKnowledge.name,
      description: activeKnowledge.description,
      sourceType: activeKnowledge.sourceType,
    });
    setModalMode('edit');
  }, [activeKnowledge, form, message]);

  const closeModal = useCallback(() => {
    setModalMode(null);
    form.resetFields();
  }, [form]);

  return {
    modalMode,
    modalOpen: modalMode !== null,
    modalTitle: modalMode === 'create' ? '新建知识库' : '编辑知识库',
    openCreateModal,
    openEditModal,
    closeModal,
    isCreateMode: modalMode === 'create',
  };
};
