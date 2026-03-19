export interface ProjectResourceOption {
  value: string;
  label: string;
}

export const createUnknownResourceOption = (
  resourceId: string,
  resourceLabel: string,
): ProjectResourceOption => {
  return {
    value: resourceId,
    label: `未知${resourceLabel}（${resourceId}）`,
  };
};

export const resolveSelectedResourceOptions = ({
  selectedIds,
  baseOptions,
  createFallbackOption = (resourceId) => ({
    value: resourceId,
    label: resourceId,
  }),
}: {
  selectedIds: string[];
  baseOptions: ProjectResourceOption[];
  createFallbackOption?: (resourceId: string) => ProjectResourceOption;
}): ProjectResourceOption[] => {
  const optionMap = new Map(
    baseOptions.map((option) => [option.value, option] as const),
  );

  selectedIds.forEach((resourceId) => {
    if (optionMap.has(resourceId)) {
      return;
    }

    optionMap.set(resourceId, createFallbackOption(resourceId));
  });

  return Array.from(optionMap.values());
};
