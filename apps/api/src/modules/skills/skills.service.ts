import type { AppEnv } from "@config/env.js";
import {
  findRegisteredSkillById,
  listRegisteredSkills,
} from "./skills.registry.js";
import type { SkillsRepository } from "./skills.repository.js";
import {
  createReadonlySystemSkillError,
  createSkillNotFoundError,
  matchesSkillFilters,
  normalizeSkillsListFilters,
  normalizeStoredSkillForRead,
  toSkillDetailResponse,
  toSkillSummaryResponse,
} from "./skills.shared.js";
import type {
  CreateSkillInput,
  ListSkillsInput,
  SkillAuthoringTurnInput,
  SkillAuthoringTurnResponse,
  SkillDetailEnvelope,
  SkillMutationResponse,
  SkillsCommandContext,
  SkillsListResponse,
  UpdateSkillInput,
} from "./skills.types.js";
import { buildManualBundleFiles } from "./adapters/skills-bundle-storage.js";
import { createManagedSkill } from "./services/skills-create.service.js";
import { deleteManagedSkill } from "./services/skills-delete.service.js";
import { EMPTY_SKILL_REFERENCE_COUNTS } from "./services/skills-reference.service.js";
import { updateManagedSkill } from "./services/skills-update.service.js";
import type { SkillUsageLookup } from "./types/skills.service.types.js";
import { buildSkillListMeta, sortSkillItems } from "./utils/skills.meta.js";
import {
  readRequiredSkillId,
  validateCreateSkillInput,
  validateUpdateSkillInput,
} from "./validators/skills.validator.js";

export interface SkillsService {
  listSkills(
    context: SkillsCommandContext,
    input?: ListSkillsInput,
  ): Promise<SkillsListResponse>;
  getSkillDetail(
    context: SkillsCommandContext,
    skillId: string,
  ): Promise<SkillDetailEnvelope>;
  createSkill(
    context: SkillsCommandContext,
    input: CreateSkillInput,
  ): Promise<SkillMutationResponse>;
  updateSkill(
    context: SkillsCommandContext,
    skillId: string,
    input: UpdateSkillInput,
  ): Promise<SkillMutationResponse>;
  runAuthoringTurn(
    context: SkillsCommandContext,
    input: SkillAuthoringTurnInput,
  ): Promise<SkillAuthoringTurnResponse>;
  deleteSkill(context: SkillsCommandContext, skillId: string): Promise<void>;
}

export const createSkillsService = ({
  env,
  repository,
  usageLookup = {
    countManagedSkillReferences: async () => EMPTY_SKILL_REFERENCE_COUNTS,
  },
}: {
  env: AppEnv;
  repository: SkillsRepository;
  usageLookup?: SkillUsageLookup;
}): SkillsService => {
  return {
    listSkills: async (_context, input = {}) => {
      const filters = normalizeSkillsListFilters(input);
      const builtinSkills =
        !filters.source || filters.source === "preset"
          ? listRegisteredSkills()
          : [];
      const storedSkills =
        filters.source === "preset"
          ? []
          : await repository.listSkills({
              ...(filters.lifecycleStatus
                ? { lifecycleStatus: filters.lifecycleStatus }
                : {}),
            });
      const items = sortSkillItems(
        [
          ...builtinSkills,
          ...storedSkills.map((skill) => toSkillSummaryResponse(skill)),
        ].filter((skill) => matchesSkillFilters(skill, filters)),
      );

      return {
        total: items.length,
        items,
        meta: buildSkillListMeta(),
      };
    },

    getSkillDetail: async (_context, skillId) => {
      const normalizedSkillId = readRequiredSkillId(skillId);
      const builtinSkill = findRegisteredSkillById(normalizedSkillId);

      if (builtinSkill) {
        return {
          skill: builtinSkill,
        };
      }

      const skill = await repository.findSkillById(normalizedSkillId);

      if (!skill) {
        throw createSkillNotFoundError();
      }

      return {
        skill: toSkillDetailResponse(skill),
      };
    },

    createSkill: async ({ actor }, input) => {
      const normalizedSkill = validateCreateSkillInput(input);
      const bundleFiles = buildManualBundleFiles(normalizedSkill.skillMarkdown);
      const persistedSkill = await createManagedSkill({
        env,
        repository,
        actorId: actor.id,
        normalizedSkill,
        bundleFiles,
      });

      return {
        skill: toSkillDetailResponse(persistedSkill),
      };
    },

    updateSkill: async (_context, skillId, input) => {
      const normalizedSkillId = readRequiredSkillId(skillId);
      const builtinSkill = findRegisteredSkillById(normalizedSkillId);

      if (builtinSkill) {
        throw createReadonlySystemSkillError();
      }

      const currentSkill = await repository.findSkillById(normalizedSkillId);

      if (!currentSkill) {
        throw createSkillNotFoundError();
      }

      const currentReadModel = normalizeStoredSkillForRead(currentSkill);
      const normalizedUpdate = validateUpdateSkillInput(input, {
        name: currentSkill.name,
        description: currentSkill.description,
        category: currentReadModel.category ?? "documentation_architecture",
        hasStoredCategory: currentReadModel.category !== undefined,
        owner: currentReadModel.owner,
        hasStoredOwner: Boolean(currentSkill.owner?.trim()),
        definition: currentReadModel.definition,
        hasStoredDefinition: currentSkill.definition !== undefined,
        status: currentReadModel.status,
        skillMarkdown: currentSkill.skillMarkdown,
      });
      const updatedSkill = await updateManagedSkill({
        env,
        repository,
        usageLookup,
        skillId: normalizedSkillId,
        currentSkill,
        normalizedUpdate,
      });

      return {
        skill: toSkillDetailResponse(updatedSkill),
      };
    },

    runAuthoringTurn: async (_context, _input) => {
      throw new Error("runAuthoringTurn is not implemented yet");
    },

    deleteSkill: async (_context, skillId) => {
      const normalizedSkillId = readRequiredSkillId(skillId);
      const builtinSkill = findRegisteredSkillById(normalizedSkillId);

      if (builtinSkill) {
        throw createReadonlySystemSkillError();
      }

      const currentSkill = await repository.findSkillById(normalizedSkillId);

      if (!currentSkill) {
        throw createSkillNotFoundError();
      }

      await deleteManagedSkill({
        env,
        repository,
        usageLookup,
        skillId: normalizedSkillId,
        currentSkill,
      });
    },
  };
};
