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
  SkillCreationJobCreateInput,
  SkillCreationJobEnvelope,
  SkillCreationJobRefineInput,
  SkillCreationJobsListResponse,
  SkillCreationJobSaveInput,
  SkillCreationDraftGenerateInput,
  SkillCreationDraftRefineInput,
  SkillCreationDraftResponse,
  SkillCreationDraftSaveInput,
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
import {
  runSkillAuthoringTurn,
  type SkillAuthoringLlmService,
} from "./services/skills-authoring.service.js";
import {
  generateSkillCreationDraft,
  refineSkillCreationDraft,
  resolveSkillCreationDraftInference,
  resolveSkillCreationDraftCategory,
  type SkillCreationDraftLlmService,
} from "./services/skills-creation-draft.service.js";
import {
  createSkillCreationJobDocument,
  queueSkillCreationJobGenerate,
  queueSkillCreationJobRefine,
  toSkillCreationJobResponse,
} from "./services/skills-creation-jobs.service.js";
import { EMPTY_SKILL_REFERENCE_COUNTS } from "./services/skills-reference.service.js";
import { updateManagedSkill } from "./services/skills-update.service.js";
import type { SkillUsageLookup } from "./types/skills.service.types.js";
import { buildSkillListMeta, sortSkillItems } from "./utils/skills.meta.js";
import { validateSkillAuthoringTurnInput } from "./validators/skills-authoring.validator.js";
import {
  parseSkillCreationMarkdownDraft,
} from "./skills.definition.js";
import {
  validateSkillCreationDraftGenerateInput,
  validateSkillCreationDraftRefineInput,
  validateSkillCreationDraftSaveInput,
} from "./validators/skills-creation.validator.js";
import {
  readRequiredSkillId,
  validateCreateSkillInput,
  validateUpdateSkillInput,
} from "./validators/skills.validator.js";
import { createSkillCreationJobNotFoundError } from "./skills.shared.js";

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
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<SkillAuthoringTurnResponse>;
  createCreationJob(
    context: SkillsCommandContext,
    input: SkillCreationJobCreateInput,
  ): Promise<SkillCreationJobEnvelope>;
  listCreationJobs(
    context: SkillsCommandContext,
  ): Promise<SkillCreationJobsListResponse>;
  getCreationJob(
    context: SkillsCommandContext,
    jobId: string,
  ): Promise<SkillCreationJobEnvelope>;
  refineCreationJob(
    context: SkillsCommandContext,
    jobId: string,
    input: SkillCreationJobRefineInput,
  ): Promise<SkillCreationJobEnvelope>;
  saveCreationJob(
    context: SkillsCommandContext,
    jobId: string,
    input: SkillCreationJobSaveInput,
  ): Promise<SkillMutationResponse & SkillCreationJobEnvelope>;
  generateCreationDraft(
    context: SkillsCommandContext,
    input: SkillCreationDraftGenerateInput,
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<SkillCreationDraftResponse>;
  refineCreationDraft(
    context: SkillsCommandContext,
    input: SkillCreationDraftRefineInput,
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<SkillCreationDraftResponse>;
  saveCreationDraft(
    context: SkillsCommandContext,
    input: SkillCreationDraftSaveInput,
  ): Promise<SkillMutationResponse>;
  deleteSkill(context: SkillsCommandContext, skillId: string): Promise<void>;
}

export const createSkillsService = ({
  env,
  repository,
  authoringLlm,
  creationDraftLlm,
  usageLookup = {
    countManagedSkillReferences: async () => EMPTY_SKILL_REFERENCE_COUNTS,
  },
}: {
  env: AppEnv;
  repository: SkillsRepository;
  authoringLlm?: SkillAuthoringLlmService;
  creationDraftLlm?: SkillCreationDraftLlmService;
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

    runAuthoringTurn: async ({ actor }, input, options) => {
      if (!authoringLlm) {
        throw new Error("Skill authoring LLM service is not configured");
      }

      const normalizedInput = validateSkillAuthoringTurnInput(input);

      return runSkillAuthoringTurn({
        actor,
        input: normalizedInput,
        llm: authoringLlm,
        signal: options?.signal,
      });
    },

    createCreationJob: async ({ actor }, input) => {
      const normalizedInput = validateSkillCreationDraftGenerateInput(input);
      const jobDocument = createSkillCreationJobDocument({
        actor,
        input: normalizedInput,
      });
      const persistedJob = await repository.createSkillCreationJob(jobDocument);
      queueSkillCreationJobGenerate({
        repository,
        llm: creationDraftLlm,
        job: persistedJob,
      });

      return {
        job: toSkillCreationJobResponse(persistedJob),
      };
    },

    listCreationJobs: async ({ actor }) => {
      const jobs = await repository.listSkillCreationJobsByOwner(actor.id, {
        limit: 20,
      });

      return {
        items: jobs.map((job) => toSkillCreationJobResponse(job)),
      };
    },

    getCreationJob: async ({ actor }, jobId) => {
      const job = await repository.findSkillCreationJobByIdForOwner(
        jobId,
        actor.id,
      );

      if (!job) {
        throw createSkillCreationJobNotFoundError();
      }

      return {
        job: toSkillCreationJobResponse(job),
      };
    },

    refineCreationJob: async ({ actor }, jobId, input) => {
      const job = await repository.findSkillCreationJobByIdForOwner(jobId, actor.id);

      if (!job) {
        throw createSkillCreationJobNotFoundError();
      }

      const normalizedInput = validateSkillCreationDraftRefineInput({
        name: job.name,
        description: job.description,
        ...input,
      });

      const queuedAt = new Date();
      const updatedJob = await repository.updateSkillCreationJob(jobId, actor.id, {
        markdownDraft: normalizedInput.markdownDraft,
        currentInference: normalizedInput.currentInference,
        status: "queued",
        errorMessage: null,
        updatedAt: queuedAt,
      });

      const nextJob = updatedJob ?? job;
      queueSkillCreationJobRefine({
        repository,
        llm: creationDraftLlm,
        job: {
          ...nextJob,
          description: job.description,
          name: job.name,
          taskIntent: job.taskIntent,
          templateHint: job.templateHint,
          ownerId: job.ownerId,
          ownerUsername: job.ownerUsername,
        },
        markdownDraft: normalizedInput.markdownDraft,
        optimizationInstruction: normalizedInput.optimizationInstruction,
        currentInference: normalizedInput.currentInference,
      });

      return {
        job: toSkillCreationJobResponse({
          ...nextJob,
          status: "queued",
          errorMessage: null,
        }),
      };
    },

    saveCreationJob: async ({ actor }, jobId, input) => {
      const normalizedInput = validateSkillCreationDraftSaveInput(input);
      const job = await repository.findSkillCreationJobByIdForOwner(jobId, actor.id);

      if (!job) {
        throw createSkillCreationJobNotFoundError();
      }

      const parsedDraft = parseSkillCreationMarkdownDraft(
        normalizedInput.markdownDraft,
      );
      const resolvedInference = resolveSkillCreationDraftInference({
        description: parsedDraft.description,
        markdownDraft: normalizedInput.markdownDraft,
        currentInference: normalizedInput.currentInference,
      });
      const category =
        resolvedInference.category ??
        resolveSkillCreationDraftCategory({
          description: parsedDraft.description,
          markdownDraft: normalizedInput.markdownDraft,
          currentInference: normalizedInput.currentInference,
        });
      const normalizedSkill = validateCreateSkillInput({
        name: parsedDraft.name,
        description: parsedDraft.description,
        category,
        owner: actor.username,
        definition: {
          ...parsedDraft.definition,
          projectBindingNotes: Array.from(
            new Set([
              ...parsedDraft.definition.projectBindingNotes,
              ...resolvedInference.contextTargets.map(
                (target) => `当前推断参考范围：${target}`,
              ),
            ]),
          ),
        },
      });
      const bundleFiles = buildManualBundleFiles(normalizedSkill.skillMarkdown);
      const persistedSkill = await createManagedSkill({
        env,
        repository,
        actorId: actor.id,
        normalizedSkill,
        bundleFiles,
      });
      const updatedJob = await repository.updateSkillCreationJob(jobId, actor.id, {
        status: "saved",
        markdownDraft: normalizedInput.markdownDraft,
        currentInference: resolvedInference,
        currentSummary: job.currentSummary,
        confirmationQuestions: job.confirmationQuestions,
        savedSkillId: persistedSkill._id.toHexString(),
        updatedAt: new Date(),
        completedAt: new Date(),
        errorMessage: null,
      });

      return {
        skill: toSkillDetailResponse(persistedSkill),
        job: toSkillCreationJobResponse(
          updatedJob ?? {
            ...job,
            status: "saved",
            markdownDraft: normalizedInput.markdownDraft,
            currentInference: resolvedInference,
            savedSkillId: persistedSkill._id.toHexString(),
            updatedAt: new Date(),
            completedAt: new Date(),
            errorMessage: null,
          },
        ),
      };
    },

    generateCreationDraft: async ({ actor }, input, options) => {
      const normalizedInput = validateSkillCreationDraftGenerateInput(input);

      return generateSkillCreationDraft({
        actor,
        input: normalizedInput,
        llm: creationDraftLlm,
        signal: options?.signal,
      });
    },

    refineCreationDraft: async ({ actor }, input, options) => {
      const normalizedInput = validateSkillCreationDraftRefineInput(input);

      return refineSkillCreationDraft({
        actor,
        input: normalizedInput,
        llm: creationDraftLlm,
        signal: options?.signal,
      });
    },

    saveCreationDraft: async ({ actor }, input) => {
      const normalizedInput = validateSkillCreationDraftSaveInput(input);
      const parsedDraft = parseSkillCreationMarkdownDraft(
        normalizedInput.markdownDraft,
      );
      const resolvedInference = resolveSkillCreationDraftInference({
        description: parsedDraft.description,
        markdownDraft: normalizedInput.markdownDraft,
        currentInference: normalizedInput.currentInference,
      });
      const category =
        resolvedInference.category ??
        resolveSkillCreationDraftCategory({
          description: parsedDraft.description,
          markdownDraft: normalizedInput.markdownDraft,
          currentInference: normalizedInput.currentInference,
        });
      const normalizedSkill = validateCreateSkillInput({
        name: parsedDraft.name,
        description: parsedDraft.description,
        category,
        owner: actor.username,
        definition: {
          ...parsedDraft.definition,
          projectBindingNotes: Array.from(
            new Set([
              ...parsedDraft.definition.projectBindingNotes,
              ...resolvedInference.contextTargets.map(
                (target) => `当前推断参考范围：${target}`,
              ),
            ]),
          ),
        },
      });
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
