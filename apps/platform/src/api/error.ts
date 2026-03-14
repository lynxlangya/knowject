import { isApiError } from '@knowject/request';

export const extractApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  return isApiError(error) ? error.message : fallback;
};
