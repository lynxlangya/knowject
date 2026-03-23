import { extractApiErrorMessage } from "@api/error";
import {
  createProjectKnowledge,
  deleteKnowledge,
  updateKnowledge,
} from "@api/knowledge";
import { Form } from "antd";
import { useEffect, useState } from "react";
import type {
  ProjectSummary,
  ProjectResourceItem,
} from "@app/project/project.types";
import { useProjectContext } from "@app/project/useProjectContext";
import type {
  ProjectKnowledgeAccessMode,
  ProjectKnowledgeFormValues,
} from "../components/ProjectKnowledgeAccessModal";
import type { EditKnowledgeFormValues } from "../types/projectResources.types";
import { tp } from "../project.i18n";

interface ProjectKnowledgeMessageApi {
  error: (content: string) => void;
  success: (content: string) => void;
}

interface ProjectKnowledgeModalApi {
  confirm: (config: {
    title: string;
    content: string;
    okText: string;
    cancelText: string;
    okButtonProps?: {
      danger?: boolean;
    };
    centered?: boolean;
    onOk: () => void | Promise<void>;
  }) => void;
}

interface UseProjectKnowledgeMutationsOptions {
  activeProject: ProjectSummary;
  activeKnowledgeId: string | null;
  setActiveKnowledgeId: (knowledgeId: string | null) => void;
  message: ProjectKnowledgeMessageApi;
  modal: ProjectKnowledgeModalApi;
  refreshProjectKnowledge: () => void | Promise<void>;
  refreshKnowledgeState: (options?: { reloadDiagnostics?: boolean }) => void;
  openProjectKnowledgeUpload: (knowledgeId: string) => void;
  uploadTargetKnowledgeId: string | null;
  closeUploadFlow: () => void;
}

export const useProjectKnowledgeMutations = ({
  activeProject,
  activeKnowledgeId,
  setActiveKnowledgeId,
  message,
  modal,
  refreshProjectKnowledge,
  refreshKnowledgeState,
  openProjectKnowledgeUpload,
  uploadTargetKnowledgeId,
  closeUploadFlow,
}: UseProjectKnowledgeMutationsOptions) => {
  const { updateProjectResourceBindings } = useProjectContext();
  const [knowledgeAccessModalOpen, setKnowledgeAccessModalOpen] =
    useState(false);
  const [knowledgeAccessInitialMode, setKnowledgeAccessInitialMode] =
    useState<ProjectKnowledgeAccessMode>("global");
  const [knowledgeAccessSubmittingMode, setKnowledgeAccessSubmittingMode] =
    useState<ProjectKnowledgeAccessMode | null>(null);
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [metadataSubmitting, setMetadataSubmitting] = useState(false);
  const [editingKnowledgeItem, setEditingKnowledgeItem] =
    useState<ProjectResourceItem | null>(null);
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(
    null,
  );
  const [updatingGlobalBindingId, setUpdatingGlobalBindingId] = useState<
    string | null
  >(null);
  const [editForm] = Form.useForm<EditKnowledgeFormValues>();

  useEffect(() => {
    if (!metadataModalOpen || !editingKnowledgeItem) {
      return;
    }

    editForm.setFieldsValue({
      name: editingKnowledgeItem.name,
      description: editingKnowledgeItem.description,
    });
  }, [editForm, editingKnowledgeItem, metadataModalOpen]);

  const closeKnowledgeAccessModal = () => {
    setKnowledgeAccessModalOpen(false);
  };

  const openKnowledgeAccessModal = (
    initialMode: ProjectKnowledgeAccessMode,
  ) => {
    setKnowledgeAccessInitialMode(initialMode);
    setKnowledgeAccessModalOpen(true);
  };

  const closeMetadataModal = () => {
    setMetadataModalOpen(false);
    setEditingKnowledgeItem(null);
    editForm.resetFields();
  };

  const openKnowledgeItemEditor = (item: ProjectResourceItem) => {
    setEditingKnowledgeItem(item);
    setMetadataModalOpen(true);
  };

  const commitProjectKnowledgeBindings = async (
    knowledgeBaseIds: string[],
  ): Promise<boolean> => {
    const result = await updateProjectResourceBindings({
      projectId: activeProject.id,
      knowledgeBaseIds,
    });

    if (result === "updated") {
      return true;
    }

    if (result === "not_found") {
      message.error(tp("resources.mutations.projectMissing"));
      return false;
    }

    message.error(tp("resources.mutations.bindingUpdateFailed"));
    return false;
  };

  const handleBindGlobalKnowledge = async (knowledgeIds: string[]) => {
    if (knowledgeIds.length === 0) {
      return;
    }

    setKnowledgeAccessSubmittingMode("global");

    try {
      const updated = await commitProjectKnowledgeBindings(
        Array.from(
          new Set([...activeProject.knowledgeBaseIds, ...knowledgeIds]),
        ),
      );

      if (!updated) {
        return;
      }

      message.success(
        tp("resources.mutations.bindGlobalSuccess", { count: knowledgeIds.length }),
      );
      closeKnowledgeAccessModal();
    } catch (currentError) {
      console.error("[ProjectResources] 绑定全局知识失败:", currentError);
      message.error(
        extractApiErrorMessage(currentError, tp("resources.mutations.bindGlobalFailed")),
      );
    } finally {
      setKnowledgeAccessSubmittingMode(null);
    }
  };

  const handleCreateProjectKnowledge = async (
    values: ProjectKnowledgeFormValues,
  ) => {
    setKnowledgeAccessSubmittingMode("project");

    try {
      const result = await createProjectKnowledge(activeProject.id, {
        name: values.name,
        description: values.description,
        sourceType: "global_docs",
      });

      message.success(tp("resources.draft.createSuccess"));
      closeKnowledgeAccessModal();
      void refreshProjectKnowledge();
      setActiveKnowledgeId(result.knowledge.id);
      openProjectKnowledgeUpload(result.knowledge.id);
    } catch (currentError) {
      console.error("[ProjectResources] 创建项目知识库失败:", currentError);
      message.error(
        extractApiErrorMessage(currentError, tp("resources.draft.createFailed")),
      );
    } finally {
      setKnowledgeAccessSubmittingMode(null);
    }
  };

  const handleSubmitKnowledgeMetadata = async (
    values: EditKnowledgeFormValues,
  ) => {
    if (!editingKnowledgeItem) {
      return;
    }

    setMetadataSubmitting(true);

    try {
      await updateKnowledge(editingKnowledgeItem.id, {
        name: values.name,
        description: values.description,
      });

      message.success(tp("resources.mutations.updateSuccess"));
      closeMetadataModal();
      void refreshProjectKnowledge();

      if (activeKnowledgeId === editingKnowledgeItem.id) {
        void refreshKnowledgeState({
          reloadDiagnostics: true,
        });
      }
    } catch (currentError) {
      console.error("[ProjectResources] 更新项目知识库失败:", currentError);
      message.error(
        extractApiErrorMessage(currentError, tp("resources.mutations.updateFailed")),
      );
    } finally {
      setMetadataSubmitting(false);
    }
  };

  const confirmUnbindGlobalKnowledge = (item: ProjectResourceItem) => {
    modal.confirm({
      title: tp("resources.mutations.unbindTitle"),
      content: tp("resources.mutations.unbindDescription", { name: item.name }),
      okText: tp("resources.mutations.unbindConfirm"),
      cancelText: tp("members.cancel"),
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: async () => {
        setUpdatingGlobalBindingId(item.id);

        try {
          const updated = await commitProjectKnowledgeBindings(
            activeProject.knowledgeBaseIds.filter(
              (knowledgeId) => knowledgeId !== item.id,
            ),
          );

          if (!updated) {
            return;
          }

          message.success(tp("resources.mutations.unbindSuccess", { name: item.name }));

          if (activeKnowledgeId === item.id) {
            setActiveKnowledgeId(null);
          }
        } catch (currentError) {
          console.error(
            "[ProjectResources] 解除全局知识绑定失败:",
            currentError,
          );
          message.error(
            extractApiErrorMessage(
              currentError,
              tp("resources.mutations.unbindFailed"),
            ),
          );
        } finally {
          setUpdatingGlobalBindingId(null);
        }
      },
    });
  };

  const confirmDeleteKnowledge = (item: ProjectResourceItem) => {
    modal.confirm({
      title: tp("resources.mutations.deleteTitle"),
      content: tp("resources.mutations.deleteDescription", { name: item.name }),
      okText: tp("resources.mutations.deleteConfirm"),
      cancelText: tp("members.cancel"),
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: async () => {
        setDeletingKnowledgeId(item.id);

        try {
          await deleteKnowledge(item.id);
          message.success(tp("resources.mutations.deleteSuccess"));
          void refreshProjectKnowledge();

          if (activeKnowledgeId === item.id) {
            setActiveKnowledgeId(null);
          }

          if (uploadTargetKnowledgeId === item.id) {
            closeUploadFlow();
          }
        } catch (currentError) {
          console.error("[ProjectResources] 删除项目知识库失败:", currentError);
          message.error(
            extractApiErrorMessage(
              currentError,
              tp("resources.mutations.deleteFailed"),
            ),
          );
        } finally {
          setDeletingKnowledgeId(null);
        }
      },
    });
  };

  return {
    knowledgeAccessModalOpen,
    knowledgeAccessInitialMode,
    knowledgeAccessSubmittingMode,
    metadataModalOpen,
    metadataSubmitting,
    deletingKnowledgeId,
    updatingGlobalBindingId,
    editForm,
    closeKnowledgeAccessModal,
    openKnowledgeAccessModal,
    closeMetadataModal,
    openKnowledgeItemEditor,
    handleBindGlobalKnowledge,
    handleCreateProjectKnowledge,
    handleSubmitKnowledgeMetadata,
    confirmUnbindGlobalKnowledge,
    confirmDeleteKnowledge,
  };
};
