import { extractApiErrorCode, extractApiErrorMessage } from '@api/error';
import {
  getSettings,
  type SettingsAiConfigResponse,
  type SettingsLlmProvider,
} from '@api/settings';
import { useCallback, useEffect, useState } from 'react';
import { tp } from './project.i18n';

export type ProjectChatIssueCode =
  | 'PROJECT_CONVERSATION_LLM_UNAVAILABLE'
  | 'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED'
  | 'PROJECT_CONVERSATION_LLM_STREAM_UNSUPPORTED'
  | 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR';

export interface ProjectChatIssue {
  code: ProjectChatIssueCode;
  title: string;
  description: string;
}

export const useProjectChatSettings = (projectId: string) => {
  const [chatLlmSettings, setChatLlmSettings] = useState<
    SettingsAiConfigResponse<SettingsLlmProvider> | null
  >(null);
  const [chatSettingsLoading, setChatSettingsLoading] = useState(true);
  const [chatSettingsError, setChatSettingsError] = useState<string | null>(null);
  const [chatRuntimeIssue, setChatRuntimeIssue] = useState<ProjectChatIssue | null>(
    null,
  );

  const buildChatIssueFromError = useCallback(
    (error: unknown, fallback: string): ProjectChatIssue | null => {
      const code = extractApiErrorCode(error);
      const description = extractApiErrorMessage(error, fallback);

      if (code === 'PROJECT_CONVERSATION_LLM_UNAVAILABLE') {
        return {
          code,
          title: tp('chatSettings.unavailableTitle'),
          description,
        };
      }

      if (code === 'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED') {
        return {
          code,
          title: tp('chatSettings.providerUnsupportedTitle'),
          description,
        };
      }

      if (code === 'PROJECT_CONVERSATION_LLM_STREAM_UNSUPPORTED') {
        return {
          code,
          title: tp('chatSettings.streamUnsupportedTitle'),
          description,
        };
      }

      if (code === 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR') {
        return {
          code,
          title: tp('chatSettings.upstreamErrorTitle'),
          description,
        };
      }

      return null;
    },
    [],
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
    if (chatLlmSettings) {
      if (!chatLlmSettings.hasKey) {
        return {
          code: 'PROJECT_CONVERSATION_LLM_UNAVAILABLE' as const,
          title: tp('chatSettings.unavailableTitle'),
          description: tp('chatSettings.unavailableDescription'),
        };
      }
    }

    if (
      chatRuntimeIssue &&
      chatRuntimeIssue.code !== 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR'
    ) {
      return chatRuntimeIssue;
    }

    return null;
  })();

  const inlineChatIssue =
    chatRuntimeIssue?.code === 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR'
      ? chatRuntimeIssue
      : null;

  return {
    chatSettingsLoading,
    chatSettingsError,
    chatRuntimeIssue,
    setChatRuntimeIssue,
    blockingChatIssue,
    inlineChatIssue,
    buildChatIssueFromError,
    loadChatSettings,
  };
};
