import { useEffect, useMemo, useState } from 'react';
import type { ProjectConversationMessageRole } from '@api/projects';

export type ProjectConversationMessageRailMode =
  | 'browse'
  | 'starred'
  | 'selection';

export interface ProjectConversationMessageRailMessage {
  id: string;
  role: ProjectConversationMessageRole;
  createdAt: string;
  starred?: boolean;
}

export interface GetSelectableProjectConversationMessageIdsOptions {
  messages: ProjectConversationMessageRailMessage[];
  pendingUserMessageId?: string | null;
  draftAssistantMessageId?: string | null;
}

export interface BuildProjectConversationMessageRailSnapshotOptions
  extends GetSelectableProjectConversationMessageIdsOptions {
  mode?: ProjectConversationMessageRailMode;
  panelOpen?: boolean;
  selectedMessageIds?: string[];
}

export interface ProjectConversationMessageRailSnapshot {
  mode: ProjectConversationMessageRailMode;
  panelOpen: boolean;
  expanded: boolean;
  selectedMessageIds: string[];
  selectableMessageIds: string[];
  starredMessageIds: string[];
  visibleMessageIds: string[];
}

export interface UseProjectConversationMessageRailOptions
  extends BuildProjectConversationMessageRailSnapshotOptions {}

const normalizeUniqueMessageIds = (messageIds: string[]): string[] => {
  return Array.from(new Set(messageIds));
};

export const getStarredProjectConversationMessageIds = ({
  messages,
}: {
  messages: ProjectConversationMessageRailMessage[];
}): string[] => {
  return messages.filter((message) => Boolean(message.starred)).map((message) => message.id);
};

export const getVisibleProjectConversationMessageIds = ({
  mode,
  messages,
}: {
  mode: ProjectConversationMessageRailMode;
  messages: ProjectConversationMessageRailMessage[];
}): string[] => {
  if (mode === 'starred') {
    return getStarredProjectConversationMessageIds({
      messages,
    });
  }

  return messages.map((message) => message.id);
};

export interface ProjectConversationMessageRailSelectionState {
  mode: ProjectConversationMessageRailMode;
  selectedMessageIds: string[];
}

export const closeProjectConversationMessageKnowledgeDrawer = ({
  mode,
  selectedMessageIds,
}: ProjectConversationMessageRailSelectionState): ProjectConversationMessageRailSelectionState => {
  return {
    mode,
    selectedMessageIds: normalizeUniqueMessageIds(selectedMessageIds),
  };
};

export const completeProjectConversationMessageKnowledgeSave = ({
  mode,
}: ProjectConversationMessageRailSelectionState): ProjectConversationMessageRailSelectionState => {
  return {
    mode: mode === 'selection' ? 'browse' : mode,
    selectedMessageIds: [],
  };
};

export const getSelectableProjectConversationMessageIds = ({
  messages,
  pendingUserMessageId,
  draftAssistantMessageId,
}: GetSelectableProjectConversationMessageIdsOptions): string[] => {
  return messages
    .filter(
      (message) =>
        message.id !== pendingUserMessageId &&
        message.id !== draftAssistantMessageId,
    )
    .map((message) => message.id);
};

export const buildProjectConversationMessageRailSnapshot = ({
  mode = 'browse',
  panelOpen = false,
  selectedMessageIds = [],
  messages,
  pendingUserMessageId,
  draftAssistantMessageId,
}: BuildProjectConversationMessageRailSnapshotOptions): ProjectConversationMessageRailSnapshot => {
  const selectableMessageIds = getSelectableProjectConversationMessageIds({
    messages,
    pendingUserMessageId,
    draftAssistantMessageId,
  });
  const starredMessageIds = getStarredProjectConversationMessageIds({
    messages,
  });
  const selectableMessageIdSet = new Set(selectableMessageIds);
  const visibleMessageIds = getVisibleProjectConversationMessageIds({
    mode,
    messages,
  });

  return {
    mode,
    panelOpen,
    expanded: panelOpen || mode === 'selection',
    selectedMessageIds: normalizeUniqueMessageIds(selectedMessageIds).filter(
      (messageId) => selectableMessageIdSet.has(messageId),
    ),
    selectableMessageIds,
    starredMessageIds,
    visibleMessageIds,
  };
};

export const useProjectConversationMessageRail = ({
  mode: initialMode = 'browse',
  panelOpen: initialPanelOpen = false,
  selectedMessageIds: initialSelectedMessageIds = [],
  messages,
  pendingUserMessageId,
  draftAssistantMessageId,
}: UseProjectConversationMessageRailOptions) => {
  const [mode, setMode] = useState<ProjectConversationMessageRailMode>(
    initialMode,
  );
  const [panelOpen, setPanelOpen] = useState(initialPanelOpen);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>(
    () =>
      buildProjectConversationMessageRailSnapshot({
        mode: initialMode,
        panelOpen: initialPanelOpen,
        selectedMessageIds: initialSelectedMessageIds,
        messages,
        pendingUserMessageId,
        draftAssistantMessageId,
      }).selectedMessageIds,
  );

  const selectableMessageIds = useMemo(() => {
    return getSelectableProjectConversationMessageIds({
      messages,
      pendingUserMessageId,
      draftAssistantMessageId,
    });
  }, [messages, pendingUserMessageId, draftAssistantMessageId]);

  const selectableMessageIdSet = useMemo(() => {
    return new Set(selectableMessageIds);
  }, [selectableMessageIds]);
  const starredMessageIds = useMemo(() => {
    return getStarredProjectConversationMessageIds({
      messages,
    });
  }, [messages]);
  const visibleMessageIds = useMemo(() => {
    return getVisibleProjectConversationMessageIds({
      mode,
      messages,
    });
  }, [messages, mode]);

  useEffect(() => {
    setSelectedMessageIds((currentSelectedMessageIds) => {
      const nextSelectedMessageIds = currentSelectedMessageIds.filter((id) =>
        selectableMessageIdSet.has(id),
      );

      return nextSelectedMessageIds.length === currentSelectedMessageIds.length
        ? currentSelectedMessageIds
        : nextSelectedMessageIds;
    });
  }, [selectableMessageIdSet]);

  const expanded = panelOpen || mode === 'selection';

  const toggleSelectedMessageId = (messageId: string) => {
    if (!selectableMessageIdSet.has(messageId)) {
      return;
    }

    setSelectedMessageIds((currentSelectedMessageIds) => {
      if (currentSelectedMessageIds.includes(messageId)) {
        return currentSelectedMessageIds.filter((id) => id !== messageId);
      }

      return normalizeUniqueMessageIds([
        ...currentSelectedMessageIds,
        messageId,
      ]);
    });
  };

  const clearSelectedMessageIds = () => {
    setSelectedMessageIds([]);
  };

  return {
    mode,
    setMode,
    panelOpen,
    setPanelOpen,
    expanded,
    selectedMessageIds,
    setSelectedMessageIds,
    selectableMessageIds,
    starredMessageIds,
    visibleMessageIds,
    toggleSelectedMessageId,
    clearSelectedMessageIds,
  };
};
