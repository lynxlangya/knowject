import { ObjectId, type WithId } from "mongodb";
import type { AppEnv } from "@config/env.js";
import type { SkillsRepository } from "../skills.repository.js";
import {
  buildSkillMarkdownExcerpt,
  buildSkillSlug,
} from "../skills.shared.js";
import type { SkillDocument } from "../skills.types.js";
import {
  deleteSkillBundleFiles,
  ensureSkillsStorageRoot,
  mapBundleFiles,
  writeSkillBundleFiles,
} from "../adapters/skills-bundle-storage.js";
import { ensureUniqueSkillSlug } from "./skills-reference.service.js";
import type {
  BuildPersistedSkillDocumentInput,
  NormalizedSkillMutationInput,
} from "../types/skills.service.types.js";

const toLifecycleStatus = (
  status: NormalizedSkillMutationInput["status"],
): SkillDocument["lifecycleStatus"] => {
  return status === "active" ? "published" : "draft";
};

const buildPersistedSkillDocument = ({
  skillId,
  actorId,
  normalizedSkill,
  bundleFiles,
}: BuildPersistedSkillDocumentInput): SkillDocument & {
  _id: NonNullable<SkillDocument["_id"]>;
} => {
  const now = new Date();
  const lifecycleStatus = toLifecycleStatus(normalizedSkill.status);
  const publishedAt = normalizedSkill.status === "active" ? now : null;

  return {
    _id: skillId,
    name: normalizedSkill.name,
    slug: buildSkillSlug(normalizedSkill.name),
    description: normalizedSkill.description,
    type: "markdown_bundle",
    source: "team",
    origin: "manual",
    handler: null,
    parametersSchema: null,
    runtimeStatus: "contract_only",
    category: normalizedSkill.category,
    status: normalizedSkill.status,
    owner: normalizedSkill.owner,
    definition: normalizedSkill.definition,
    statusChangedAt: now,
    lifecycleStatus,
    skillMarkdown: normalizedSkill.skillMarkdown,
    markdownExcerpt: buildSkillMarkdownExcerpt(
      normalizedSkill.skillMarkdown,
      normalizedSkill.description,
    ),
    storagePath: skillId.toHexString(),
    bundleFiles: mapBundleFiles(bundleFiles),
    importProvenance: null,
    createdBy: actorId,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  };
};

export const createManagedSkill = async ({
  env,
  repository,
  actorId,
  normalizedSkill,
  bundleFiles,
}: {
  env: AppEnv;
  repository: SkillsRepository;
  actorId: string;
  normalizedSkill: NormalizedSkillMutationInput;
  bundleFiles: {
    path: string;
    content: Buffer;
    size: number;
  }[];
}): Promise<WithId<SkillDocument>> => {
  const skillId = new ObjectId();
  const document = buildPersistedSkillDocument({
    skillId,
    actorId,
    normalizedSkill,
    bundleFiles,
  });

  await ensureUniqueSkillSlug(repository, document.slug);
  await ensureSkillsStorageRoot(env);
  await writeSkillBundleFiles(env, document.storagePath, bundleFiles, {
    replaceDirectory: true,
  });

  try {
    return await repository.createSkill(document);
  } catch (error) {
    await deleteSkillBundleFiles(env, document.storagePath);
    throw error;
  }
};
