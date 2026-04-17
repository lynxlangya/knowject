import type { AppEnv } from "@config/env.js";
import { getEffectiveLlmConfig } from "@config/ai-config.js";
import { AppError } from "@lib/app-error.js";
import { createProjectConversationProviderAdapter } from "@modules/projects/project-conversation-provider.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import type {
  SkillAuthoringInference,
} from "../skills.authoring.js";
import type { SkillCreationDraftResponse } from "../skills.creation.js";
import { SKILL_CATEGORIES } from "../skills.definition.js";
import { CONTROLLED_SCOPE_TARGETS } from "../validators/skills-authoring.validator.js";
import type {
  NormalizedSkillCreationDraftGenerateInput,
  NormalizedSkillCreationDraftRefineInput,
  SkillCreationDraftLlmService,
} from "./skills-creation-draft.service.js";

const SKILL_CREATION_DRAFT_LLM_TIMEOUT_MS = 30000;

const extractJsonPayload = (value: string): string => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith("{")) {
    return normalizedValue;
  }

  const fencedMatch = normalizedValue.match(/```(?:json)?\s*([\s\S]+?)\s*```/u);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = normalizedValue.indexOf("{");
  const objectEnd = normalizedValue.lastIndexOf("}");

  if (objectStart >= 0 && objectEnd > objectStart) {
    return normalizedValue.slice(objectStart, objectEnd + 1);
  }

  return normalizedValue;
};

const createInvalidCreationDraftModelResponseError = (
  cause?: unknown,
): AppError => {
  return new AppError({
    statusCode: 502,
    code: "SKILL_CREATION_DRAFT_LLM_INVALID_RESPONSE",
    message: "Skill creation draft model returned invalid response",
    cause,
  });
};

const normalizeInference = (value: unknown): SkillAuthoringInference | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const payload = value as Record<string, unknown>;
  const category =
    typeof payload.category === "string" && payload.category.trim()
      ? payload.category.trim()
      : null;
  const contextTargets = Array.isArray(payload.contextTargets)
    ? payload.contextTargets
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(
          (item) =>
            item.length > 0 && CONTROLLED_SCOPE_TARGETS.has(item),
        )
    : [];
  const rationale =
    typeof payload.rationale === "string" && payload.rationale.trim()
      ? payload.rationale.trim()
      : undefined;

  return {
    category:
      category && (SKILL_CATEGORIES as readonly string[]).includes(category)
        ? (category as SkillAuthoringInference["category"])
        : null,
    contextTargets,
    ...(rationale ? { rationale } : {}),
  };
};

const parseCreationDraftModelResponse = (
  rawContent: string,
): Partial<SkillCreationDraftResponse> => {
  let payload: unknown;

  try {
    payload = JSON.parse(extractJsonPayload(rawContent));
  } catch (error) {
    throw createInvalidCreationDraftModelResponseError(error);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createInvalidCreationDraftModelResponseError();
  }

  const normalizedPayload = payload as Record<string, unknown>;

  return {
    ...(typeof normalizedPayload.markdownDraft === "string" &&
    normalizedPayload.markdownDraft.trim()
      ? {
          markdownDraft: normalizedPayload.markdownDraft.trim(),
        }
      : {}),
    ...(typeof normalizedPayload.currentSummary === "string" &&
    normalizedPayload.currentSummary.trim()
      ? {
          currentSummary: normalizedPayload.currentSummary.trim(),
        }
      : {}),
    ...(normalizeInference(normalizedPayload.currentInference)
      ? {
          currentInference: normalizeInference(
            normalizedPayload.currentInference,
          ) as SkillAuthoringInference,
        }
      : {}),
    ...(Array.isArray(normalizedPayload.confirmationQuestions)
      ? {
          confirmationQuestions: normalizedPayload.confirmationQuestions.filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0,
          ),
        }
      : {}),
    ...(typeof normalizedPayload.needsFollowup === "boolean"
      ? {
          needsFollowup: normalizedPayload.needsFollowup,
        }
      : {}),
  };
};

const buildGeneratePrompt = ({
  actorName,
  request,
  fallback,
}: {
  actorName: string;
  request: NormalizedSkillCreationDraftGenerateInput;
  fallback: SkillCreationDraftResponse;
}): string => {
  return [
    "Knowject skill creation draft generation request:",
    `actorName: ${actorName}`,
    `name: ${request.name}`,
    `description: ${request.description}`,
    `taskIntent: ${request.taskIntent}`,
    `templateHint: ${request.templateHint ?? "(none)"}`,
    `fallbackSummary: ${fallback.currentSummary}`,
    `fallbackInference: ${JSON.stringify(fallback.currentInference)}`,
    "",
    "Return exactly one valid JSON object with this shape:",
    JSON.stringify({
      markdownDraft: "string",
      currentSummary: "string",
      currentInference: {
        category: "engineering_execution",
        contextTargets: ["apps/platform/src/pages/skills"],
        rationale: "string",
      },
      confirmationQuestions: ["string"],
      needsFollowup: false,
    }),
    "",
    "Rules:",
    "- Keep the markdown draft in Chinese.",
    "- Keep frontmatter keys exactly as name and description.",
    "- Keep section headings exactly as: 作用, 触发场景, 所需上下文, 工作流, 输出, 注意事项.",
    "- Optional extra sections can only be 产物 or 项目注记.",
    "- Do not add any prose before or after the JSON object.",
  ].join("\n");
};

const buildRefinePrompt = ({
  actorName,
  request,
  fallback,
}: {
  actorName: string;
  request: NormalizedSkillCreationDraftRefineInput;
  fallback: SkillCreationDraftResponse;
}): string => {
  return [
    "Knowject skill creation draft refinement request:",
    `actorName: ${actorName}`,
    `name: ${request.name}`,
    `description: ${request.description}`,
    `optimizationInstruction: ${request.optimizationInstruction || "(none)"}`,
    `currentInference: ${JSON.stringify(request.currentInference)}`,
    "",
    "Current markdown draft:",
    request.markdownDraft,
    "",
    `fallbackSummary: ${fallback.currentSummary}`,
    "",
    "Return exactly one valid JSON object with this shape:",
    JSON.stringify({
      markdownDraft: "string",
      currentSummary: "string",
      currentInference: {
        category: "engineering_execution",
        contextTargets: ["apps/platform/src/pages/skills"],
        rationale: "string",
      },
      confirmationQuestions: ["string"],
      needsFollowup: false,
    }),
    "",
    "Rules:",
    "- Keep the markdown draft in Chinese.",
    "- Keep frontmatter keys exactly as name and description.",
    "- Keep section headings exactly as: 作用, 触发场景, 所需上下文, 工作流, 输出, 注意事项.",
    "- Optional extra sections can only be 产物 or 项目注记.",
    "- Respect user edits instead of rewriting the whole draft unnecessarily.",
    "- Do not add any prose before or after the JSON object.",
  ].join("\n");
};

export const createSkillCreationDraftLlmService = ({
  env,
  settingsRepository,
}: {
  env: AppEnv;
  settingsRepository: SettingsRepository;
}): SkillCreationDraftLlmService => {
  const providerAdapter = createProjectConversationProviderAdapter();

  return {
    async generateDraft({ actor, request, fallback, signal }) {
      const llmConfig = await getEffectiveLlmConfig({
        env,
        repository: settingsRepository,
      });
      const creationLlmConfig = {
        ...llmConfig,
        requestTimeoutMs: Math.max(
          llmConfig.requestTimeoutMs,
          SKILL_CREATION_DRAFT_LLM_TIMEOUT_MS,
        ),
      };
      const rawContent = await providerAdapter.generate({
        llmConfig: creationLlmConfig,
        messages: [
          {
            role: "system",
            content:
              "You are the backend skill creation assistant for Knowject. Return valid JSON only.",
          },
          {
            role: "user",
            content: buildGeneratePrompt({
              actorName: actor.username,
              request,
              fallback,
            }),
          },
        ],
        signal,
      });

      return parseCreationDraftModelResponse(rawContent);
    },

    async refineDraft({ actor, request, fallback, signal }) {
      const llmConfig = await getEffectiveLlmConfig({
        env,
        repository: settingsRepository,
      });
      const creationLlmConfig = {
        ...llmConfig,
        requestTimeoutMs: Math.max(
          llmConfig.requestTimeoutMs,
          SKILL_CREATION_DRAFT_LLM_TIMEOUT_MS,
        ),
      };
      const rawContent = await providerAdapter.generate({
        llmConfig: creationLlmConfig,
        messages: [
          {
            role: "system",
            content:
              "You are the backend skill creation assistant for Knowject. Return valid JSON only.",
          },
          {
            role: "user",
            content: buildRefinePrompt({
              actorName: actor.username,
              request,
              fallback,
            }),
          },
        ],
        signal,
      });

      return parseCreationDraftModelResponse(rawContent);
    },
  };
};
