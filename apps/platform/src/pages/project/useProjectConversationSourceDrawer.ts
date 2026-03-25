import { useMemo, useState } from 'react';
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
  const scopeKey = `${activeProjectId}:${chatId ?? ''}`;
  const [drawerState, setDrawerState] = useState<{
    scopeKey: string;
    open: boolean;
    messageId: string | null;
    activeSourceKey: string | null;
    activeChunkId: string | null;
  }>(() => ({
    scopeKey,
    open: false,
    messageId: null,
    activeSourceKey: null,
    activeChunkId: null,
  }));

  const scopedDrawerState = drawerState.scopeKey === scopeKey
    ? drawerState
    : {
        scopeKey,
        open: false,
        messageId: null,
        activeSourceKey: null,
        activeChunkId: null,
      };

  const hasPersistedMessage = useMemo(() => {
    return Boolean(
      handoff?.assistantMessageId &&
        messages.some(
          (message) =>
            message.id === handoff.assistantMessageId &&
            message.role === 'assistant',
        ),
    );
  }, [handoff, messages]);

  const resolvedMessageId = useMemo(() => {
    return resolveProjectConversationSourceDrawerMessageId({
      currentMessageId: scopedDrawerState.messageId,
      handoff,
      hasPersistedMessage,
    });
  }, [scopedDrawerState.messageId, handoff, hasPersistedMessage]);

  const drawerPayload = useMemo(() => {
    if (!resolvedMessageId) {
      return {
        persistedSources: [] as ProjectConversationSourceResponse[],
        seedEntries: [] as ProjectChatSourceGroupEntry[],
        draftStatus: null as 'streaming' | 'reconciling' | 'error' | null,
      };
    }

    if (draftAssistantMessage?.id === resolvedMessageId) {
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
        message.id === resolvedMessageId && message.role === 'assistant',
    );

    return {
      persistedSources: matchedMessage?.sources ?? [],
      seedEntries: [] as ProjectChatSourceGroupEntry[],
      draftStatus: null as 'streaming' | 'reconciling' | 'error' | null,
    };
  }, [resolvedMessageId, draftAssistantMessage, messages]);

  const viewModel = useMemo(() => {
    return buildProjectConversationSourceDrawerViewModel({
      activeSourceKey: scopedDrawerState.activeSourceKey,
      persistedSources: drawerPayload.persistedSources,
      seedEntries: drawerPayload.seedEntries,
    });
  }, [
    scopedDrawerState.activeSourceKey,
    drawerPayload.persistedSources,
    drawerPayload.seedEntries,
  ]);

  const resolvedStatus: ProjectConversationSourceDrawerStatus = useMemo(() => {
    if (!scopedDrawerState.open) {
      return 'loading';
    }

    return resolveProjectConversationSourceDrawerStatus({
      hasPersistedSources: drawerPayload.persistedSources.length > 0,
      hasSeedEntries: drawerPayload.seedEntries.length > 0,
      draftStatus: drawerPayload.draftStatus,
    });
  }, [
    scopedDrawerState.open,
    drawerPayload.persistedSources.length,
    drawerPayload.seedEntries.length,
    drawerPayload.draftStatus,
  ]);

  const resolvedActiveChunkId = useMemo(() => {
    const activeDrawerSource =
      viewModel.sourceEntries.find(
        (entry) => entry.sourceKey === viewModel.activeSourceKey,
      ) ?? null;

    if (!scopedDrawerState.open || !activeDrawerSource) {
      return null;
    }

    const currentChunkId = scopedDrawerState.activeChunkId;
    const hasCurrentChunk = Boolean(
      currentChunkId &&
        activeDrawerSource.entries.some((entry) => entry.chunkId === currentChunkId),
    );

    if (hasCurrentChunk) {
      return currentChunkId;
    }

    return (
      activeDrawerSource.activeEntry.chunkId ??
      activeDrawerSource.entries[0]?.chunkId ??
      null
    );
  }, [
    scopedDrawerState.open,
    scopedDrawerState.activeChunkId,
    viewModel.activeSourceKey,
    viewModel.sourceEntries,
  ]);

  const resolvedState: ProjectConversationSourceDrawerState = {
    open: scopedDrawerState.open,
    messageId: resolvedMessageId,
    activeSourceKey: viewModel.activeSourceKey,
    activeChunkId: resolvedActiveChunkId,
    status: resolvedStatus,
  };

  const openDrawer = ({
    messageId,
    sourceKey,
  }: {
    messageId: string;
    sourceKey?: string;
  }) => {
    setDrawerState({
      scopeKey,
      open: true,
      messageId,
      activeSourceKey: sourceKey ?? null,
      activeChunkId: null,
    });
  };

  const closeDrawer = () => {
    setDrawerState((currentValue) => ({
      ...(currentValue.scopeKey === scopeKey
        ? currentValue
        : {
            scopeKey,
            open: false,
            messageId: null,
            activeSourceKey: null,
            activeChunkId: null,
          }),
      open: false,
    }));
  };

  const setActiveSourceKey = (sourceKey: string) => {
    setDrawerState((currentValue) => ({
      ...(currentValue.scopeKey === scopeKey
        ? currentValue
        : {
            scopeKey,
            open: false,
            messageId: null,
            activeSourceKey: null,
            activeChunkId: null,
          }),
      activeSourceKey: sourceKey,
      activeChunkId: null,
    }));
  };

  const setActiveChunkId = (chunkId: string) => {
    setDrawerState((currentValue) => ({
      ...(currentValue.scopeKey === scopeKey
        ? currentValue
        : {
            scopeKey,
            open: false,
            messageId: null,
            activeSourceKey: null,
            activeChunkId: null,
          }),
      activeChunkId: chunkId,
    }));
  };

  const retry = () => {
    void onRetry?.();
  };

  return {
    state: resolvedState,
    viewModel,
    openDrawer,
    closeDrawer,
    setActiveSourceKey,
    setActiveChunkId,
    retry,
  };
};
