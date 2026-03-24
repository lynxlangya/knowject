import { App } from 'antd';
import { useEffect, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import { createProjectKnowledge } from '@api/knowledge';
import type {
  ProjectKnowledgeAccessMode,
  ProjectKnowledgeFormValues,
} from './components/ProjectKnowledgeAccessModal';
import {
  buildProjectKnowledgeDraftSessionKey,
  resolveProjectKnowledgeDraftSelection,
  type SaveProjectKnowledgeDraftResult,
} from './projectKnowledgeDraft.helpers';
import { tp } from './project.i18n';
import type { ProjectKnowledgeDraftValues } from './useProjectConversationMessageActions';
import {
  closeProjectConversationMessageKnowledgeDrawer,
  completeProjectConversationMessageKnowledgeSave,
  type ProjectConversationMessageRailMode,
} from './useProjectConversationMessageRail';

interface UseProjectKnowledgeDraftFlowOptions {
  activeProjectId: string;
  chatId?: string;
  projectKnowledgeItems: Array<{ id: string; name: string }>;
  projectKnowledgeLoading: boolean;
  projectKnowledgeError?: string | null;
  refreshProjectKnowledge: () => void | Promise<void>;
  savingKnowledgeDraft: boolean;
  selectedMessageIds: string[];
  railMode: ProjectConversationMessageRailMode;
  setRailMode: (mode: ProjectConversationMessageRailMode) => void;
  setRailSelectedMessageIds: (messageIds: string[]) => void;
  buildKnowledgeDraftFromSelection: (
    selectedMessageIds: string[],
  ) => ProjectKnowledgeDraftValues | null;
  saveKnowledgeDraft: (
    draft: ProjectKnowledgeDraftValues,
    options?: {
      knowledgeId?: string | null;
    },
  ) => Promise<SaveProjectKnowledgeDraftResult>;
}

export const useProjectKnowledgeDraftFlow = ({
  activeProjectId,
  chatId,
  projectKnowledgeItems,
  projectKnowledgeLoading,
  projectKnowledgeError,
  refreshProjectKnowledge,
  savingKnowledgeDraft,
  selectedMessageIds,
  railMode,
  setRailMode,
  setRailSelectedMessageIds,
  buildKnowledgeDraftFromSelection,
  saveKnowledgeDraft,
}: UseProjectKnowledgeDraftFlowOptions) => {
  const { message } = App.useApp();
  const [knowledgeDraftOpen, setKnowledgeDraftOpen] = useState(false);
  const [knowledgeDraftValue, setKnowledgeDraftValue] =
    useState<ProjectKnowledgeDraftValues | null>(null);
  const [knowledgeDraftSelectedKnowledgeId, setKnowledgeDraftSelectedKnowledgeId] =
    useState<string | null>(null);
  const [knowledgeDraftPendingKnowledgeOption, setKnowledgeDraftPendingKnowledgeOption] =
    useState<{ label: string; value: string } | null>(null);
  const [knowledgeAccessModalOpen, setKnowledgeAccessModalOpen] =
    useState(false);
  const [creatingDraftKnowledge, setCreatingDraftKnowledge] =
    useState(false);
  const [lastUsedKnowledgeIdBySession, setLastUsedKnowledgeIdBySession] =
    useState<Record<string, string>>({});

  useEffect(() => {
    setKnowledgeDraftOpen(false);
    setKnowledgeDraftValue(null);
    setKnowledgeDraftSelectedKnowledgeId(null);
    setKnowledgeDraftPendingKnowledgeOption(null);
    setKnowledgeAccessModalOpen(false);
  }, [activeProjectId, chatId]);

  useEffect(() => {
    if (
      !knowledgeDraftPendingKnowledgeOption ||
      !projectKnowledgeItems.some(
        (knowledge) => knowledge.id === knowledgeDraftPendingKnowledgeOption.value,
      )
    ) {
      return;
    }

    setKnowledgeDraftPendingKnowledgeOption(null);
  }, [knowledgeDraftPendingKnowledgeOption, projectKnowledgeItems]);

  const projectKnowledgeOptions = projectKnowledgeItems.map((knowledge) => ({
    label: knowledge.name,
    value: knowledge.id,
  }));
  const knowledgeDraftProjectKnowledgeOptions =
    knowledgeDraftPendingKnowledgeOption &&
    !projectKnowledgeOptions.some(
      (option) => option.value === knowledgeDraftPendingKnowledgeOption.value,
    )
      ? [knowledgeDraftPendingKnowledgeOption, ...projectKnowledgeOptions]
      : projectKnowledgeOptions;

  const openKnowledgeDraft = () => {
    const nextDraft = buildKnowledgeDraftFromSelection(selectedMessageIds);

    if (!nextDraft) {
      message.warning(tp('conversation.assistantActions.selectPersisted'));
      return;
    }

    const knowledgeIds = knowledgeDraftProjectKnowledgeOptions.map(
      (option) => option.value,
    );

    setRailMode('selection');
    setKnowledgeDraftValue(nextDraft);
    setKnowledgeDraftSelectedKnowledgeId(
      chatId
        ? resolveProjectKnowledgeDraftSelection({
            projectId: activeProjectId,
            chatId,
            projectKnowledgeIds: knowledgeIds,
            lastUsedKnowledgeIdBySession,
          })
        : null,
    );
    setKnowledgeDraftOpen(true);
  };

  const handleCloseKnowledgeDraft = () => {
    if (savingKnowledgeDraft) {
      return;
    }

    const nextSelectionState = closeProjectConversationMessageKnowledgeDrawer({
      mode: railMode,
      selectedMessageIds,
    });

    setRailMode(nextSelectionState.mode);
    setRailSelectedMessageIds(nextSelectionState.selectedMessageIds);
    setKnowledgeDraftOpen(false);
    setKnowledgeDraftSelectedKnowledgeId(null);
  };

  const handleKnowledgeDraftValueChange = (
    patch: Partial<ProjectKnowledgeDraftValues>,
  ) => {
    setKnowledgeDraftValue((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            ...patch,
          }
        : currentValue,
    );
  };

  const handleKnowledgeDraftSaveSuccess = (selectedKnowledgeId: string) => {
    const nextSelectionState = completeProjectConversationMessageKnowledgeSave({
      mode: railMode,
      selectedMessageIds,
    });

    if (chatId) {
      const sessionKey = buildProjectKnowledgeDraftSessionKey(
        activeProjectId,
        chatId,
      );
      setLastUsedKnowledgeIdBySession((currentValue) => ({
        ...currentValue,
        [sessionKey]: selectedKnowledgeId,
      }));
    }

    setRailMode(nextSelectionState.mode);
    setRailSelectedMessageIds(nextSelectionState.selectedMessageIds);
    setKnowledgeDraftOpen(false);
    setKnowledgeDraftValue(null);
    setKnowledgeDraftSelectedKnowledgeId(null);
    message.success(tp('resources.draft.saved'));
  };

  const handleCreateProjectKnowledgeForDraft = async (
    values: ProjectKnowledgeFormValues,
  ) => {
    setCreatingDraftKnowledge(true);

    try {
      const result = await createProjectKnowledge(activeProjectId, {
        name: values.name,
        description: values.description,
        sourceType: 'global_docs',
      });

      setKnowledgeDraftPendingKnowledgeOption({
        label: result.knowledge.name,
        value: result.knowledge.id,
      });
      setKnowledgeDraftSelectedKnowledgeId(result.knowledge.id);
      setKnowledgeAccessModalOpen(false);
      message.success(tp('resources.draft.createSuccess'));
      void refreshProjectKnowledge();
    } catch (currentError) {
      message.error(
        extractApiErrorMessage(currentError, tp('resources.draft.createFailed')),
      );
    } finally {
      setCreatingDraftKnowledge(false);
    }
  };

  const handleSubmitKnowledgeDraft = async () => {
    if (!knowledgeDraftValue) {
      return;
    }

    const selectedKnowledgeId = knowledgeDraftSelectedKnowledgeId;
    const result = await saveKnowledgeDraft(knowledgeDraftValue, {
      knowledgeId: selectedKnowledgeId,
    });

    if (result.status === 'success' && selectedKnowledgeId) {
      handleKnowledgeDraftSaveSuccess(selectedKnowledgeId);
      return;
    }

    message.error(result.message ?? tp('resources.draft.saveFailed'));
  };

  return {
    openKnowledgeDraft,
    drawerProps: {
      open: knowledgeDraftOpen,
      value: knowledgeDraftValue,
      saving: savingKnowledgeDraft,
      projectKnowledgeOptions: knowledgeDraftProjectKnowledgeOptions,
      projectKnowledgeLoading,
      projectKnowledgeError,
      selectedKnowledgeId: knowledgeDraftSelectedKnowledgeId,
      onChange: handleKnowledgeDraftValueChange,
      onKnowledgeChange: setKnowledgeDraftSelectedKnowledgeId,
      onCreateKnowledge: () => setKnowledgeAccessModalOpen(true),
      onClose: handleCloseKnowledgeDraft,
      onSubmit: () => {
        void handleSubmitKnowledgeDraft();
      },
    },
    accessModalProps: {
      open: knowledgeAccessModalOpen,
      initialMode: 'project' as const,
      allowedModes: ['project'] as ProjectKnowledgeAccessMode[],
      knowledgeCatalog: [],
      knowledgeCatalogLoading: false,
      boundKnowledgeIds: [],
      binding: false,
      creating: creatingDraftKnowledge,
      createProjectTitle: tp('resources.access.defaultCreateTitle'),
      createProjectDescription: tp('resources.access.defaultCreateDescription'),
      createProjectHelperText: tp('resources.access.createContinueHint'),
      createProjectSubmitText: tp('resources.access.createEmptySubmit'),
      onCancel: () => setKnowledgeAccessModalOpen(false),
      onBindGlobalKnowledge: () => undefined,
      onCreateProjectKnowledge: (values: ProjectKnowledgeFormValues) => {
        void handleCreateProjectKnowledgeForDraft(values);
      },
      onOpenGlobalManagement: () => undefined,
    },
  };
};
