import { extractApiErrorCode, extractApiErrorMessage } from '@api/error';
import {
  getSettings,
  type SettingsAiConfigResponse,
  type SettingsLlmProvider,
} from '@api/settings';
import { useCallback, useEffect, useState } from 'react';

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
          title: '当前未配置可用的对话模型',
          description,
        };
      }

      if (code === 'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED') {
        return {
          code,
          title: '当前 LLM Provider 暂不支持项目对话',
          description,
        };
      }

      if (code === 'PROJECT_CONVERSATION_LLM_STREAM_UNSUPPORTED') {
        return {
          code,
          title: '当前 LLM Provider 暂不支持流式项目对话',
          description,
        };
      }

      if (code === 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR') {
        return {
          code,
          title: '项目对话模型调用失败',
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
        extractApiErrorMessage(currentError, '读取对话配置失败，请稍后重试'),
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
          title: '当前未配置可用的对话模型',
          description:
            '请先前往设置页保存并测试 LLM API Key，项目对话才会生成 assistant 回复。',
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
