import { extractApiErrorMessage } from '@api/error';
import {
  getSettings,
  type SettingsAiConfigResponse,
  type SettingsLlmProvider,
} from '@api/settings';
import { useCallback, useEffect, useState } from 'react';
import {
  buildProjectChatIssueFromError,
  isInlineProjectChatIssue,
  type ProjectChatIssue,
} from './projectChatIssues';
import { tp } from './project.i18n';

export type { ProjectChatIssue, ProjectChatIssueCode } from './projectChatIssues';

export const useProjectChatSettings = (projectId: string) => {
  const [chatLlmSettings, setChatLlmSettings] = useState<
    SettingsAiConfigResponse<SettingsLlmProvider> | null
  >(null);
  const [chatSettingsLoading, setChatSettingsLoading] = useState(true);
  const [chatSettingsError, setChatSettingsError] = useState<string | null>(null);
  const [chatRuntimeIssue, setChatRuntimeIssue] = useState<ProjectChatIssue | null>(
    null,
  );

  const loadChatSettings = useCallback(async () => {
    setChatSettingsLoading(true);
    setChatSettingsError(null);

    try {
      const result = await getSettings();
      setChatLlmSettings(result.llm);
      setChatRuntimeIssue(null);
    } catch (currentError) {
      console.error('[ProjectChatPage] 加载对话配置失败:', currentError);
      setChatLlmSettings(null);
      setChatSettingsError(
        extractApiErrorMessage(currentError, tp('chatSettings.loadFailed')),
      );
    } finally {
      setChatSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChatSettings();
  }, [loadChatSettings, projectId]);

  const blockingChatIssue = (() => {
    if (chatRuntimeIssue && !isInlineProjectChatIssue(chatRuntimeIssue)) {
      return chatRuntimeIssue;
    }

    if (chatLlmSettings && !chatLlmSettings.hasKey) {
      return {
        code: 'PROJECT_CONVERSATION_LLM_UNAVAILABLE' as const,
        title: tp('chatSettings.unavailableTitle'),
        description: tp('chatSettings.unavailableDescription'),
      };
    }

    return null;
  })();

  const inlineChatIssue = isInlineProjectChatIssue(chatRuntimeIssue)
    ? chatRuntimeIssue
    : null;

  return {
    chatSettingsLoading,
    chatSettingsError,
    chatRuntimeIssue,
    setChatRuntimeIssue,
    blockingChatIssue,
    inlineChatIssue,
    buildChatIssueFromError: buildProjectChatIssueFromError,
    loadChatSettings,
  };
};
