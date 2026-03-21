import { getFallbackMessage } from "./locale.messages.js";
import { createValidationAppError } from "./validation.js";

interface ReadMutationInputOptions {
  allowUndefined?: boolean;
}

export const readMutationInput = <T>(
  input: T | undefined,
  options: ReadMutationInputOptions = {},
): T & Record<string, unknown> => {
  if (input === undefined) {
    if (options.allowUndefined) {
      return {} as T & Record<string, unknown>;
    }

    throw createValidationAppError(
      getFallbackMessage("validation.object"),
      {
        body: getFallbackMessage("validation.object"),
      },
      "validation.object",
    );
  }

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw createValidationAppError(
      getFallbackMessage("validation.object"),
      {
        body: getFallbackMessage("validation.object"),
      },
      "validation.object",
    );
  }

  return input as T & Record<string, unknown>;
};
