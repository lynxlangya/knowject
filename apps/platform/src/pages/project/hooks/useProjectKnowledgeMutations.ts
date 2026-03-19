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
      message.error("项目不存在或已被删除");
      return false;
    }

    message.error("当前无法更新项目资源绑定，请稍后重试");
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

      message.success(`已为项目引入 ${knowledgeIds.length} 个全局知识库`);
      closeKnowledgeAccessModal();
    } catch (currentError) {
      console.error("[ProjectResources] 绑定全局知识失败:", currentError);
      message.error(
        extractApiErrorMessage(currentError, "绑定全局知识失败，请稍后重试"),
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

      message.success("项目知识库已创建");
      closeKnowledgeAccessModal();
      void refreshProjectKnowledge();
      setActiveKnowledgeId(result.knowledge.id);
      openProjectKnowledgeUpload(result.knowledge.id);
    } catch (currentError) {
      console.error("[ProjectResources] 创建项目知识库失败:", currentError);
      message.error(
        extractApiErrorMessage(currentError, "创建项目知识库失败，请稍后重试"),
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

      message.success("项目知识库已更新");
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
        extractApiErrorMessage(currentError, "更新项目知识库失败，请稍后重试"),
      );
    } finally {
      setMetadataSubmitting(false);
    }
  };

  const confirmUnbindGlobalKnowledge = (item: ProjectResourceItem) => {
    modal.confirm({
      title: "解除全局知识库绑定",
      content: `解除后，知识库“${item.name}”不会再参与当前项目上下文消费，但不会影响它在全局中的原始内容。`,
      okText: "解除绑定",
      cancelText: "取消",
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

          message.success(`已解除“${item.name}”的项目绑定`);

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
              "解除全局知识绑定失败，请稍后重试",
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
      title: "删除项目知识库",
      content: `删除后会清理知识库元数据、原始文件和对应向量，且不可撤销。确定删除“${item.name}”吗？`,
      okText: "删除",
      cancelText: "取消",
      okButtonProps: {
        danger: true,
      },
      centered: true,
      onOk: async () => {
        setDeletingKnowledgeId(item.id);

        try {
          await deleteKnowledge(item.id);
          message.success("项目知识库已删除");
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
              "删除项目知识库失败，请稍后重试",
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
