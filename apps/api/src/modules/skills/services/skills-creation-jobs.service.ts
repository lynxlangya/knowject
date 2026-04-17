import { ObjectId, type WithId } from "mongodb";
import { normalizeIndexerErrorMessage } from "@lib/http.js";
import type { SkillsRepository } from "../skills.repository.js";
import type {
  SkillCreationJobDocument,
  SkillCreationJobResponse,
} from "../skills.creation-jobs.js";
import type { SkillCreationDraftLlmService } from "./skills-creation-draft.service.js";
import {
  generateSkillCreationDraft,
  refineSkillCreationDraft,
} from "./skills-creation-draft.service.js";

const SKILL_CREATION_JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const queueDetachedTask = (
  task: () => Promise<void>,
  buildCrashMessage: () => string,
): void => {
  setImmediate(() => {
    void task().catch((error) => {
      console.error(`${buildCrashMessage()} ${normalizeIndexerErrorMessage(error)}`);
    });
  });
};

const buildDefaultExpiresAt = (): Date => {
  return new Date(Date.now() + SKILL_CREATION_JOB_TTL_MS);
};

export const toSkillCreationJobResponse = (
  job: WithId<SkillCreationJobDocument>,
): SkillCreationJobResponse => {
  return {
    id: job._id.toHexString(),
    status: job.status,
    name: job.name,
    description: job.description,
    taskIntent: job.taskIntent,
    templateHint: job.templateHint,
    markdownDraft: job.markdownDraft,
    currentSummary: job.currentSummary,
    currentInference: job.currentInference,
    confirmationQuestions: job.confirmationQuestions,
    errorMessage: job.errorMessage,
    savedSkillId: job.savedSkillId,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    failedAt: job.failedAt?.toISOString() ?? null,
  };
};

export const createSkillCreationJobDocument = ({
  actor,
  input,
}: {
  actor: { id: string; username: string };
  input: {
    name: string;
    description: string;
    taskIntent: string;
    templateHint: SkillCreationJobDocument["templateHint"];
  };
}): SkillCreationJobDocument & { _id: ObjectId } => {
  const now = new Date();

  return {
    _id: new ObjectId(),
    ownerId: actor.id,
    ownerUsername: actor.username,
    name: input.name,
    description: input.description,
    taskIntent: input.taskIntent,
    templateHint: input.templateHint,
    status: "queued",
    markdownDraft: null,
    currentSummary: null,
    currentInference: null,
    confirmationQuestions: [],
    errorMessage: null,
    savedSkillId: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    expiresAt: buildDefaultExpiresAt(),
  };
};

export const queueSkillCreationJobGenerate = ({
  repository,
  llm,
  job,
}: {
  repository: SkillsRepository;
  llm?: SkillCreationDraftLlmService;
  job: WithId<SkillCreationJobDocument>;
}): void => {
  queueDetachedTask(
    async () => {
      const startedAt = new Date();
      await repository.updateSkillCreationJobById(job._id.toHexString(), {
        status: "generating",
        updatedAt: startedAt,
        startedAt,
        failedAt: null,
        errorMessage: null,
      });

      try {
        const result = await generateSkillCreationDraft({
          actor: {
            id: job.ownerId,
            username: job.ownerUsername,
          },
          input: {
            name: job.name,
            description: job.description,
            taskIntent: job.taskIntent,
            templateHint: job.templateHint,
          },
          llm,
        });
        const completedAt = new Date();
        await repository.updateSkillCreationJobById(job._id.toHexString(), {
          status: "ready",
          markdownDraft: result.markdownDraft,
          currentSummary: result.currentSummary,
          currentInference: result.currentInference,
          confirmationQuestions: result.confirmationQuestions,
          errorMessage: null,
          updatedAt: completedAt,
          completedAt,
          failedAt: null,
          expiresAt: buildDefaultExpiresAt(),
        });
      } catch (error) {
        const failedAt = new Date();
        await repository.updateSkillCreationJobById(job._id.toHexString(), {
          status: "failed",
          errorMessage: normalizeIndexerErrorMessage(
            error,
            "Skill 草稿生成失败",
          ),
          updatedAt: failedAt,
          failedAt,
          expiresAt: buildDefaultExpiresAt(),
        });
      }
    },
    () => `[skills] detached creation generate crashed for job ${job._id.toHexString()}:`,
  );
};

export const queueSkillCreationJobRefine = ({
  repository,
  llm,
  job,
  markdownDraft,
  optimizationInstruction,
  currentInference,
}: {
  repository: SkillsRepository;
  llm?: SkillCreationDraftLlmService;
  job: WithId<SkillCreationJobDocument>;
  markdownDraft: string;
  optimizationInstruction: string;
  currentInference: SkillCreationJobDocument["currentInference"];
}): void => {
  queueDetachedTask(
    async () => {
      const startedAt = new Date();
      await repository.updateSkillCreationJobById(job._id.toHexString(), {
        status: "generating",
        markdownDraft,
        currentInference: currentInference ?? null,
        updatedAt: startedAt,
        startedAt,
        errorMessage: null,
        failedAt: null,
      });

      try {
        const result = await refineSkillCreationDraft({
          actor: {
            id: job.ownerId,
            username: job.ownerUsername,
          },
          input: {
            name: job.name,
            description: job.description,
            markdownDraft,
            optimizationInstruction,
            currentInference: currentInference ?? null,
          },
          llm,
        });
        const completedAt = new Date();
        await repository.updateSkillCreationJobById(job._id.toHexString(), {
          status: "ready",
          markdownDraft: result.markdownDraft,
          currentSummary: result.currentSummary,
          currentInference: result.currentInference,
          confirmationQuestions: result.confirmationQuestions,
          errorMessage: null,
          updatedAt: completedAt,
          completedAt,
          failedAt: null,
          expiresAt: buildDefaultExpiresAt(),
        });
      } catch (error) {
        const failedAt = new Date();
        await repository.updateSkillCreationJobById(job._id.toHexString(), {
          status: "failed",
          markdownDraft,
          currentInference: currentInference ?? null,
          errorMessage: normalizeIndexerErrorMessage(
            error,
            "Skill 草稿优化失败",
          ),
          updatedAt: failedAt,
          failedAt,
          expiresAt: buildDefaultExpiresAt(),
        });
      }
    },
    () => `[skills] detached creation refine crashed for job ${job._id.toHexString()}:`,
  );
};

