import {
  createSkillInUseError,
  createSkillSlugConflictError,
} from "../skills.shared.js";
import { findRegisteredSkillById } from "../skills.registry.js";
import type { SkillsRepository } from "../skills.repository.js";
import type {
  SkillReferenceCounts,
  SkillUsageLookup,
} from "../types/skills.service.types.js";

export const EMPTY_SKILL_REFERENCE_COUNTS: SkillReferenceCounts = {
  projectCount: 0,
  agentCount: 0,
};

const hasSkillReferences = (counts: SkillReferenceCounts): boolean => {
  return counts.projectCount > 0 || counts.agentCount > 0;
};

export const assertSkillNotInUse = async ({
  skillId,
  action,
  usageLookup,
}: {
  skillId: string;
  action: "delete" | "unpublish";
  usageLookup: SkillUsageLookup;
}): Promise<void> => {
  const counts = await usageLookup.countManagedSkillReferences(skillId);

  if (!hasSkillReferences(counts)) {
    return;
  }

  throw createSkillInUseError({
    action,
    projectCount: counts.projectCount,
    agentCount: counts.agentCount,
  });
};

export const ensureUniqueSkillSlug = async (
  repository: Pick<SkillsRepository, "findSkillBySlug">,
  slug: string,
  excludeSkillId?: string,
): Promise<void> => {
  if (findRegisteredSkillById(slug)) {
    throw createSkillSlugConflictError(slug);
  }

  const existingSkill = await repository.findSkillBySlug(slug);

  if (existingSkill && existingSkill._id.toHexString() !== excludeSkillId) {
    throw createSkillSlugConflictError(slug);
  }
};
