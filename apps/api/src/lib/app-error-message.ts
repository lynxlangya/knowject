import type { SupportedLocale } from './locale.js';
import { DEFAULT_LOCALE } from './locale.js';
import { AppError } from './app-error.js';
import { getFallbackMessage, getMessage } from './locale.messages.js';

export const resolveLocalizedAppErrorMessage = (
  error: AppError,
  locale: SupportedLocale,
): string => {
  const localizedMessage = getMessage(
    error.messageKey,
    locale,
    error.messageParams,
  );

  if (!localizedMessage) {
    return error.message;
  }

  if (error.messageParams) {
    return localizedMessage;
  }

  const fallbackMessage = getMessage(
    error.messageKey,
    DEFAULT_LOCALE,
    error.messageParams,
  );
  const fallbackZhMessage = error.messageKey
    ? getFallbackMessage(error.messageKey, error.messageParams)
    : undefined;
  const sourceMessage = error.message.trim();

  if (
    sourceMessage &&
    sourceMessage !== localizedMessage &&
    sourceMessage !== fallbackMessage &&
    sourceMessage !== fallbackZhMessage
  ) {
    return error.message;
  }

  return localizedMessage;
};
