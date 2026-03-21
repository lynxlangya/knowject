import { AppError } from "@lib/app-error.js";
import { resolveLocalizedAppErrorMessage } from "@lib/app-error-message.js";
import { DEFAULT_LOCALE, type SupportedLocale } from "@lib/locale.js";
import { getMessage } from "@lib/locale.messages.js";
import { RETRYABLE_PROJECT_CONVERSATION_STREAM_ERROR_CODES } from "../constants/project-conversation-turn.constants.js";
import type { ProjectConversationStreamEvent } from "../projects.types.js";
import type { ProjectConversationStreamEmission } from "../types/project-conversation-turn.types.js";

export const isProjectConversationStreamRetryableError = (
  error: unknown,
): boolean => {
  if (error instanceof AppError) {
    return RETRYABLE_PROJECT_CONVERSATION_STREAM_ERROR_CODES.has(error.code);
  }

  return true;
};

export const createProjectConversationStreamErrorEvent = ({
  conversationId,
  clientRequestId,
  sequence,
  locale = DEFAULT_LOCALE,
  error,
}: {
  conversationId: string;
  clientRequestId: string;
  sequence: number;
  locale?: SupportedLocale;
  error: unknown;
}): ProjectConversationStreamEvent => {
  const normalizedError =
    error instanceof AppError
      ? error
      : new AppError({
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: getMessage("api.internalError", DEFAULT_LOCALE) ?? "",
          messageKey: "api.internalError",
          cause: error,
        });

  return {
    version: "v1",
    type: "error",
    sequence,
    conversationId,
    clientRequestId,
    code: normalizedError.code,
    message: resolveLocalizedAppErrorMessage(normalizedError, locale),
    retryable: isProjectConversationStreamRetryableError(normalizedError),
  };
};

export const createProjectConversationStreamEventEmitter = ({
  conversationId,
  clientRequestId,
  onEvent,
}: {
  conversationId: string;
  clientRequestId: string;
  onEvent(event: ProjectConversationStreamEvent): Promise<void> | void;
}) => {
  let sequence = 0;

  return {
    getNextSequence: (): number => sequence + 1,
    emitEvent: async (
      event: ProjectConversationStreamEmission,
    ): Promise<void> => {
      const nextEvent =
        "version" in event
          ? event
          : ({
              version: "v1",
              sequence: sequence + 1,
              conversationId,
              clientRequestId,
              ...event,
            } as ProjectConversationStreamEvent);

      sequence = nextEvent.sequence;
      await onEvent(nextEvent);
    },
  };
};
