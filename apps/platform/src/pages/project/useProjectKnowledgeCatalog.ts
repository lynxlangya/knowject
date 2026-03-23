import { useCallback, useEffect, useRef, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  listProjectKnowledge,
  type KnowledgeSummaryResponse,
} from '@api/knowledge';
import { tp } from './project.i18n';

const DEFAULT_POLLING_MAX_ATTEMPTS = 20;
const DEFAULT_POLLING_INTERVAL_MS = 1500;

const hasProjectKnowledgeInFlight = (
  items: KnowledgeSummaryResponse[],
): boolean => {
  return items.some(
    (knowledge) =>
      knowledge.indexStatus === 'pending' ||
      knowledge.indexStatus === 'processing',
  );
};

export interface UseProjectKnowledgeCatalogResult {
  items: KnowledgeSummaryResponse[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  shouldPoll: boolean;
  pollingAttempts: number;
  pollingStopped: boolean;
}

export const useProjectKnowledgeCatalog = (
  projectId: string | null,
  options?: {
    maxPollingAttempts?: number;
    pollingIntervalMs?: number;
  },
): UseProjectKnowledgeCatalogResult => {
  const maxPollingAttempts =
    options?.maxPollingAttempts ?? DEFAULT_POLLING_MAX_ATTEMPTS;
  const pollingIntervalMs =
    options?.pollingIntervalMs ?? DEFAULT_POLLING_INTERVAL_MS;
  const latestProjectIdRef = useRef<string | null>(projectId);
  const loadedProjectIdRef = useRef<string | null>(null);
  const pollingAttemptsRef = useRef<Record<string, number>>({});
  const [items, setItems] = useState<KnowledgeSummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    const requestProjectId = latestProjectIdRef.current;

    if (!requestProjectId) {
      return;
    }

    pollingAttemptsRef.current[requestProjectId] = 0;
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    latestProjectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let isMounted = true;

    const loadProjectKnowledge = async () => {
      if (loadedProjectIdRef.current !== projectId) {
        setItems([]);
        setError(null);
      }

      setLoading(true);

      try {
        const result = await listProjectKnowledge(projectId);

        if (!isMounted || latestProjectIdRef.current !== projectId) {
          return;
        }

        setItems(result.items);
        loadedProjectIdRef.current = projectId;
        setError(null);
      } catch (currentError) {
        if (!isMounted || latestProjectIdRef.current !== projectId) {
          return;
        }

        console.error('[ProjectLayout] 加载项目私有知识失败:', currentError);

        if (loadedProjectIdRef.current !== projectId) {
          setItems([]);
        }

        setError(
          extractApiErrorMessage(
            currentError,
            tp('resources.alertProjectKnowledge'),
          ),
        );
      } finally {
        if (isMounted && latestProjectIdRef.current === projectId) {
          setLoading(false);
        }
      }
    };

    void loadProjectKnowledge();

    return () => {
      isMounted = false;
    };
  }, [projectId, reloadToken]);

  const shouldPoll = hasProjectKnowledgeInFlight(items);
  const pollingAttempts = projectId ? (pollingAttemptsRef.current[projectId] ?? 0) : 0;
  const pollingStopped = shouldPoll && pollingAttempts >= maxPollingAttempts;

  useEffect(() => {
    if (!projectId) {
      return;
    }

    if (!shouldPoll) {
      pollingAttemptsRef.current[projectId] = 0;
      return;
    }

    if (loading) {
      return;
    }

    const attempts = pollingAttemptsRef.current[projectId] ?? 0;

    if (attempts >= maxPollingAttempts) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (latestProjectIdRef.current !== projectId) {
        return;
      }

      pollingAttemptsRef.current[projectId] = attempts + 1;
      setReloadToken((value) => value + 1);
    }, pollingIntervalMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, maxPollingAttempts, pollingIntervalMs, projectId, shouldPoll]);

  return {
    items,
    loading,
    error,
    refresh,
    shouldPoll,
    pollingAttempts,
    pollingStopped,
  };
};
