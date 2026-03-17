import { isApiError } from '@knowject/request';

export const extractApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  return isApiError(error) ? error.message : fallback;
};

export const extractApiErrorCode = (error: unknown): string | null => {
  return isApiError(error) ? error.code ?? null : null;
};
