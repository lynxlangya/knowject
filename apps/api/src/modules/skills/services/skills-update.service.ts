import type { WithId } from "mongodb";
import type { AppEnv } from "@config/env.js";
import type { SkillsRepository } from "../skills.repository.js";
import {
  buildSkillMarkdownExcerpt,
  buildSkillSlug,
  createSkillNotFoundError,
  normalizeStoredSkillForRead,
} from "../skills.shared.js";
import type { SkillDocument } from "../skills.types.js";
import {
  ensureSkillsStorageRoot,
  upsertSkillEntryFile,
  writeSkillBundleFiles,
} from "../adapters/skills-bundle-storage.js";
import type {
  NormalizedSkillUpdateInput,
  SkillUsageLookup,
} from "../types/skills.service.types.js";
import {
  assertSkillNotInUse,
  ensureUniqueSkillSlug,
} from "./skills-reference.service.js";

const toLifecycleStatus = (
  status: NonNullable<SkillDocument["status"]>,
): NonNullable<SkillDocument["lifecycleStatus"]> => {
  return status === "active" ? "published" : "draft";
};

const buildRollbackPatch = (
  currentSkill: WithId<SkillDocument>,
): Partial<SkillDocument> => {
  return {
    source: currentSkill.source,
    name: currentSkill.name,
    slug: currentSkill.slug,
    description: currentSkill.description,
    category: currentSkill.category,
    status: currentSkill.status,
    owner: currentSkill.owner,
    definition: currentSkill.definition,
    statusChangedAt: currentSkill.statusChangedAt,
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
  normalizedUpdate,
}: {
  env: AppEnv;
  repository: SkillsRepository;
  usageLookup: SkillUsageLookup;
  skillId: string;
  currentSkill: WithId<SkillDocument>;
  normalizedUpdate: NormalizedSkillUpdateInput;
}): Promise<WithId<SkillDocument>> => {
  const {
    normalizedSkill,
    persistCategory,
    persistOwner,
    persistDefinition,
  } = normalizedUpdate;
  const currentReadModel = normalizeStoredSkillForRead(currentSkill);
  const currentStatus = currentReadModel.status;
  const nextSlug = buildSkillSlug(normalizedSkill.name);
  await ensureUniqueSkillSlug(repository, nextSlug, skillId);
  const nextStatus = normalizedSkill.status;
  const nextLifecycleStatus = toLifecycleStatus(nextStatus);

  if (currentStatus === "active" && nextStatus !== "active") {
    await assertSkillNotInUse({
      skillId,
      action: nextStatus === "archived" ? "archive" : "deprecate",
      usageLookup,
    });
  }

  const nextPublishedAt =
    nextStatus === "active"
      ? (currentSkill.publishedAt ?? new Date())
      : currentSkill.publishedAt;
  const nextStatusChangedAt =
    currentStatus === nextStatus
      ? currentReadModel.statusChangedAt
      : new Date();
  const { file: nextSkillEntryFile, bundleFiles } = upsertSkillEntryFile(
    currentSkill.bundleFiles,
    normalizedSkill.skillMarkdown,
  );
  const updatePatch: Partial<SkillDocument> = {
    source: "team",
    name: normalizedSkill.name,
    slug: nextSlug,
    description: normalizedSkill.description,
    status: nextStatus,
    statusChangedAt: nextStatusChangedAt,
    lifecycleStatus: nextLifecycleStatus,
    skillMarkdown: normalizedSkill.skillMarkdown,
    markdownExcerpt: buildSkillMarkdownExcerpt(
      normalizedSkill.skillMarkdown,
      normalizedSkill.description,
    ),
    bundleFiles,
    publishedAt: nextPublishedAt,
    updatedAt: new Date(),
  };

  if (persistCategory) {
    updatePatch.category = normalizedSkill.category;
  }

  if (persistOwner) {
    updatePatch.owner = normalizedSkill.owner;
  }

  if (persistDefinition) {
    updatePatch.definition = normalizedSkill.definition;
  }

  const updatedSkill = await repository.updateSkill(skillId, updatePatch);

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
