const readObjectField = (value: unknown, field: string): unknown => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !(field in value)
  ) {
    return undefined;
  }

  return value[field as keyof typeof value];
};

const readStringValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue || undefined;
};

export const buildApiUrl = (baseUrl: string, path: string): string => {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ""), normalizedBaseUrl).toString();
};

export const parseResponseBody = async (
  response: Response,
): Promise<unknown> => {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
};

export const normalizeOpenAiCompatibleErrorMessage = (
  responseBody: unknown,
  fallbackMessage: string,
): string => {
  const nestedErrorMessage = readStringValue(
    readObjectField(readObjectField(responseBody, "error"), "message"),
  );

  if (nestedErrorMessage) {
    return nestedErrorMessage;
  }

  return (
    readStringValue(readObjectField(responseBody, "message")) ??
    readStringValue(responseBody) ??
    fallbackMessage
  );
};

export const normalizeIndexerErrorMessage = (
  value: unknown,
  fallbackMessage = "Python indexer 处理失败",
): string => {
  return (
    readStringValue(readObjectField(value, "errorMessage")) ??
    readStringValue(readObjectField(value, "message")) ??
    (value instanceof Error ? readStringValue(value.message) : undefined) ??
    readStringValue(value) ??
    fallbackMessage
  );
};
