import { Form } from 'antd';
import { useState } from 'react';
import {
  createAgent,
  updateAgent,
  type AgentResponse,
} from '@api/agents';
import { extractApiErrorMessage } from '@api/error';
import { createAgentPayload } from '../adapters/agentPayload.adapter';
import { AGENT_FORM_INITIAL_VALUES } from '../constants/agentsManagement.constants';
import type { AgentFormValues, ModalMode } from '../types/agentsManagement.types';

interface MessageLike {
  success: (content: string) => void;
  error: (content: string) => void;
}

interface UseAgentFormParams {
  message: MessageLike;
  onUpsertAgent: (agent: AgentResponse) => void;
}

export const useAgentForm = ({ message, onUpsertAgent }: UseAgentFormParams) => {
  const [form] = Form.useForm<AgentFormValues>();
  const watchedSkillIds = Form.useWatch('boundSkillIds', form);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingAgent, setEditingAgent] = useState<AgentResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingAgent(null);
    setModalMode('create');
    form.setFieldsValue(AGENT_FORM_INITIAL_VALUES);
  };

  const openEditModal = (agent: AgentResponse) => {
    setEditingAgent(agent);
    setModalMode('edit');
    form.setFieldsValue({
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      boundKnowledgeIds: agent.boundKnowledgeIds,
      boundSkillIds: agent.boundSkillIds,
      status: agent.status,
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingAgent(null);
    form.resetFields();
  };

  const handleSubmitAgent = async (values: AgentFormValues) => {
    setSubmitting(true);

    try {
      const payload = createAgentPayload(values);
      const result =
        modalMode === 'edit' && editingAgent
          ? await updateAgent(editingAgent.id, payload)
          : await createAgent(payload);

      onUpsertAgent(result.agent);
      message.success(modalMode === 'edit' ? '智能体已更新' : '智能体已创建');
      closeModal();
    } catch (currentError) {
      console.error('[AgentsManagementPage] 保存智能体失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, '保存智能体失败，请稍后重试'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    closeModal,
    editingAgent,
    form,
    handleSubmitAgent,
    modalMode,
    openCreateModal,
    openEditModal,
    submitting,
    watchedSkillIds: watchedSkillIds ?? [],
  };
};
