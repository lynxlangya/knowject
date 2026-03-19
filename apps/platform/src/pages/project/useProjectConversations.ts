import { useCallback, useEffect, useRef, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import {
  listProjectConversations,
  type ProjectConversationSummaryResponse,
} from '@api/projects';

export interface UseProjectConversationsResult {
  items: ProjectConversationSummaryResponse[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useProjectConversations = (
  projectId: string | null,
): UseProjectConversationsResult => {
  const latestProjectIdRef = useRef<string | null>(projectId);
  const loadedProjectIdRef = useRef<string | null>(null);
  const [items, setItems] = useState<ProjectConversationSummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (requestProjectId: string) => {
    if (loadedProjectIdRef.current !== requestProjectId) {
      setItems([]);
      setError(null);
    }

    setLoading(true);

    try {
      const result = await listProjectConversations(requestProjectId);

      if (latestProjectIdRef.current !== requestProjectId) {
        return;
      }

      setItems(result.items);
      loadedProjectIdRef.current = requestProjectId;
      setError(null);
    } catch (currentError) {
      if (latestProjectIdRef.current !== requestProjectId) {
        return;
      }

      console.error('[ProjectLayout] 加载项目对话失败:', currentError);

      if (loadedProjectIdRef.current !== requestProjectId) {
        setItems([]);
      }

      setError(
        extractApiErrorMessage(
          currentError,
          '加载项目对话失败，请稍后重试。',
        ),
      );
    } finally {
      if (latestProjectIdRef.current === requestProjectId) {
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    const requestProjectId = latestProjectIdRef.current;

    if (!requestProjectId) {
      return;
    }

    await loadConversations(requestProjectId);
  }, [loadConversations]);

  useEffect(() => {
    latestProjectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    void loadConversations(projectId);
  }, [loadConversations, projectId]);

  return {
    items,
    loading,
    error,
    refresh,
  };
};
