import type { KnowledgeDocumentResponse } from "@api/knowledge";
import type { ProjectResourceItem } from "@app/project/project.types";
import {
  patchKnowledgeDetailDocument,
  queueKnowledgeDocumentForPending,
  queueKnowledgeForPending,
  removeKnowledgeDetailDocument,
} from "@pages/knowledge/knowledgeDomain.shared";
import { useKnowledgeDetailState } from "@pages/knowledge/useKnowledgeDetailState";
import { useState } from "react";

interface UseProjectKnowledgeDetailControllerOptions {
  knowledgeItems: ProjectResourceItem[];
  refreshProjectKnowledge: () => void | Promise<void>;
}

export const useProjectKnowledgeDetailController = ({
  knowledgeItems,
  refreshProjectKnowledge,
}: UseProjectKnowledgeDetailControllerOptions) => {
  const [activeKnowledgeId, setActiveKnowledgeId] = useState<string | null>(
    null,
  );
  const activeKnowledgeItem = activeKnowledgeId
    ? (knowledgeItems.find((item) => item.id === activeKnowledgeId) ?? null)
    : null;
  const {
    detail: activeKnowledgeDetail,
    setDetail: setActiveKnowledgeDetail,
    detailLoading: activeKnowledgeDetailLoading,
    detailError: activeKnowledgeDetailError,
    diagnostics: activeDiagnostics,
    diagnosticsLoading: activeDiagnosticsLoading,
    diagnosticsError: activeDiagnosticsError,
    refreshKnowledgeState,
  } = useKnowledgeDetailState({
    knowledgeId: activeKnowledgeItem?.id ?? null,
  });

  const refreshProjectKnowledgeState = (
    knowledgeId: string,
    options?: {
      reloadDiagnostics?: boolean;
    },
  ) => {
    void refreshProjectKnowledge();

    if (knowledgeId === activeKnowledgeId) {
      void refreshKnowledgeState({
        reloadDiagnostics: options?.reloadDiagnostics,
      });
      return;
    }

    setActiveKnowledgeId(knowledgeId);
  };

  const refreshActiveKnowledge = () => {
    if (activeKnowledgeItem?.source === "project") {
      void refreshProjectKnowledge();
    }

    void refreshKnowledgeState({
      reloadDiagnostics: true,
    });
  };

  const patchActiveKnowledgeDocument = (
    knowledgeId: string,
    documentId: string,
    patch: Partial<KnowledgeDocumentResponse>,
  ) => {
    if (activeKnowledgeId !== knowledgeId) {
      return;
    }

    setActiveKnowledgeDetail((current) => {
      if (!current) {
        return current;
      }

      return patchKnowledgeDetailDocument(current, documentId, patch);
    });
  };

  const queueActiveKnowledgeDocument = (
    knowledgeId: string,
    document: KnowledgeDocumentResponse,
  ) => {
    patchActiveKnowledgeDocument(
      knowledgeId,
      document.id,
      queueKnowledgeDocumentForPending(document),
    );
  };

  const queueActiveKnowledge = (knowledgeId: string) => {
    if (activeKnowledgeId !== knowledgeId) {
      return;
    }

    setActiveKnowledgeDetail((current) => {
      if (!current) {
        return current;
      }

      return queueKnowledgeForPending(current);
    });
  };

  const removeActiveKnowledgeDocument = (
    knowledgeId: string,
    documentId: string,
  ) => {
    if (activeKnowledgeId !== knowledgeId) {
      return;
    }

    setActiveKnowledgeDetail((current) => {
      if (!current) {
        return current;
      }

      return removeKnowledgeDetailDocument(current, documentId);
    });
  };

  return {
    activeKnowledgeId,
    setActiveKnowledgeId,
    activeKnowledgeItem,
    activeKnowledgeDetail,
    activeKnowledgeDetailLoading,
    activeKnowledgeDetailError,
    activeDiagnostics,
    activeDiagnosticsLoading,
    activeDiagnosticsError,
    refreshKnowledgeState,
    refreshProjectKnowledgeState,
    refreshActiveKnowledge,
    queueActiveKnowledgeDocument,
    queueActiveKnowledge,
    removeActiveKnowledgeDocument,
  };
};
