import { useEffect, useRef, useState } from 'react';
import { extractApiErrorMessage } from '@api/error';
import { listKnowledge, type KnowledgeSummaryResponse } from '@api/knowledge';
import { pickNextActiveKnowledgeId } from './knowledgeDomain.shared';
import { tp } from './knowledge.i18n';

export const useKnowledgeListState = () => {
  const isFirstLoadRef = useRef(true);
  const preferredActiveIdRef = useRef<string | null>(null);
  const [items, setItems] = useState<KnowledgeSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeKnowledgeId, setActiveKnowledgeId] = useState<string | null>(null);
  const [listReloadToken, setListReloadToken] = useState(0);

  const reloadKnowledgeList = (preferredId?: string | null) => {
    preferredActiveIdRef.current = preferredId ?? null;
    setListReloadToken((value) => value + 1);
  };

  useEffect(() => {
    let isMounted = true;

    const loadKnowledgeList = async () => {
      if (isFirstLoadRef.current) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const result = await listKnowledge();

        if (!isMounted) {
          return;
        }

        setItems(result.items);
        setError(null);
        setActiveKnowledgeId((currentId) => {
          const nextId = pickNextActiveKnowledgeId(
            result.items,
            preferredActiveIdRef.current,
            currentId,
          );

          preferredActiveIdRef.current = null;
          return nextId;
        });
      } catch (currentError) {
        if (!isMounted) {
          return;
        }

        console.error('[KnowledgeManagement] 加载知识库列表失败:', currentError);
        setError(
          extractApiErrorMessage(currentError, tp('management.listLoadFailed')),
        );
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
          isFirstLoadRef.current = false;
        }
      }
    };

    void loadKnowledgeList();

    return () => {
      isMounted = false;
    };
  }, [listReloadToken]);

  return {
    items,
    setItems,
    loading,
    refreshing,
    error,
    activeKnowledgeId,
    activeSummary:
      items.find((knowledge) => knowledge.id === activeKnowledgeId) ?? null,
    setActiveKnowledgeId,
    reloadKnowledgeList,
  };
};
