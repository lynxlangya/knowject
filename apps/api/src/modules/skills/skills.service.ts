import type { AppEnv } from "@config/env.js";
import { readMutationInput } from "@lib/mutation-input.js";
import { resolveImportedSkillBundle } from "./skills.import.js";
import { parseSkillMarkdown } from "./skills.markdown.js";
import {
  findRegisteredSkillById,
  listRegisteredSkills,
} from "./skills.registry.js";
import type { SkillsRepository } from "./skills.repository.js";
import {
  buildSkillMarkdownExcerpt,
  createReadonlySystemSkillError,
  createSkillNotFoundError,
  matchesSkillFilters,
  normalizeSkillsListFilters,
  toSkillDetailResponse,
  toSkillSummaryResponse,
} from "./skills.shared.js";
import type {
  CreateSkillInput,
  ImportSkillInput,
  ListSkillsInput,
  SkillDetailEnvelope,
  SkillImportPreviewResponse,
  SkillMutationResponse,
  SkillsCommandContext,
  SkillsListResponse,
  UpdateSkillInput,
} from "./skills.types.js";
import {
  buildManualBundleFiles,
  mapBundleFiles,
  toBundleContentFiles,
} from "./adapters/skills-bundle-storage.js";
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
  importSkill(
    context: SkillsCommandContext,
    input: ImportSkillInput,
  ): Promise<SkillMutationResponse | SkillImportPreviewResponse>;
  updateSkill(
    context: SkillsCommandContext,
    skillId: string,
    input: UpdateSkillInput,
  ): Promise<SkillMutationResponse>;
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
        !filters.source || filters.source === "system"
          ? listRegisteredSkills()
          : [];
      const storedSkills =
        filters.source === "system"
          ? []
          : await repository.listSkills({
              ...(filters.source ? { source: filters.source } : {}),
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
      const parsedSkill = validateCreateSkillInput(input);
      const bundleFiles = buildManualBundleFiles(parsedSkill.skillMarkdown);
      const persistedSkill = await createManagedSkill({
        env,
        repository,
        actorId: actor.id,
        source: "custom",
        origin: "manual",
        parsedSkill,
        bundleFiles,
        importProvenance: null,
      });

      return {
        skill: toSkillDetailResponse(persistedSkill),
      };
    },

    importSkill: async ({ actor }, input) => {
      const normalizedInput = readMutationInput(input);
      const { bundle, dryRun } =
        await resolveImportedSkillBundle(normalizedInput);
      const parsedSkill = parseSkillMarkdown(bundle.skillMarkdown);
      const bundleFiles = toBundleContentFiles(bundle.bundleFiles);

      if (dryRun) {
        return {
          preview: {
            source: "imported",
            origin: bundle.origin,
            type: "markdown_bundle",
            name: parsedSkill.name,
            description: parsedSkill.description,
            runtimeStatus: "contract_only",
            lifecycleStatus: "draft",
            bindable: false,
            markdownExcerpt: buildSkillMarkdownExcerpt(
              parsedSkill.skillMarkdown,
              parsedSkill.description,
            ),
            skillMarkdown: parsedSkill.skillMarkdown,
            bundleFiles: mapBundleFiles(bundleFiles),
            bundleFileCount: bundleFiles.length,
            importProvenance: bundle.importProvenance!,
          },
        };
      }

      const persistedSkill = await createManagedSkill({
        env,
        repository,
        actorId: actor.id,
        source: "imported",
        origin: bundle.origin,
        parsedSkill,
        bundleFiles,
        importProvenance: bundle.importProvenance,
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

      const { lifecycleStatus, parsedSkill } = validateUpdateSkillInput(
        input,
        currentSkill.skillMarkdown,
      );
      const updatedSkill = await updateManagedSkill({
        env,
        repository,
        usageLookup,
        skillId: normalizedSkillId,
        currentSkill,
        parsedSkill,
        lifecycleStatus,
      });

      return {
        skill: toSkillDetailResponse(updatedSkill),
      };
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
