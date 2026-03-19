import { getEffectiveLlmConfig } from "@config/ai-config.js";
import type { AppEnv } from "@config/env.js";
import type { WithId } from "mongodb";
import { AppError } from "@lib/app-error.js";
import {
  buildApiUrl,
  normalizeOpenAiCompatibleErrorMessage,
  parseResponseBody,
} from "@lib/http.js";
import type {
  KnowledgeCommandContext,
  KnowledgeSearchResponse,
} from "@modules/knowledge/knowledge.types.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type {
  EffectiveLlmConfig,
  SettingsLlmProvider,
} from "@modules/settings/settings.types.js";
import { buildDefaultProjectConversationTitle } from "./projects.shared.js";
import type {
  ProjectConversationDocument,
  ProjectConversationMessageDocument,
  ProjectConversationSourceDocument,
  ProjectDocument,
} from "./projects.types.js";

export interface ProjectConversationKnowledgeSearch {
  searchProjectDocuments(
    context: KnowledgeCommandContext,
    projectId: string,
    input: {
      query: string;
      topK?: number;
    },
  ): Promise<KnowledgeSearchResponse>;
}

export interface ProjectConversationRuntime {
  generateAssistantReply(input: {
    actor: KnowledgeCommandContext["actor"];
    project: WithId<ProjectDocument>;
    conversation: ProjectConversationDocument;
    userMessage: ProjectConversationMessageDocument;
  }): Promise<{
    content: string;
    sources: ProjectConversationSourceDocument[];
  }>;
}

export const DEFAULT_PROJECT_CONVERSATION_TITLE = "新对话";

const PROJECT_CONVERSATION_RETRIEVAL_TOP_K = 5;
const PROJECT_CONVERSATION_HISTORY_LIMIT = 6;
const PROJECT_CONVERSATION_AUTO_TITLE_MAX_LENGTH = 24;
const CHAT_COMPLETIONS_COMPATIBLE_PROJECT_LLM_PROVIDERS =
  new Set<SettingsLlmProvider>([
    "openai",
    "gemini",
    "aliyun",
    "deepseek",
    "moonshot",
    "zhipu",
    "custom",
  ]);

const createProjectConversationLlmUnavailableError = (): AppError => {
  return new AppError({
    statusCode: 503,
    code: "PROJECT_CONVERSATION_LLM_UNAVAILABLE",
    message: "当前未配置可用的对话模型，请先完成 LLM 设置",
  });
};

const createProjectConversationLlmProviderUnsupportedError = (): AppError => {
  return new AppError({
    statusCode: 503,
    code: "PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED",
    message: "当前 LLM Provider 暂不支持项目对话",
  });
};

const createProjectConversationLlmUpstreamError = (
  message: string,
  cause?: unknown,
): AppError => {
  return new AppError({
    statusCode: 502,
    code: "PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR",
    message,
    cause,
  });
};

const extractOpenAiCompatibleMessageContent = (body: unknown): string => {
  if (
    body &&
    typeof body === "object" &&
    "choices" in body &&
    Array.isArray(body.choices)
  ) {
    const firstChoice = body.choices[0];

    if (
      firstChoice &&
      typeof firstChoice === "object" &&
      "message" in firstChoice &&
      firstChoice.message &&
      typeof firstChoice.message === "object" &&
      "content" in firstChoice.message
    ) {
      const content = firstChoice.message.content;

      if (typeof content === "string") {
        return content.trim();
      }

      if (Array.isArray(content)) {
        return content
          .map((item) => {
            if (
              item &&
              typeof item === "object" &&
              "text" in item &&
              typeof item.text === "string"
            ) {
              return item.text.trim();
            }

            return "";
          })
          .filter(Boolean)
          .join("\n")
          .trim();
      }
    }
  }

  return "";
};

const buildProjectConversationSystemPrompt = (projectName: string): string => {
  return [
    "你是知项 Knowject 的项目对话助手。",
    `当前项目：${projectName}。`,
    "回答约束：",
    "1. 仅基于对话历史与提供的项目知识片段作答；信息不足时明确说明。",
    "2. 不要编造接口、状态、结论或未出现的事实。",
    "3. 使用简洁中文回答，优先给结论，再补充必要依据。",
  ].join("\n");
};

const buildProjectConversationContextPrompt = ({
  question,
  retrieval,
}: {
  question: string;
  retrieval: KnowledgeSearchResponse;
}): string => {
  const retrievalContext =
    retrieval.items.length > 0
      ? retrieval.items
          .map((item, index) =>
            [
              `[来源 ${index + 1}]`,
              `knowledgeId: ${item.knowledgeId}`,
              `documentId: ${item.documentId}`,
              `chunkId: ${item.chunkId}`,
              `chunkIndex: ${item.chunkIndex}`,
              `source: ${item.source}`,
              `content: ${item.content}`,
            ].join("\n"),
          )
          .join("\n\n")
      : "当前没有命中的项目知识片段。";

  return [
    "请结合下列项目知识片段回答用户问题。",
    "如果片段不足以支撑结论，请直接说明当前资料不足。",
    "",
    "项目知识片段：",
    retrievalContext,
    "",
    "用户问题：",
    question,
  ].join("\n");
};

const toProjectConversationHistoryMessages = (
  conversation: ProjectConversationDocument,
  latestUserMessageId: string,
): Array<{
  role: "user" | "assistant";
  content: string;
}> => {
  return conversation.messages
    .filter((message) => message.id !== latestUserMessageId)
    .slice(-PROJECT_CONVERSATION_HISTORY_LIMIT)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
};

const buildProjectConversationSourceSnippet = (content: string): string => {
  const normalizedContent = content.trim();

  if (normalizedContent.length <= 220) {
    return normalizedContent;
  }

  return `${normalizedContent.slice(0, 217)}...`;
};

const toProjectConversationSources = (
  retrieval: KnowledgeSearchResponse,
): ProjectConversationSourceDocument[] => {
  return retrieval.items.map((item) => ({
    knowledgeId: item.knowledgeId,
    documentId: item.documentId,
    chunkId: item.chunkId,
    chunkIndex: item.chunkIndex,
    source: item.source,
    snippet: buildProjectConversationSourceSnippet(item.content),
    distance: item.distance,
  }));
};

const normalizeProjectConversationTitleSource = (value: string): string => {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
};

const trimProjectConversationTitlePrefix = (value: string): string => {
  const prefixPatterns = [
    /^请帮我\s*/u,
    /^帮我\s*/u,
    /^帮忙\s*/u,
    /^麻烦(?:你)?\s*/u,
    /^请问\s*/u,
    /^请\s*/u,
    /^给我\s*/u,
    /^我想(?:要)?\s*/u,
    /^想要\s*/u,
    /^如何\s*/u,
    /^怎么\s*/u,
    /^为什么\s*/u,
    /^能否\s*/u,
    /^可以\s*/u,
  ];

  let result = value.trim();
  let changed = true;

  while (changed) {
    changed = false;

    for (const pattern of prefixPatterns) {
      if (pattern.test(result)) {
        const nextResult = result.replace(pattern, "").trimStart();

        if (nextResult && nextResult !== result) {
          result = nextResult;
          changed = true;
        }
      }
    }
  }

  return result;
};

export const createProjectConversationAutoTitle = (content: string): string => {
  const normalized = normalizeProjectConversationTitleSource(content);
  const firstSentence =
    normalized.split(/[。！？!?；;\n\r]+/u)[0]?.trim() ?? normalized;
  let candidate = trimProjectConversationTitlePrefix(firstSentence)
    .replace(/[。！？!?；;，,:：、]+$/u, "")
    .trim();

  if (candidate.length > PROJECT_CONVERSATION_AUTO_TITLE_MAX_LENGTH) {
    const firstClause = candidate.split(/[，,:：]/u)[0]?.trim() ?? candidate;

    if (firstClause.length >= 4) {
      candidate = firstClause;
    }
  }

  if (candidate.length > PROJECT_CONVERSATION_AUTO_TITLE_MAX_LENGTH) {
    candidate = `${candidate
      .slice(0, PROJECT_CONVERSATION_AUTO_TITLE_MAX_LENGTH)
      .trimEnd()}…`;
  }

  return candidate || DEFAULT_PROJECT_CONVERSATION_TITLE;
};

export const shouldAutoGenerateProjectConversationTitle = (
  conversation: ProjectConversationDocument,
  projectName: string,
): boolean => {
  const normalizedTitle = conversation.title.trim();

  return (
    !normalizedTitle ||
    normalizedTitle === DEFAULT_PROJECT_CONVERSATION_TITLE ||
    normalizedTitle === buildDefaultProjectConversationTitle(projectName)
  );
};

const requestProjectConversationCompletion = async ({
  llmConfig,
  messages,
}: {
  llmConfig: EffectiveLlmConfig;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}): Promise<string> => {
  if (
    !CHAT_COMPLETIONS_COMPATIBLE_PROJECT_LLM_PROVIDERS.has(llmConfig.provider)
  ) {
    throw createProjectConversationLlmProviderUnsupportedError();
  }

  if (!llmConfig.apiKey) {
    throw createProjectConversationLlmUnavailableError();
  }

  let responseBody: unknown = null;

  try {
    const response = await fetch(
      buildApiUrl(llmConfig.baseUrl, "/chat/completions"),
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: llmConfig.model,
          messages,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(llmConfig.requestTimeoutMs),
      },
    );
    responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw createProjectConversationLlmUpstreamError(
        normalizeOpenAiCompatibleErrorMessage(
          responseBody,
          `项目对话生成失败（HTTP ${response.status}）`,
        ),
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw createProjectConversationLlmUpstreamError(
      error instanceof Error && error.message.trim()
        ? error.message
        : "项目对话生成失败，请稍后重试",
      error,
    );
  }

  const content = extractOpenAiCompatibleMessageContent(responseBody);

  if (!content) {
    throw createProjectConversationLlmUpstreamError("项目对话模型返回了空内容");
  }

  return content;
};

export const createProjectConversationRuntime = ({
  env,
  settingsRepository,
  knowledgeSearch,
}: {
  env: AppEnv;
  settingsRepository: SettingsRepository;
  knowledgeSearch: ProjectConversationKnowledgeSearch;
}): ProjectConversationRuntime => {
  return {
    generateAssistantReply: async ({
      actor,
      project,
      conversation,
      userMessage,
    }) => {
      const [retrieval, llmConfig] = await Promise.all([
        knowledgeSearch.searchProjectDocuments(
          { actor },
          project._id.toHexString(),
          {
            query: userMessage.content,
            topK: PROJECT_CONVERSATION_RETRIEVAL_TOP_K,
          },
        ),
        getEffectiveLlmConfig({
          env,
          repository: settingsRepository,
        }),
      ]);

      const messages = [
        {
          role: "system" as const,
          content: buildProjectConversationSystemPrompt(project.name),
        },
        ...toProjectConversationHistoryMessages(conversation, userMessage.id),
        {
          role: "user" as const,
          content: buildProjectConversationContextPrompt({
            question: userMessage.content,
            retrieval,
          }),
        },
      ];
      const content = await requestProjectConversationCompletion({
        llmConfig,
        messages,
      });

      return {
        content,
        sources: toProjectConversationSources(retrieval),
      };
    },
  };
};
