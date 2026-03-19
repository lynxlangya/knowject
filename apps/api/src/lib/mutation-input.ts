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

    throw createValidationAppError("请求体必须为对象", {
      body: "请求体必须为对象",
    });
  }

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw createValidationAppError("请求体必须为对象", {
      body: "请求体必须为对象",
    });
  }

  return input as T & Record<string, unknown>;
};
