import { AppError } from "@lib/app-error.js";
import {
  buildApiUrl,
  normalizeOpenAiCompatibleErrorMessage,
  parseResponseBody,
} from "@lib/http.js";
import type { EffectiveLlmConfig } from "@modules/settings/settings.types.js";
import {
  isProjectConversationChatSupported,
  isProjectConversationStreamingSupported,
} from "./project-conversation-capabilities.js";
import type { ProjectConversationStreamFinishReason } from "./projects.types.js";

interface ProjectConversationProviderChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProjectConversationProviderStreamResult {
  content: string;
  finishReason: ProjectConversationStreamFinishReason;
}

export interface ProjectConversationProviderAdapter {
  generate(input: {
    llmConfig: EffectiveLlmConfig;
    messages: ProjectConversationProviderChatMessage[];
  }): Promise<string>;
  stream(input: {
    llmConfig: EffectiveLlmConfig;
    messages: ProjectConversationProviderChatMessage[];
    signal?: AbortSignal;
    onDelta(delta: string): Promise<void> | void;
  }): Promise<ProjectConversationProviderStreamResult>;
}

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

const createProjectConversationLlmStreamUnsupportedError = (): AppError => {
  return new AppError({
    statusCode: 503,
    code: "PROJECT_CONVERSATION_LLM_STREAM_UNSUPPORTED",
    message: "当前 LLM Provider 暂不支持流式项目对话",
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

const extractOpenAiCompatibleTextContent = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        "text" in item &&
        typeof item.text === "string"
      ) {
        return item.text;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
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
      return extractOpenAiCompatibleTextContent(firstChoice.message.content).trim();
    }
  }

  return "";
};

const normalizeFinishReason = (
  value: unknown,
): ProjectConversationStreamFinishReason => {
  if (value === "stop" || value === "length" || value === "cancelled") {
    return value;
  }

  return "unknown";
};

const extractOpenAiCompatibleDelta = (
  body: unknown,
): {
  delta: string;
  finishReason: ProjectConversationStreamFinishReason | null;
} => {
  if (
    !body ||
    typeof body !== "object" ||
    !("choices" in body) ||
    !Array.isArray(body.choices)
  ) {
    return {
      delta: "",
      finishReason: null,
    };
  }

  const firstChoice = body.choices[0];

  if (!firstChoice || typeof firstChoice !== "object") {
    return {
      delta: "",
      finishReason: null,
    };
  }

  const finishReason =
    "finish_reason" in firstChoice
      ? normalizeFinishReason(firstChoice.finish_reason)
      : null;

  const delta =
    "delta" in firstChoice &&
    firstChoice.delta &&
    typeof firstChoice.delta === "object" &&
    "content" in firstChoice.delta
      ? extractOpenAiCompatibleTextContent(firstChoice.delta.content)
      : "";

  return {
    delta,
    finishReason,
  };
};

const createProjectConversationRequestSignal = (
  timeoutMs: number,
  signal?: AbortSignal,
): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
};

const createProjectConversationStreamTimeoutController = ({
  timeoutMs,
  signal,
}: {
  timeoutMs: number;
  signal?: AbortSignal;
}): {
  signal: AbortSignal;
  arm(): void;
  clear(): void;
  didTimeout(): boolean;
} => {
  const timeoutAbortController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  const clear = (): void => {
    if (timeoutId === null) {
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = null;
  };

  const arm = (): void => {
    clear();
    timeoutId = setTimeout(() => {
      timedOut = true;
      timeoutAbortController.abort();
    }, timeoutMs);
  };

  return {
    signal: signal
      ? AbortSignal.any([signal, timeoutAbortController.signal])
      : timeoutAbortController.signal,
    arm,
    clear,
    didTimeout: () => timedOut,
  };
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === "AbortError";
};

const ensureProjectConversationProviderAvailability = ({
  llmConfig,
  requireStreaming = false,
}: {
  llmConfig: EffectiveLlmConfig;
  requireStreaming?: boolean;
}): void => {
  if (!isProjectConversationChatSupported(llmConfig.provider)) {
    throw createProjectConversationLlmProviderUnsupportedError();
  }

  if (requireStreaming && !isProjectConversationStreamingSupported(llmConfig.provider)) {
    throw createProjectConversationLlmStreamUnsupportedError();
  }

  if (!llmConfig.apiKey) {
    throw createProjectConversationLlmUnavailableError();
  }
};

const createOpenAiCompatibleRequestInit = ({
  llmConfig,
  messages,
  stream = false,
  signal,
  applyRequestTimeout = true,
}: {
  llmConfig: EffectiveLlmConfig;
  messages: ProjectConversationProviderChatMessage[];
  stream?: boolean;
  signal?: AbortSignal;
  applyRequestTimeout?: boolean;
}): RequestInit => {
  return {
    method: "POST",
    headers: {
      accept: stream ? "text/event-stream" : "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${llmConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: llmConfig.model,
      messages,
      temperature: 0.2,
      ...(stream ? { stream: true } : {}),
    }),
    signal: applyRequestTimeout
      ? createProjectConversationRequestSignal(
          llmConfig.requestTimeoutMs,
          signal,
        )
      : signal,
  };
};

const splitSseFrames = (
  buffer: string,
): {
  frames: string[];
  remainder: string;
} => {
  const frames: string[] = [];
  let normalizedBuffer = buffer;
  let separatorIndex = normalizedBuffer.indexOf("\n\n");

  while (separatorIndex >= 0) {
    frames.push(normalizedBuffer.slice(0, separatorIndex));
    normalizedBuffer = normalizedBuffer.slice(separatorIndex + 2);
    separatorIndex = normalizedBuffer.indexOf("\n\n");
  }

  return {
    frames,
    remainder: normalizedBuffer,
  };
};

const readSseDataPayload = (frame: string): string => {
  return frame
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();
};

export const createProjectConversationProviderAdapter =
  (): ProjectConversationProviderAdapter => {
    return {
      generate: async ({ llmConfig, messages }) => {
        ensureProjectConversationProviderAvailability({
          llmConfig,
        });

        let responseBody: unknown = null;

        try {
          const response = await fetch(
            buildApiUrl(llmConfig.baseUrl, "/chat/completions"),
            createOpenAiCompatibleRequestInit({
              llmConfig,
              messages,
            }),
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
          throw createProjectConversationLlmUpstreamError(
            "项目对话模型返回了空内容",
          );
        }

        return content;
      },

      stream: async ({ llmConfig, messages, signal, onDelta }) => {
        ensureProjectConversationProviderAvailability({
          llmConfig,
          requireStreaming: true,
        });

        const timeoutController = createProjectConversationStreamTimeoutController({
          timeoutMs: llmConfig.requestTimeoutMs,
          signal,
        });
        let response: Response;

        try {
          timeoutController.arm();
          response = await fetch(
            buildApiUrl(llmConfig.baseUrl, "/chat/completions"),
            createOpenAiCompatibleRequestInit({
              llmConfig,
              messages,
              stream: true,
              signal: timeoutController.signal,
              applyRequestTimeout: false,
            }),
          );
          timeoutController.clear();
        } catch (error) {
          timeoutController.clear();
          if (isAbortError(error) && signal?.aborted) {
            throw error;
          }

          if (timeoutController.didTimeout()) {
            throw createProjectConversationLlmUpstreamError(
              `项目对话流式生成超时（${llmConfig.requestTimeoutMs}ms 内未收到新内容）`,
              error,
            );
          }

          throw createProjectConversationLlmUpstreamError(
            error instanceof Error && error.message.trim()
              ? error.message
              : "项目对话流式生成失败，请稍后重试",
            error,
          );
        }

        if (!response.ok) {
          const responseBody = await parseResponseBody(response);

          throw createProjectConversationLlmUpstreamError(
            normalizeOpenAiCompatibleErrorMessage(
              responseBody,
              `项目对话流式生成失败（HTTP ${response.status}）`,
            ),
          );
        }

        if (!response.body) {
          throw createProjectConversationLlmUpstreamError(
            "项目对话流式生成未返回响应体",
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let content = "";
        let finishReason: ProjectConversationStreamFinishReason = "unknown";
        let receivedDoneSignal = false;

        try {
          while (!receivedDoneSignal) {
            timeoutController.arm();
            const { done, value } = await reader.read();
            timeoutController.clear();

            if (done) {
              break;
            }

            buffer += decoder
              .decode(value, {
                stream: true,
              })
              .replace(/\r\n/g, "\n");

            const { frames, remainder } = splitSseFrames(buffer);
            buffer = remainder;

            for (const frame of frames) {
              const payload = readSseDataPayload(frame);

              if (!payload) {
                continue;
              }

              if (payload === "[DONE]") {
                buffer = "";
                receivedDoneSignal = true;
                break;
              }

              let body: unknown;

              try {
                body = JSON.parse(payload);
              } catch (error) {
                throw createProjectConversationLlmUpstreamError(
                  "项目对话流式响应格式非法",
                  error,
                );
              }

              const chunk = extractOpenAiCompatibleDelta(body);

              if (chunk.finishReason) {
                finishReason = chunk.finishReason;
              }

              if (!chunk.delta) {
                continue;
              }

              content += chunk.delta;
              await onDelta(chunk.delta);
            }
          }

          const trailingPayload = receivedDoneSignal
            ? null
            : readSseDataPayload(
                `${buffer}${decoder.decode()}`.replace(/\r\n/g, "\n"),
              );

          if (trailingPayload && trailingPayload !== "[DONE]") {
            let body: unknown;

            try {
              body = JSON.parse(trailingPayload);
            } catch (error) {
              throw createProjectConversationLlmUpstreamError(
                "项目对话流式响应格式非法",
                error,
              );
            }

            const chunk = extractOpenAiCompatibleDelta(body);

            if (chunk.finishReason) {
              finishReason = chunk.finishReason;
            }

            if (chunk.delta) {
              content += chunk.delta;
              await onDelta(chunk.delta);
            }
          }
        } catch (error) {
          timeoutController.clear();
          if (isAbortError(error) && signal?.aborted) {
            throw error;
          }

          if (timeoutController.didTimeout()) {
            throw createProjectConversationLlmUpstreamError(
              `项目对话流式生成超时（${llmConfig.requestTimeoutMs}ms 内未收到新内容）`,
              error,
            );
          }

          if (error instanceof AppError) {
            throw error;
          }

          throw createProjectConversationLlmUpstreamError(
            error instanceof Error && error.message.trim()
              ? error.message
              : "项目对话流式生成失败，请稍后重试",
            error,
          );
        } finally {
          timeoutController.clear();
          reader.releaseLock();
        }

        const normalizedContent = content.trim();

        if (!normalizedContent) {
          throw createProjectConversationLlmUpstreamError(
            "项目对话模型返回了空内容",
          );
        }

        return {
          content: normalizedContent,
          finishReason,
        };
      },
    };
  };
