import { useCallback } from 'react';

interface UseKnowledgeRefreshCoordinationOptions {
  activeKnowledgeId: string | null;
  resetPollingAttempts: (nextKnowledgeId?: string | null) => void;
  reloadKnowledgeList: (preferredId?: string | null) => void;
  reloadKnowledgeDetail: () => void;
  refreshKnowledgeState: (options?: { reloadDiagnostics?: boolean }) => void;
  setActiveKnowledgeId: (knowledgeId: string | null) => void;
}

export const useKnowledgeRefreshCoordination = ({
  activeKnowledgeId,
  resetPollingAttempts,
  reloadKnowledgeList,
  reloadKnowledgeDetail,
  refreshKnowledgeState,
  setActiveKnowledgeId,
}: UseKnowledgeRefreshCoordinationOptions) => {
  const refreshDocumentStatus = useCallback(
    (
      knowledgeId: string,
      options?: {
        reloadDiagnostics?: boolean;
      },
    ) => {
      resetPollingAttempts(knowledgeId);
      reloadKnowledgeList(knowledgeId);
      refreshKnowledgeState({
        reloadDiagnostics: options?.reloadDiagnostics,
      });
    },
    [refreshKnowledgeState, reloadKnowledgeList, resetPollingAttempts],
  );

  const refreshCurrentKnowledge = useCallback(() => {
    resetPollingAttempts(activeKnowledgeId);
    reloadKnowledgeList(activeKnowledgeId);
    reloadKnowledgeDetail();
  }, [
    activeKnowledgeId,
    reloadKnowledgeDetail,
    reloadKnowledgeList,
    resetPollingAttempts,
  ]);

  const selectKnowledge = useCallback(
    (knowledgeId: string) => {
      resetPollingAttempts(knowledgeId);
      setActiveKnowledgeId(knowledgeId);
    },
    [resetPollingAttempts, setActiveKnowledgeId],
  );

  return {
    refreshDocumentStatus,
    refreshCurrentKnowledge,
    selectKnowledge,
  };
};
