const isApiErrorLike = (
  error: unknown,
): error is Error & { code?: string | null } => {
  return error instanceof Error && error.name === 'ApiError';
};

export const extractApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  return isApiErrorLike(error) ? error.message : fallback;
};

export const extractApiErrorCode = (error: unknown): string | null => {
  return isApiErrorLike(error) ? error.code ?? null : null;
};
