import { ObjectId, type WithId } from "mongodb";
import type { AppEnv } from "@config/env.js";
import type { ParsedSkillMarkdown } from "../skills.markdown.js";
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
import type { BuildPersistedSkillDocumentInput } from "../types/skills.service.types.js";

const buildPersistedSkillDocument = ({
  skillId,
  actorId,
  source,
  origin,
  parsedSkill,
  bundleFiles,
  importProvenance,
}: BuildPersistedSkillDocumentInput): SkillDocument & {
  _id: NonNullable<SkillDocument["_id"]>;
} => {
  const now = new Date();

  return {
    _id: skillId,
    name: parsedSkill.name,
    slug: buildSkillSlug(parsedSkill.name),
    description: parsedSkill.description,
    type: "markdown_bundle",
    source,
    origin,
    handler: null,
    parametersSchema: null,
    runtimeStatus: "contract_only",
    lifecycleStatus: "draft",
    skillMarkdown: parsedSkill.skillMarkdown,
    markdownExcerpt: buildSkillMarkdownExcerpt(
      parsedSkill.skillMarkdown,
      parsedSkill.description,
    ),
    storagePath: skillId.toHexString(),
    bundleFiles: mapBundleFiles(bundleFiles),
    importProvenance,
    createdBy: actorId,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
};

export const createManagedSkill = async ({
  env,
  repository,
  actorId,
  source,
  origin,
  parsedSkill,
  bundleFiles,
  importProvenance,
}: {
  env: AppEnv;
  repository: SkillsRepository;
  actorId: string;
  source: "custom" | "imported";
  origin: "manual" | "github" | "url";
  parsedSkill: ParsedSkillMarkdown;
  bundleFiles: {
    path: string;
    content: Buffer;
    size: number;
  }[];
  importProvenance: SkillDocument["importProvenance"];
}): Promise<WithId<SkillDocument>> => {
  const skillId = new ObjectId();
  const document = buildPersistedSkillDocument({
    skillId,
    actorId,
    source,
    origin,
    parsedSkill,
    bundleFiles,
    importProvenance,
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
