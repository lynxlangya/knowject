import { extractApiErrorMessage } from "@api/error";
import {
  uploadProjectKnowledgeDocument,
  type KnowledgeSummaryResponse,
} from "@api/knowledge";
import { useRef } from "react";
import { useKnowledgeUploadFlow } from "@pages/knowledge/useKnowledgeUploadFlow";
import {
  PROJECT_KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY,
  formatProjectKnowledgeBatchUploadProgress,
  formatProjectKnowledgeBatchUploadSuccessMessage,
} from "../constants/projectResources.constants";
import { tp } from "../project.i18n";

interface ProjectKnowledgeUploadMessageApi {
  error: (content: string) => void;
  info: (content: string) => void;
  open: (config: {
    key: string;
    type: "error" | "loading" | "success" | "warning";
    content: string;
    duration: number;
  }) => void;
  success: (content: string) => void;
  warning: (content: string) => void;
}

interface UseProjectKnowledgeUploadFlowOptions {
  activeProjectId: string;
  message: ProjectKnowledgeUploadMessageApi;
  projectKnowledgeCatalog: KnowledgeSummaryResponse[];
  refreshProjectKnowledgeState: (
    knowledgeId: string,
    options?: {
      reloadDiagnostics?: boolean;
    },
  ) => void;
}

export const useProjectKnowledgeUploadFlow = ({
  activeProjectId,
  message,
  projectKnowledgeCatalog,
  refreshProjectKnowledgeState,
}: UseProjectKnowledgeUploadFlowOptions) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    uploadFlowStep,
    uploadTargetKnowledgeId,
    uploadingKnowledgeId,
    textUploadSubmitting,
    openUploadFlow,
    closeUploadFlow,
    openTextInput,
    backToSourcePicker,
    handleSelectedFiles,
    handleFileChange,
    submitTextSource,
  } = useKnowledgeUploadFlow({
    message,
    batchUploadMessageKey: PROJECT_KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY,
    formatBatchUploadProgress: formatProjectKnowledgeBatchUploadProgress,
    formatBatchUploadSuccessMessage:
      formatProjectKnowledgeBatchUploadSuccessMessage,
    uploadDocument: async (knowledgeId, file) => {
      await uploadProjectKnowledgeDocument(activeProjectId, knowledgeId, file);
    },
    refreshAfterUpload: (knowledgeId) => {
      refreshProjectKnowledgeState(knowledgeId, {
        reloadDiagnostics: true,
      });
    },
    successMessage: tp("resources.upload.successSingle"),
    uploadErrorMessage: tp("resources.upload.failed"),
    closeTextInputOnSubmit: "success",
    extractErrorMessage: extractApiErrorMessage,
  });
  const uploadTargetKnowledge = projectKnowledgeCatalog.find(
    (knowledge) => knowledge.id === uploadTargetKnowledgeId,
  );

  const openProjectKnowledgeUpload = (knowledgeId: string) => {
    openUploadFlow(knowledgeId);
  };

  const triggerDocumentUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCancelTextInput = () => {
    if (textUploadSubmitting) {
      return;
    }

    closeUploadFlow();
  };

  return {
    fileInputRef,
    uploadFlowStep,
    uploadTargetKnowledgeId,
    uploadTargetKnowledge,
    uploadingKnowledgeId,
    textUploadSubmitting,
    openProjectKnowledgeUpload,
    closeUploadFlow,
    openTextInput,
    backToSourcePicker,
    handleSelectedFiles,
    handleFileChange,
    submitTextSource,
    triggerDocumentUpload,
    handleCancelTextInput,
  };
};
