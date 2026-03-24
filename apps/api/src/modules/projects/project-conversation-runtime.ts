import { getEffectiveLlmConfig } from "@config/ai-config.js";
import type { AppEnv } from "@config/env.js";
import type { WithId } from "mongodb";
import type {
  KnowledgeCommandContext,
  KnowledgeSearchResponse,
} from "@modules/knowledge/knowledge.types.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import { buildDefaultProjectConversationTitle } from "./projects.shared.js";
import {
  buildProjectConversationCitationSources,
  normalizeProjectConversationCitationContent,
} from "./project-conversation-citation.js";
import { createProjectConversationProviderAdapter } from "./project-conversation-provider.js";
import type {
  ProjectConversationCitationContent,
  ProjectConversationDocument,
  ProjectConversationMessageDocument,
  ProjectConversationSourceDocument,
  ProjectConversationStreamSeedSource,
  ProjectDocument,
} from "./projects.types.js";
import type { ProjectConversationStreamFinishReason } from "./projects.types.js";

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
    locale?: KnowledgeCommandContext["locale"];
    project: WithId<ProjectDocument>;
    conversation: ProjectConversationDocument;
    userMessage: ProjectConversationMessageDocument;
  }): Promise<{
    content: string;
    sources: ProjectConversationSourceDocument[];
    citationContent?: ProjectConversationCitationContent;
  }>;
  streamAssistantReply(input: {
    actor: KnowledgeCommandContext["actor"];
    locale?: KnowledgeCommandContext["locale"];
    project: WithId<ProjectDocument>;
    conversation: ProjectConversationDocument;
    userMessage: ProjectConversationMessageDocument;
    signal?: AbortSignal;
    onSourcesSeed?(
      sources: ProjectConversationStreamSeedSource[],
    ): Promise<void> | void;
    onDelta(delta: string): Promise<void> | void;
  }): Promise<{
    content: string;
    sources: ProjectConversationSourceDocument[];
    finishReason: ProjectConversationStreamFinishReason;
    citationContent?: ProjectConversationCitationContent;
  }>;
}

export const DEFAULT_PROJECT_CONVERSATION_TITLE = "新对话";

const PROJECT_CONVERSATION_RETRIEVAL_TOP_K = 5;
const PROJECT_CONVERSATION_HISTORY_LIMIT = 6;
const PROJECT_CONVERSATION_AUTO_TITLE_MAX_LENGTH = 24;

const buildProjectConversationSystemPrompt = (projectName: string): string => {
  return [
    "你是知项 Knowject 的项目对话助手。",
    `当前项目：${projectName}。`,
    "回答约束：",
    "1. 仅基于对话历史与提供的项目知识片段作答；信息不足时明确说明。",
    "2. 不要编造接口、状态、结论或未出现的事实。",
    "3. 使用简洁中文回答，优先给结论，再补充必要依据。",
    "4. 若一句话由某个来源直接支撑，请仅在该句句末追加 `[[sourceN]]`。",
    "5. 多来源则按 sourceKey 顺序依次追加多个占位。",
    "6. 不要在代码块、链接、列表标记内部输出占位。",
  ].join("\n");
};

const buildProjectConversationContextPrompt = ({
  question,
  retrieval,
  sources,
}: {
  question: string;
  retrieval: KnowledgeSearchResponse;
  sources: ProjectConversationSourceDocument[];
}): string => {
  const retrievalContext =
    sources.length > 0
      ? sources
          .map((source, index) => {
            const retrievalItem =
              retrieval.items[source.retrievalIndex ?? index] ??
              retrieval.items[index];

            if (!retrievalItem) {
              return null;
            }

            return [
              source.sourceKey ?? `source${index + 1}`,
              `knowledgeId: ${retrievalItem.knowledgeId}`,
              `documentId: ${retrievalItem.documentId}`,
              `chunkId: ${retrievalItem.chunkId}`,
              `chunkIndex: ${retrievalItem.chunkIndex}`,
              `source: ${retrievalItem.source}`,
              `content: ${retrievalItem.content}`,
            ].join("\n");
          })
          .filter((item): item is string => item !== null)
          .map((item) => item)
          .join("\n\n")
      : retrieval.items.length > 0
        ? retrieval.items
            .map((item, index) =>
            [
              `source${index + 1}`,
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
    "引用来源时请使用 `[[sourceN]]` 形式追加在句末。",
    "",
    "项目知识片段：",
    retrievalContext,
    "",
    "用户问题：",
    question,
  ].join("\n");
};

const buildProjectConversationCitationPrompt = ({
  answer,
  sources,
}: {
  answer: string;
  sources: ProjectConversationSourceDocument[];
}): string => {
  const evidenceList = sources
    .map((source, index) =>
      [
        `[${source.sourceKey ?? `source${index + 1}`}]`,
        `sourceId: ${source.id ?? `s${index + 1}`}`,
        `source: ${source.source}`,
        `knowledgeId: ${source.knowledgeId}`,
        `documentId: ${source.documentId}`,
        `chunkId: ${source.chunkId}`,
        `chunkIndex: ${source.chunkIndex}`,
        `snippet: ${source.snippet}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    "请为下面这段最终回答生成结构化 citation JSON。",
    "答案中的 `[[sourceN]]` 占位对应 evidence 列表中的 sourceKey。",
    "输出 JSON 时，sourceIds 只能填写给定 evidence 列表中的 sourceId。",
    "grounded=true 仅在句子能被 evidence 直接支撑时使用；否则必须 grounded=false 且 sourceIds=[]。",
    "只输出 JSON，不要输出解释、Markdown 或额外文本。",
    '返回格式：{"version":1,"sentences":[{"id":"sent-1","text":"句子","sourceIds":["s1"],"grounded":true}]}',
    "",
    "最终回答：",
    answer,
    "",
    "evidence：",
    evidenceList,
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
  return retrieval.items.map((item, index) => ({
    retrievalIndex: index,
    knowledgeId: item.knowledgeId,
    documentId: item.documentId,
    chunkId: item.chunkId,
    chunkIndex: item.chunkIndex,
    source: item.source,
    snippet: buildProjectConversationSourceSnippet(item.content),
    distance: item.distance,
  }));
};

const toProjectConversationStreamSeedSources = (
  sources: ProjectConversationSourceDocument[],
): ProjectConversationStreamSeedSource[] => {
  const sourceSeeds = new Map<string, ProjectConversationStreamSeedSource>();

  sources.forEach((source, index) => {
    const sourceKey = source.sourceKey ?? `source${index + 1}`;

    if (sourceSeeds.has(sourceKey)) {
      return;
    }

    sourceSeeds.set(sourceKey, {
      id: source.id ?? `s${index + 1}`,
      sourceKey,
      knowledgeId: source.knowledgeId,
      documentId: source.documentId,
      sourceLabel: source.source,
      status: "seeded",
    });
  });

  return Array.from(sourceSeeds.values());
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
  if (conversation.titleOrigin !== undefined) {
    return conversation.titleOrigin === 'default';
  }

  const normalizedTitle = conversation.title.trim();

  return (
    !normalizedTitle ||
    normalizedTitle === DEFAULT_PROJECT_CONVERSATION_TITLE ||
    normalizedTitle === buildDefaultProjectConversationTitle(projectName)
  );
};

export const shouldRefreshProjectConversationAutoTitle = (
  conversation: ProjectConversationDocument,
  projectName: string,
): boolean => {
  if (conversation.titleOrigin !== undefined) {
    return conversation.titleOrigin !== 'manual';
  }

  return shouldAutoGenerateProjectConversationTitle(conversation, projectName);
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
  const providerAdapter = createProjectConversationProviderAdapter();

  const prepareAssistantReplyContext = async ({
    actor,
    locale,
    project,
    conversation,
    userMessage,
  }: {
    actor: KnowledgeCommandContext["actor"];
    locale?: KnowledgeCommandContext["locale"];
    project: WithId<ProjectDocument>;
    conversation: ProjectConversationDocument;
    userMessage: ProjectConversationMessageDocument;
  }): Promise<{
    llmConfig: Awaited<ReturnType<typeof getEffectiveLlmConfig>>;
    messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>;
    sources: ProjectConversationSourceDocument[];
  }> => {
    const [retrieval, llmConfig] = await Promise.all([
      knowledgeSearch.searchProjectDocuments(
        { actor, locale },
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
    const sources = buildProjectConversationCitationSources(
      toProjectConversationSources(retrieval),
    );

    return {
      llmConfig,
      messages: [
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
            sources,
          }),
        },
      ],
      sources,
    };
  };

  const generateCitationContent = async ({
    llmConfig,
    answer,
    sources,
  }: {
    llmConfig: Awaited<ReturnType<typeof getEffectiveLlmConfig>>;
    answer: string;
    sources: ProjectConversationSourceDocument[];
  }): Promise<ProjectConversationCitationContent | undefined> => {
    if (sources.length === 0) {
      return undefined;
    }

    try {
      const citationPayload = await providerAdapter.generate({
        llmConfig,
        messages: [
          {
            role: "system",
            content:
              "你负责为项目对话最终回答生成结构化 citation，只能输出合法 JSON。",
          },
          {
            role: "user",
            content: buildProjectConversationCitationPrompt({
              answer,
              sources,
            }),
          },
        ],
      });

      return (
        normalizeProjectConversationCitationContent(
          citationPayload,
          answer,
          sources,
        ) ??
        undefined
      );
    } catch {
      return undefined;
    }
  };

  return {
    generateAssistantReply: async ({
      actor,
      locale,
      project,
      conversation,
      userMessage,
    }) => {
      const { llmConfig, messages, sources } = await prepareAssistantReplyContext({
        actor,
        locale,
        project,
        conversation,
        userMessage,
      });
      const content = await providerAdapter.generate({
        llmConfig,
        messages,
      });
      const citationContent = await generateCitationContent({
        llmConfig,
        answer: content,
        sources,
      });

      return {
        content,
        sources,
        ...(citationContent !== undefined ? { citationContent } : {}),
      };
    },

    streamAssistantReply: async ({
      actor,
      locale,
      project,
      conversation,
      userMessage,
      signal,
      onSourcesSeed,
      onDelta,
    }) => {
      const { llmConfig, messages, sources } = await prepareAssistantReplyContext({
        actor,
        locale,
        project,
        conversation,
        userMessage,
      });
      const sourceSeeds = toProjectConversationStreamSeedSources(sources);

      if (sourceSeeds.length > 0) {
        await onSourcesSeed?.(sourceSeeds);
      }

      const streamedReply = await providerAdapter.stream({
        llmConfig,
        messages,
        signal,
        onDelta,
      });
      const citationContent =
        streamedReply.finishReason === "cancelled"
          ? undefined
          : await generateCitationContent({
              llmConfig,
              answer: streamedReply.content,
              sources,
            });

      return {
        content: streamedReply.content,
        sources,
        finishReason: streamedReply.finishReason,
        ...(citationContent !== undefined ? { citationContent } : {}),
      };
    },
  };
};
