import type { WithId } from "mongodb";
import type { AppEnv } from "@config/env.js";
import type { ParsedSkillMarkdown } from "../skills.markdown.js";
import type { SkillsRepository } from "../skills.repository.js";
import {
  buildSkillMarkdownExcerpt,
  buildSkillSlug,
  createSkillNotFoundError,
} from "../skills.shared.js";
import type { SkillDocument, SkillLifecycleStatus } from "../skills.types.js";
import {
  ensureSkillsStorageRoot,
  upsertSkillEntryFile,
  writeSkillBundleFiles,
} from "../adapters/skills-bundle-storage.js";
import type { SkillUsageLookup } from "../types/skills.service.types.js";
import {
  assertSkillNotInUse,
  ensureUniqueSkillSlug,
} from "./skills-reference.service.js";

const buildRollbackPatch = (
  currentSkill: WithId<SkillDocument>,
): Partial<SkillDocument> => {
  return {
    name: currentSkill.name,
    slug: currentSkill.slug,
    description: currentSkill.description,
    lifecycleStatus: currentSkill.lifecycleStatus,
    skillMarkdown: currentSkill.skillMarkdown,
    markdownExcerpt: currentSkill.markdownExcerpt,
    bundleFiles: currentSkill.bundleFiles,
    publishedAt: currentSkill.publishedAt,
    updatedAt: currentSkill.updatedAt,
  };
};

export const updateManagedSkill = async ({
  env,
  repository,
  usageLookup,
  skillId,
  currentSkill,
  parsedSkill,
  lifecycleStatus,
}: {
  env: AppEnv;
  repository: SkillsRepository;
  usageLookup: SkillUsageLookup;
  skillId: string;
  currentSkill: WithId<SkillDocument>;
  parsedSkill: ParsedSkillMarkdown;
  lifecycleStatus?: SkillLifecycleStatus;
}): Promise<WithId<SkillDocument>> => {
  const nextSlug = buildSkillSlug(parsedSkill.name);
  await ensureUniqueSkillSlug(repository, nextSlug, skillId);
  const nextLifecycleStatus = lifecycleStatus ?? currentSkill.lifecycleStatus;

  if (
    currentSkill.lifecycleStatus === "published" &&
    nextLifecycleStatus === "draft"
  ) {
    await assertSkillNotInUse({
      skillId,
      action: "unpublish",
      usageLookup,
    });
  }

  const nextPublishedAt =
    nextLifecycleStatus === "published"
      ? (currentSkill.publishedAt ?? new Date())
      : null;
  const { file: nextSkillEntryFile, bundleFiles } = upsertSkillEntryFile(
    currentSkill.bundleFiles,
    parsedSkill.skillMarkdown,
  );
  const updatedSkill = await repository.updateSkill(skillId, {
    name: parsedSkill.name,
    slug: nextSlug,
    description: parsedSkill.description,
    lifecycleStatus: nextLifecycleStatus,
    skillMarkdown: parsedSkill.skillMarkdown,
    markdownExcerpt: buildSkillMarkdownExcerpt(
      parsedSkill.skillMarkdown,
      parsedSkill.description,
    ),
    bundleFiles,
    publishedAt: nextPublishedAt,
    updatedAt: new Date(),
  });

  if (!updatedSkill) {
    throw createSkillNotFoundError();
  }

  await ensureSkillsStorageRoot(env);

  try {
    await writeSkillBundleFiles(env, currentSkill.storagePath, [nextSkillEntryFile]);
  } catch (error) {
    try {
      await repository.updateSkill(skillId, buildRollbackPatch(currentSkill));
    } catch {
      // best effort rollback to lower DB/FS divergence when bundle write fails
    }

    throw error;
  }

  return updatedSkill;
};
