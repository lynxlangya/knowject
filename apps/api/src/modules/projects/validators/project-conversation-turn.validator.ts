import { AppError } from "@lib/app-error.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import type { CreateProjectConversationMessageInput } from "../projects.types.js";
import type {
  ProjectConversationTurnInput,
  ProjectConversationTurnPreparationOptions,
} from "../types/project-conversation-turn.types.js";

export const validateCreateProjectConversationMessageInput = (
  input: CreateProjectConversationMessageInput,
  options?: ProjectConversationTurnPreparationOptions,
): ProjectConversationTurnInput => {
  const normalizedInput = readMutationInput(input, {
    allowUndefined: true,
  });
  const content = readOptionalStringField(normalizedInput.content, "content");
  const clientRequestId = readOptionalStringField(
    normalizedInput.clientRequestId,
    "clientRequestId",
  );
  const targetUserMessageId = readOptionalStringField(
    normalizedInput.targetUserMessageId,
    "targetUserMessageId",
  );

  if (!content) {
    throw createValidationAppError("请输入消息内容", {
      content: "请输入消息内容",
    });
  }

  if (options?.requireClientRequestId && !clientRequestId) {
    throw createValidationAppError("流式消息必须携带 clientRequestId", {
      clientRequestId: "流式消息必须携带 clientRequestId",
    });
  }

  return {
    content,
    clientRequestId,
    targetUserMessageId,
  };
};

export const requireProjectConversationClientRequestId = (
  clientRequestId?: string,
): string => {
  if (!clientRequestId) {
    throw createValidationAppError("流式消息必须携带 clientRequestId", {
      clientRequestId: "流式消息必须携带 clientRequestId",
    });
  }

  return clientRequestId;
};

export const createProjectConversationStreamingUnavailableError =
  (): AppError => {
    return new AppError({
      statusCode: 503,
      code: "PROJECT_CONVERSATION_STREAMING_UNAVAILABLE",
      message: "当前项目对话流式能力暂不可用",
    });
  };

export const createProjectConversationReplayTargetError = (): AppError => {
  return createValidationAppError(
    "targetUserMessageId 必须指向当前会话中的用户消息",
    {
      targetUserMessageId: "targetUserMessageId 必须指向当前会话中的用户消息",
    },
  );
};
