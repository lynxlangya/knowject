import type { ObjectId } from "mongodb";
import type {
  SkillCategory,
  SkillDefinitionFields,
  SkillStatus,
} from "../skills.definition.js";

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

export interface NormalizedSkillMutationInput {
  name: string;
  description: string;
  category: SkillCategory;
  owner: string;
  definition: SkillDefinitionFields;
  status: SkillStatus;
  skillMarkdown: string;
}

export interface CurrentSkillUpdateState {
  name: string;
  description: string;
  category: SkillCategory;
  hasStoredCategory: boolean;
  owner: string;
  hasStoredOwner: boolean;
  definition: SkillDefinitionFields;
  hasStoredDefinition: boolean;
  status: SkillStatus;
  skillMarkdown: string;
}

export interface NormalizedSkillUpdateInput {
  normalizedSkill: NormalizedSkillMutationInput;
  persistCategory: boolean;
  persistOwner: boolean;
  persistDefinition: boolean;
}

export interface BuildPersistedSkillDocumentInput {
  skillId: ObjectId;
  actorId: string;
  normalizedSkill: NormalizedSkillMutationInput;
  bundleFiles: SkillBundleContentFile[];
}
