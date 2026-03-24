import { useEffect, useMemo, useState } from 'react';
import type {
  ProjectConversationMessageResponse,
  ProjectConversationSourceResponse,
  ProjectConversationStreamSourcesSeedItem,
} from '@api/projects';
import {
  buildProjectConversationSourceDrawerViewModel,
  type ProjectChatSourceGroupEntry,
} from './projectChatSources';

export type ProjectConversationSourceDrawerStatus =
  | 'loading'
  | 'ready'
  | 'error';

export interface ProjectConversationSourceDrawerAssistantDraft {
  id: string;
  status: 'streaming' | 'reconciling' | 'error';
  sources?: ProjectConversationSourceResponse[];
  sourceSeedEntries?: ProjectConversationStreamSourcesSeedItem[];
}

export interface ProjectConversationSourceDrawerHandoff {
  draftMessageId: string;
  assistantMessageId: string;
}

export interface ProjectConversationSourceDrawerState {
  open: boolean;
  messageId: string | null;
  activeSourceKey: string | null;
  activeChunkId: string | null;
  status: ProjectConversationSourceDrawerStatus;
}

export const resolveProjectConversationSourceDrawerMessageId = ({
  currentMessageId,
  handoff,
  hasPersistedMessage,
}: {
  currentMessageId: string | null;
  handoff: ProjectConversationSourceDrawerHandoff | null;
  hasPersistedMessage: boolean;
}): string | null => {
  if (!currentMessageId || !handoff) {
    return currentMessageId;
  }

  if (!hasPersistedMessage) {
    return currentMessageId;
  }

  return currentMessageId === handoff.draftMessageId
    ? handoff.assistantMessageId
    : currentMessageId;
};

const buildSourceSeedGroupEntries = (
  seedItems: ProjectConversationStreamSourcesSeedItem[] | undefined,
): ProjectChatSourceGroupEntry[] => {
  if (!seedItems || seedItems.length <= 0) {
    return [];
  }

  const groupedBySourceKey = new Map<string, ProjectChatSourceGroupEntry>();
  seedItems.forEach((seedItem) => {
    if (groupedBySourceKey.has(seedItem.sourceKey)) {
      return;
    }

    groupedBySourceKey.set(seedItem.sourceKey, {
      sourceKey: seedItem.sourceKey,
      knowledgeId: seedItem.knowledgeId,
      documentId: seedItem.documentId,
      sourceLabel: seedItem.sourceLabel,
      snippet: '',
      distance: null,
      chunkIds: [],
      entries: [],
    });
  });

  return Array.from(groupedBySourceKey.values());
};

interface UseProjectConversationSourceDrawerOptions {
  activeProjectId: string;
  chatId?: string;
  messages: ProjectConversationMessageResponse[];
  draftAssistantMessage: ProjectConversationSourceDrawerAssistantDraft | null;
  handoff: ProjectConversationSourceDrawerHandoff | null;
  onRetry?: () => void | Promise<void>;
}

export const resolveProjectConversationSourceDrawerStatus = ({
  hasPersistedSources,
  hasSeedEntries,
  draftStatus,
}: {
  hasPersistedSources: boolean;
  hasSeedEntries: boolean;
  draftStatus: 'streaming' | 'reconciling' | 'error' | null;
}): ProjectConversationSourceDrawerStatus => {
  if (hasPersistedSources) {
    return 'ready';
  }

  if (!hasSeedEntries) {
    return 'loading';
  }

  return draftStatus === 'error' ? 'error' : 'loading';
};

export const useProjectConversationSourceDrawer = ({
  activeProjectId,
  chatId,
  messages,
  draftAssistantMessage,
  handoff,
  onRetry,
}: UseProjectConversationSourceDrawerOptions) => {
  const [drawerState, setDrawerState] = useState<ProjectConversationSourceDrawerState>({
    open: false,
    messageId: null,
    activeSourceKey: null,
    activeChunkId: null,
    status: 'loading',
  });
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    setDrawerState({
      open: false,
      messageId: null,
      activeSourceKey: null,
      activeChunkId: null,
      status: 'loading',
    });
    setRetryNonce(0);
  }, [activeProjectId, chatId]);

  useEffect(() => {
    setDrawerState((currentValue) => {
      const hasPersistedMessage = Boolean(
        handoff?.assistantMessageId &&
          messages.some(
            (message) =>
              message.id === handoff.assistantMessageId &&
              message.role === 'assistant',
          ),
      );
      const nextMessageId = resolveProjectConversationSourceDrawerMessageId({
        currentMessageId: currentValue.messageId,
        handoff,
        hasPersistedMessage,
      });

      if (nextMessageId === currentValue.messageId) {
        return currentValue;
      }

      return {
        ...currentValue,
        messageId: nextMessageId,
      };
    });
  }, [handoff, messages]);

  const drawerPayload = useMemo(() => {
    if (!drawerState.messageId) {
      return {
        persistedSources: [] as ProjectConversationSourceResponse[],
        seedEntries: [] as ProjectChatSourceGroupEntry[],
        draftStatus: null as 'streaming' | 'reconciling' | 'error' | null,
      };
    }

    if (draftAssistantMessage?.id === drawerState.messageId) {
      return {
        persistedSources: draftAssistantMessage.sources ?? [],
        seedEntries: buildSourceSeedGroupEntries(
          draftAssistantMessage.sourceSeedEntries,
        ),
        draftStatus: draftAssistantMessage.status,
      };
    }

    const matchedMessage = messages.find(
      (message) =>
        message.id === drawerState.messageId && message.role === 'assistant',
    );

    return {
      persistedSources: matchedMessage?.sources ?? [],
      seedEntries: [] as ProjectChatSourceGroupEntry[],
      draftStatus: null as 'streaming' | 'reconciling' | 'error' | null,
    };
  }, [drawerState.messageId, draftAssistantMessage, messages, retryNonce]);

  const viewModel = useMemo(() => {
    return buildProjectConversationSourceDrawerViewModel({
      activeSourceKey: drawerState.activeSourceKey,
      persistedSources: drawerPayload.persistedSources,
      seedEntries: drawerPayload.seedEntries,
    });
  }, [
    drawerState.activeSourceKey,
    drawerPayload.persistedSources,
    drawerPayload.seedEntries,
  ]);

  useEffect(() => {
    if (!drawerState.open) {
      return;
    }

    const nextStatus: ProjectConversationSourceDrawerStatus =
      resolveProjectConversationSourceDrawerStatus({
        hasPersistedSources: drawerPayload.persistedSources.length > 0,
        hasSeedEntries: drawerPayload.seedEntries.length > 0,
        draftStatus: drawerPayload.draftStatus,
      });

    if (
      drawerState.status !== nextStatus ||
      drawerState.activeSourceKey !== viewModel.activeSourceKey
    ) {
      setDrawerState((currentValue) => ({
        ...currentValue,
        status: nextStatus,
        activeSourceKey: viewModel.activeSourceKey,
      }));
    }
  }, [
    drawerState.open,
    drawerState.status,
    drawerState.activeSourceKey,
    drawerPayload.persistedSources.length,
    drawerPayload.seedEntries.length,
    drawerPayload.draftStatus,
    viewModel.activeSourceKey,
  ]);

  useEffect(() => {
    const activeDrawerSource =
      viewModel.sourceEntries.find(
        (entry) => entry.sourceKey === viewModel.activeSourceKey,
      ) ?? null;

    if (!drawerState.open || !activeDrawerSource) {
      return;
    }

    const hasCurrentChunk = Boolean(
      drawerState.activeChunkId &&
        activeDrawerSource.entries.some(
          (entry) => entry.chunkId === drawerState.activeChunkId,
        ),
    );

    if (hasCurrentChunk) {
      return;
    }

    const fallbackChunkId =
      activeDrawerSource.activeEntry.chunkId ??
      activeDrawerSource.entries[0]?.chunkId ??
      null;

    if (fallbackChunkId !== drawerState.activeChunkId) {
      setDrawerState((currentValue) => ({
        ...currentValue,
        activeChunkId: fallbackChunkId,
      }));
    }
  }, [
    drawerState.open,
    drawerState.activeChunkId,
    viewModel.activeSourceKey,
    viewModel.sourceEntries,
  ]);

  const openDrawer = ({
    messageId,
    sourceKey,
  }: {
    messageId: string;
    sourceKey?: string;
  }) => {
    setDrawerState({
      open: true,
      messageId,
      activeSourceKey: sourceKey ?? null,
      activeChunkId: null,
      status: 'loading',
    });
  };

  const closeDrawer = () => {
    setDrawerState((currentValue) => ({
      ...currentValue,
      open: false,
    }));
  };

  const setActiveSourceKey = (sourceKey: string) => {
    setDrawerState((currentValue) => ({
      ...currentValue,
      activeSourceKey: sourceKey,
      activeChunkId: null,
    }));
  };

  const setActiveChunkId = (chunkId: string) => {
    setDrawerState((currentValue) => ({
      ...currentValue,
      activeChunkId: chunkId,
    }));
  };

  const retry = () => {
    setRetryNonce((value) => value + 1);
    setDrawerState((currentValue) => ({
      ...currentValue,
      status: 'loading',
    }));
    void onRetry?.();
  };

  return {
    state: drawerState,
    viewModel,
    openDrawer,
    closeDrawer,
    setActiveSourceKey,
    setActiveChunkId,
    retry,
  };
};
