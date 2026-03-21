import { AppError } from "@lib/app-error.js";
import { getFallbackMessage } from "@lib/locale.messages.js";
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
    throw createValidationAppError(
      getFallbackMessage("validation.required.messageContent"),
      {
        content: getFallbackMessage("validation.required.messageContent"),
      },
      "validation.required.messageContent",
    );
  }

  if (options?.requireClientRequestId && !clientRequestId) {
    throw createValidationAppError(
      getFallbackMessage("validation.clientRequestId.required"),
      {
        clientRequestId: getFallbackMessage(
          "validation.clientRequestId.required",
        ),
      },
      "validation.clientRequestId.required",
    );
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
    throw createValidationAppError(
      getFallbackMessage("validation.clientRequestId.required"),
      {
        clientRequestId: getFallbackMessage(
          "validation.clientRequestId.required",
        ),
      },
      "validation.clientRequestId.required",
    );
  }

  return clientRequestId;
};

export const createProjectConversationStreamingUnavailableError =
  (): AppError => {
    return new AppError({
      statusCode: 503,
      code: "PROJECT_CONVERSATION_STREAMING_UNAVAILABLE",
      message: getFallbackMessage("project.conversation.streamingUnavailable"),
      messageKey: "project.conversation.streamingUnavailable",
    });
  };

export const createProjectConversationReplayTargetError = (): AppError => {
  return createValidationAppError(
    getFallbackMessage("validation.projectConversation.replayTarget.invalid"),
    {
      targetUserMessageId: getFallbackMessage(
        "validation.projectConversation.replayTarget.invalid",
      ),
    },
    "validation.projectConversation.replayTarget.invalid",
  );
};
