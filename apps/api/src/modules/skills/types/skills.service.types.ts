import type { ObjectId } from "mongodb";
import type { ParsedSkillMarkdown } from "../skills.markdown.js";
import type { SkillDocument } from "../skills.types.js";

export interface SkillBundleContentFile {
  path: string;
  content: Buffer;
  size: number;
}

export interface SkillReferenceCounts {
  projectCount: number;
  agentCount: number;
}

export interface SkillUsageLookup {
  countManagedSkillReferences(skillId: string): Promise<SkillReferenceCounts>;
}

export interface BuildPersistedSkillDocumentInput {
  skillId: ObjectId;
  actorId: string;
  source: "custom" | "imported";
  origin: "manual" | "github" | "url";
  parsedSkill: ParsedSkillMarkdown;
  bundleFiles: SkillBundleContentFile[];
  importProvenance: SkillDocument["importProvenance"];
}
