import { AppError } from "@lib/app-error.js";
import {
  buildApiUrl,
  normalizeOpenAiCompatibleErrorMessage,
  parseResponseBody,
} from "@lib/http.js";
import type { MessageKey } from "@lib/locale.messages.js";
import { getFallbackMessage } from "@lib/locale.messages.js";
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
    signal?: AbortSignal;
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
    message: getFallbackMessage("project.conversation.llmUnavailable"),
    messageKey: "project.conversation.llmUnavailable",
  });
};

const createProjectConversationLlmProviderUnsupportedError = (): AppError => {
  return new AppError({
    statusCode: 503,
    code: "PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED",
    message: getFallbackMessage("project.conversation.providerUnsupported"),
    messageKey: "project.conversation.providerUnsupported",
  });
};

const createProjectConversationLlmStreamUnsupportedError = (): AppError => {
  return new AppError({
    statusCode: 503,
    code: "PROJECT_CONVERSATION_LLM_STREAM_UNSUPPORTED",
    message: getFallbackMessage("project.conversation.streamUnsupported"),
    messageKey: "project.conversation.streamUnsupported",
  });
};

const createProjectConversationLlmUpstreamError = (
  message: string,
  cause?: unknown,
  messageKey?: MessageKey,
  details?: unknown,
): AppError => {
  return new AppError({
    statusCode: 502,
    code: "PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR",
    message,
    messageKey,
    details,
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
      generate: async ({ llmConfig, messages, signal }) => {
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
              signal,
            }),
          );
          responseBody = await parseResponseBody(response);

          if (!response.ok) {
            throw createProjectConversationLlmUpstreamError(
              normalizeOpenAiCompatibleErrorMessage(
                responseBody,
                getFallbackMessage("project.conversation.generationFailed"),
              ),
              undefined,
              "project.conversation.generationFailed",
              {
                status: response.status,
                responseBody,
              },
            );
          }
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          }

          if (isAbortError(error) && signal?.aborted) {
            throw error;
          }

          if (isAbortError(error)) {
            throw createProjectConversationLlmUpstreamError(
              getFallbackMessage("project.conversation.timeout"),
              error,
              "project.conversation.timeout",
              {
                timeoutMs: llmConfig.requestTimeoutMs,
              },
            );
          }

          throw createProjectConversationLlmUpstreamError(
            error instanceof Error && error.message.trim()
              ? error.message
              : getFallbackMessage("project.conversation.generationFailed"),
            error,
            error instanceof Error && error.message.trim()
              ? undefined
              : "project.conversation.generationFailed",
          );
        }

        const content = extractOpenAiCompatibleMessageContent(responseBody);

        if (!content) {
          throw createProjectConversationLlmUpstreamError(
            getFallbackMessage("project.conversation.emptyResponse"),
            undefined,
            "project.conversation.emptyResponse",
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
              getFallbackMessage("project.conversation.timeout"),
              error,
              "project.conversation.timeout",
              {
                timeoutMs: llmConfig.requestTimeoutMs,
              },
            );
          }

          throw createProjectConversationLlmUpstreamError(
            error instanceof Error && error.message.trim()
              ? error.message
              : getFallbackMessage("project.conversation.streamFailed"),
            error,
            error instanceof Error && error.message.trim()
              ? undefined
              : "project.conversation.streamFailed",
          );
        }

        if (!response.ok) {
          const responseBody = await parseResponseBody(response);

          throw createProjectConversationLlmUpstreamError(
            normalizeOpenAiCompatibleErrorMessage(
              responseBody,
              getFallbackMessage("project.conversation.streamFailed"),
            ),
            undefined,
            "project.conversation.streamFailed",
            {
              status: response.status,
              responseBody,
            },
          );
        }

        if (!response.body) {
          throw createProjectConversationLlmUpstreamError(
            getFallbackMessage("project.conversation.responseBodyMissing"),
            undefined,
            "project.conversation.responseBodyMissing",
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
                  getFallbackMessage("project.conversation.invalidStreamFormat"),
                  error,
                  "project.conversation.invalidStreamFormat",
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
                getFallbackMessage("project.conversation.invalidStreamFormat"),
                error,
                "project.conversation.invalidStreamFormat",
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
              getFallbackMessage("project.conversation.timeout"),
              error,
              "project.conversation.timeout",
              {
                timeoutMs: llmConfig.requestTimeoutMs,
              },
            );
          }

          if (error instanceof AppError) {
            throw error;
          }

          throw createProjectConversationLlmUpstreamError(
            error instanceof Error && error.message.trim()
              ? error.message
              : getFallbackMessage("project.conversation.streamFailed"),
            error,
            error instanceof Error && error.message.trim()
              ? undefined
              : "project.conversation.streamFailed",
          );
        } finally {
          timeoutController.clear();
          reader.releaseLock();
        }

        const normalizedContent = content.trim();

        if (!normalizedContent) {
          throw createProjectConversationLlmUpstreamError(
            getFallbackMessage("project.conversation.emptyResponse"),
            undefined,
            "project.conversation.emptyResponse",
          );
        }

        return {
          content: normalizedContent,
          finishReason,
        };
      },
    };
  };
