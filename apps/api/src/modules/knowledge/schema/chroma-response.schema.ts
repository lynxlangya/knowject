export const isStringMatrix = (value: unknown): value is string[][] => {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        Array.isArray(row) && row.every((item) => typeof item === "string"),
    )
  );
};

export const isDocumentMatrix = (
  value: unknown,
): value is Array<Array<string | null>> => {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.every((item) => item === null || typeof item === "string"),
    )
  );
};

export const isMetadataMatrix = (
  value: unknown,
): value is Array<Array<Record<string, unknown> | null>> => {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.every(
          (item) =>
            item === null ||
            (typeof item === "object" && item !== null && !Array.isArray(item)),
        ),
    )
  );
};

export const isDistanceMatrix = (
  value: unknown,
): value is Array<Array<number | null>> => {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.every((item) => item === null || typeof item === "number"),
    )
  );
};
