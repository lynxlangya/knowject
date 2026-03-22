import { extractApiErrorMessage } from '@api/error';
import {
  getKnowledgeDetail,
  getKnowledgeDiagnostics,
  type KnowledgeDetailResponse,
  type KnowledgeDiagnosticsResponse,
} from '@api/knowledge';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasProcessingKnowledgeDocuments } from './knowledgeDomain.shared';
import { tp } from './knowledge.i18n';

interface UseKnowledgeDetailStateOptions {
  knowledgeId: string | null;
  autoPoll?: boolean;
  maxPollingAttempts?: number;
  pollingIntervalMs?: number;
  onPollTick?: (knowledgeId: string) => void;
}

export const useKnowledgeDetailState = ({
  knowledgeId,
  autoPoll = false,
  maxPollingAttempts = 20,
  pollingIntervalMs = 1500,
  onPollTick,
}: UseKnowledgeDetailStateOptions) => {
  const pollingAttemptsRef = useRef<Record<string, number>>({});
  const [detail, setDetail] = useState<KnowledgeDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] =
    useState<KnowledgeDiagnosticsResponse | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [diagnosticsReloadToken, setDiagnosticsReloadToken] = useState(0);

  const refreshDetail = useCallback(() => {
    setDetailReloadToken((value) => value + 1);
  }, []);

  const refreshDiagnostics = useCallback(() => {
    setDiagnosticsReloadToken((value) => value + 1);
  }, []);

  const refreshKnowledgeState = useCallback(
    (options?: { reloadDiagnostics?: boolean }) => {
      if (!knowledgeId) {
        return;
      }

      pollingAttemptsRef.current[knowledgeId] = 0;
      refreshDetail();

      if (options?.reloadDiagnostics) {
        refreshDiagnostics();
      }
    },
    [knowledgeId, refreshDetail, refreshDiagnostics],
  );

  const resetPollingAttempts = useCallback((nextKnowledgeId?: string | null) => {
    if (!nextKnowledgeId) {
      return;
    }

    pollingAttemptsRef.current[nextKnowledgeId] = 0;
  }, []);

  useEffect(() => {
    if (!knowledgeId) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let isMounted = true;

    const loadKnowledgeDetail = async () => {
      setDetailLoading(true);

      try {
        const result = await getKnowledgeDetail(knowledgeId);

        if (!isMounted) {
          return;
        }

        setDetail(result.knowledge);
        setDetailError(null);
      } catch (currentError) {
        if (!isMounted) {
          return;
        }

        console.error('[KnowledgeDetailState] 加载知识库详情失败:', currentError);
        setDetail(null);
        setDetailError(
          extractApiErrorMessage(currentError, tp('management.detailLoadFailed')),
        );
      } finally {
        if (isMounted) {
          setDetailLoading(false);
        }
      }
    };

    void loadKnowledgeDetail();

    return () => {
      isMounted = false;
    };
  }, [detailReloadToken, knowledgeId]);

  useEffect(() => {
    if (!knowledgeId) {
      setDiagnostics(null);
      setDiagnosticsError(null);
      setDiagnosticsLoading(false);
      return;
    }

    let isMounted = true;

    const loadKnowledgeDiagnostics = async () => {
      setDiagnosticsLoading(true);

      try {
        const result = await getKnowledgeDiagnostics(knowledgeId);

        if (!isMounted) {
          return;
        }

        setDiagnostics(result);
        setDiagnosticsError(null);
      } catch (currentError) {
        if (!isMounted) {
          return;
        }

        console.error('[KnowledgeDetailState] 加载知识库诊断失败:', currentError);
        setDiagnostics(null);
        setDiagnosticsError(
          extractApiErrorMessage(currentError, tp('ops.diagnosticsLoadFailed')),
        );
      } finally {
        if (isMounted) {
          setDiagnosticsLoading(false);
        }
      }
    };

    void loadKnowledgeDiagnostics();

    return () => {
      isMounted = false;
    };
  }, [diagnosticsReloadToken, knowledgeId]);

  const pollingAttempts = knowledgeId
    ? (pollingAttemptsRef.current[knowledgeId] ?? 0)
    : 0;
  const shouldPoll = autoPoll && hasProcessingKnowledgeDocuments(detail);
  const pollingStopped = shouldPoll && pollingAttempts >= maxPollingAttempts;

  useEffect(() => {
    if (!knowledgeId) {
      return;
    }

    if (!shouldPoll) {
      pollingAttemptsRef.current[knowledgeId] = 0;
      return;
    }

    if (detailLoading) {
      return;
    }

    const attempts = pollingAttemptsRef.current[knowledgeId] ?? 0;

    if (attempts >= maxPollingAttempts) {
      return;
    }

    const timer = window.setTimeout(() => {
      pollingAttemptsRef.current[knowledgeId] = attempts + 1;
      refreshDetail();
      onPollTick?.(knowledgeId);
    }, pollingIntervalMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    autoPoll,
    detailLoading,
    knowledgeId,
    maxPollingAttempts,
    onPollTick,
    pollingIntervalMs,
    refreshDetail,
    shouldPoll,
  ]);

  return {
    detail,
    setDetail,
    detailLoading,
    detailError,
    diagnostics,
    diagnosticsLoading,
    diagnosticsError,
    refreshDetail,
    refreshDiagnostics,
    refreshKnowledgeState,
    shouldPoll,
    pollingAttempts,
    pollingStopped,
    resetPollingAttempts,
  };
};
