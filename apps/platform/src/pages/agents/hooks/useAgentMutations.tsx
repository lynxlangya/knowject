import {
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { deleteAgent, updateAgent, type AgentResponse, type AgentStatus } from '@api/agents';
import { extractApiErrorMessage } from '@api/error';
import type { MenuProps } from 'antd';
import { createAgentPayload } from '../adapters/agentPayload.adapter';
import { tp } from '../agents.i18n';

interface MessageLike {
  success: (content: string) => void;
  error: (content: string) => void;
}

interface ModalLike {
  confirm: (config: {
    title: string;
    content: string;
    okText: string;
    cancelText: string;
    okButtonProps?: {
      danger?: boolean;
    };
    centered?: boolean;
    onOk: () => Promise<void> | void;
  }) => void;
}

interface UseAgentMutationsParams {
  message: MessageLike;
  modal: ModalLike;
  onUpsertAgent: (agent: AgentResponse) => void;
  onRemoveAgent: (agentId: string) => void;
  onEditAgent: (agent: AgentResponse) => void;
}

export const useAgentMutations = ({
  message,
  modal,
  onUpsertAgent,
  onRemoveAgent,
  onEditAgent,
}: UseAgentMutationsParams) => {
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [updatingStatusAgentId, setUpdatingStatusAgentId] = useState<
    string | null
  >(null);

  const isAgentBusy = (agentId: string) => {
    return deletingAgentId === agentId || updatingStatusAgentId === agentId;
  };

  const handleToggleAgentStatus = async (agent: AgentResponse) => {
    const nextStatus: AgentStatus =
      agent.status === 'active' ? 'disabled' : 'active';

    setUpdatingStatusAgentId(agent.id);

    try {
      const result = await updateAgent(
        agent.id,
        createAgentPayload({
          ...agent,
          status: nextStatus,
        }),
      );

      onUpsertAgent(result.agent);
      message.success(
        nextStatus === 'disabled' ? tp('feedback.disabled') : tp('feedback.enabled'),
      );
    } catch (currentError) {
      console.error('[AgentsManagementPage] 更新智能体状态失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, tp('feedback.updateStatusFailed')),
      );
    } finally {
      setUpdatingStatusAgentId(null);
    }
  };

  const handleDeleteAgent = async (agent: AgentResponse) => {
    setDeletingAgentId(agent.id);

    try {
      await deleteAgent(agent.id);
      onRemoveAgent(agent.id);
      message.success(tp('feedback.deleted'));
    } catch (currentError) {
      console.error('[AgentsManagementPage] 删除智能体失败:', currentError);
      message.error(
        extractApiErrorMessage(currentError, tp('feedback.deleteFailed')),
      );
    } finally {
      setDeletingAgentId(null);
    }
  };

  const confirmDeleteAgent = (agent: AgentResponse) => {
    modal.confirm({
      title: tp('feedback.deleteTitle'),
      content: tp('feedback.deleteDescription'),
      okText: tp('feedback.deleteConfirm'),
      cancelText: tp('form.cancel'),
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: async () => {
        await handleDeleteAgent(agent);
      },
    });
  };

  const buildAgentActionMenuItems = (
    agent: AgentResponse,
  ): NonNullable<MenuProps['items']> => {
    const busy = isAgentBusy(agent.id);
    const toggleToDisabled = agent.status === 'active';

    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: tp('actions.edit'),
        disabled: busy,
      },
      {
        key: 'toggle-status',
        icon: toggleToDisabled ? (
          <PauseCircleOutlined />
        ) : (
          <PlayCircleOutlined />
        ),
        label: toggleToDisabled ? tp('actions.disable') : tp('actions.enable'),
        disabled: busy,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: tp('actions.delete'),
        danger: true,
        disabled: busy,
      },
    ];
  };

  const handleAgentMenuAction = (agent: AgentResponse, key: string) => {
    if (key === 'edit') {
      onEditAgent(agent);
      return;
    }

    if (key === 'toggle-status') {
      void handleToggleAgentStatus(agent);
      return;
    }

    if (key === 'delete') {
      confirmDeleteAgent(agent);
    }
  };

  return {
    buildAgentActionMenuItems,
    deletingAgentId,
    handleAgentMenuAction,
    isAgentBusy,
    updatingStatusAgentId,
  };
};
