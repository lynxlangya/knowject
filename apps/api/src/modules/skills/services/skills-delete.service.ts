import type { AppEnv } from "@config/env.js";
import type { SkillsRepository } from "../skills.repository.js";
import { createSkillNotFoundError } from "../skills.shared.js";
import type { SkillDocument } from "../skills.types.js";
import { deleteSkillBundleFiles } from "../adapters/skills-bundle-storage.js";
import type { SkillUsageLookup } from "../types/skills.service.types.js";
import { assertSkillNotInUse } from "./skills-reference.service.js";

export const deleteManagedSkill = async ({
  env,
  repository,
  usageLookup,
  skillId,
  currentSkill,
}: {
  env: AppEnv;
  repository: SkillsRepository;
  usageLookup: SkillUsageLookup;
  skillId: string;
  currentSkill: SkillDocument & { _id: NonNullable<SkillDocument["_id"]> };
}): Promise<void> => {
  await assertSkillNotInUse({
    skillId,
    action: "delete",
    usageLookup,
  });

  const deleted = await repository.deleteSkill(skillId);

  if (!deleted) {
    throw createSkillNotFoundError();
  }

  await deleteSkillBundleFiles(env, currentSkill.storagePath);
};
