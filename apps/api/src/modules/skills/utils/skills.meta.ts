import type { SkillsListResponse } from "../skills.types.js";

export const sortSkillItems = <
  T extends {
    source: "preset" | "team";
    updatedAt: string;
    createdAt: string;
  },
>(
  items: T[],
): T[] => {
  return [...items].sort((left, right) => {
    const updatedAtDelta =
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

    if (updatedAtDelta !== 0) {
      return updatedAtDelta;
    }

    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
};

export const buildSkillListMeta = (): SkillsListResponse["meta"] => {
  return {
    module: "skills",
    stage: "GA-09",
    registry: "preset+team",
    builtinOnly: false,
    boundaries: {
      businessRuntime: "node-express",
      registryStore: "mongodb+fs",
      knowledgeAccess: "service-layer-only",
      execution: "service-linked-or-contract-only",
      authoring: "structured-method-asset",
      source: "team-created-only",
      binding: "project-first",
      runtime: "manual-or-recommended-in-conversation",
    },
  };
};
