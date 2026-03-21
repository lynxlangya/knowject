import { AppError } from "@lib/app-error.js";
import { getFallbackMessage } from "@lib/locale.messages.js";
import { readMutationInput } from "@lib/mutation-input.js";
import {
  createValidationAppError,
  readOptionalStringField,
} from "@lib/validation.js";
import type { KnowledgeRepository } from "@modules/knowledge/knowledge.repository.js";
import type { SkillBindingValidator } from "@modules/skills/skills.binding.js";
import type { AgentsRepository } from "./agents.repository.js";
import { toAgentResponse } from "./agents.shared.js";
import type {
  AgentDetailEnvelope,
  AgentDocument,
  AgentMutationResponse,
  AgentsCommandContext,
  AgentsListResponse,
  CreateAgentInput,
  UpdateAgentInput,
} from "./agents.types.js";
import { DEFAULT_AGENT_MODEL } from "./agents.types.js";

export interface AgentsService {
  listAgents(context: AgentsCommandContext): Promise<AgentsListResponse>;
  getAgentDetail(
    context: AgentsCommandContext,
    agentId: string,
  ): Promise<AgentDetailEnvelope>;
  createAgent(
    context: AgentsCommandContext,
    input: CreateAgentInput,
  ): Promise<AgentMutationResponse>;
  updateAgent(
    context: AgentsCommandContext,
    agentId: string,
    input: UpdateAgentInput,
  ): Promise<AgentMutationResponse>;
  deleteAgent(context: AgentsCommandContext, agentId: string): Promise<void>;
}

const createAgentNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: "AGENT_NOT_FOUND",
    message: getFallbackMessage("agents.notFound"),
    messageKey: "agents.notFound",
  });
};

const readOptionalStringArrayField = (
  value: unknown,
  field: "boundSkillIds" | "boundKnowledgeIds",
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw createValidationAppError(
      getFallbackMessage("validation.stringArray"),
      {
        [field]: getFallbackMessage("validation.stringArray"),
      },
      "validation.stringArray",
    );
  }

  const normalizedValues = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedValues.length !== value.length) {
    throw createValidationAppError(
      getFallbackMessage("validation.stringArray"),
      {
        [field]: getFallbackMessage("validation.stringArray"),
      },
      "validation.stringArray",
    );
  }

  return Array.from(new Set(normalizedValues));
};

const readOptionalAgentStatus = (
  value: unknown,
): AgentDocument["status"] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === "active" || value === "disabled") {
    return value;
  }

  throw createValidationAppError(
    getFallbackMessage("validation.agent.status.invalid"),
    {
      status: getFallbackMessage("validation.agent.status.invalid"),
    },
    "validation.agent.status.invalid",
  );
};

const validateCreateAgentInput = (
  input: CreateAgentInput,
  actorId: string,
): Omit<AgentDocument, "_id"> => {
  const normalizedInput = readMutationInput(input);
  const name = readOptionalStringField(normalizedInput.name, "name");
  const description = readOptionalStringField(
    normalizedInput.description,
    "description",
  );
  const systemPrompt = readOptionalStringField(
    normalizedInput.systemPrompt,
    "systemPrompt",
  );
  const boundSkillIds =
    readOptionalStringArrayField(
      normalizedInput.boundSkillIds,
      "boundSkillIds",
    ) ?? [];
  const boundKnowledgeIds =
    readOptionalStringArrayField(
      normalizedInput.boundKnowledgeIds,
      "boundKnowledgeIds",
    ) ?? [];
  const status = readOptionalAgentStatus(normalizedInput.status) ?? "active";

  if (!name) {
    throw createValidationAppError(
      getFallbackMessage("validation.required.agentName"),
      {
        name: getFallbackMessage("validation.required.agentName"),
      },
      "validation.required.agentName",
    );
  }

  if (!systemPrompt) {
    throw createValidationAppError(
      getFallbackMessage("validation.required.systemPrompt"),
      {
        systemPrompt: getFallbackMessage("validation.required.systemPrompt"),
      },
      "validation.required.systemPrompt",
    );
  }

  const now = new Date();

  return {
    name,
    description: description ?? "",
    systemPrompt,
    boundSkillIds,
    boundKnowledgeIds,
    model: DEFAULT_AGENT_MODEL,
    status,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
};

const validateUpdateAgentInput = (
  input: UpdateAgentInput,
): Partial<
  Pick<
    AgentDocument,
    | "name"
    | "description"
    | "systemPrompt"
    | "boundSkillIds"
    | "boundKnowledgeIds"
    | "status"
  >
> => {
  const normalizedInput = readMutationInput(input);
  const name = readOptionalStringField(normalizedInput.name, "name");
  const description = readOptionalStringField(
    normalizedInput.description,
    "description",
  );
  const systemPrompt = readOptionalStringField(
    normalizedInput.systemPrompt,
    "systemPrompt",
  );
  const boundSkillIds = readOptionalStringArrayField(
    normalizedInput.boundSkillIds,
    "boundSkillIds",
  );
  const boundKnowledgeIds = readOptionalStringArrayField(
    normalizedInput.boundKnowledgeIds,
    "boundKnowledgeIds",
  );
  const status = readOptionalAgentStatus(normalizedInput.status);

  if (
    name === undefined &&
    description === undefined &&
    systemPrompt === undefined &&
    boundSkillIds === undefined &&
    boundKnowledgeIds === undefined &&
    status === undefined
  ) {
    throw createValidationAppError(
      getFallbackMessage("validation.atLeastOneField"),
      {
        name: getFallbackMessage("validation.atLeastOneField"),
        description: getFallbackMessage("validation.atLeastOneField"),
        systemPrompt: getFallbackMessage("validation.atLeastOneField"),
        boundSkillIds: getFallbackMessage("validation.atLeastOneField"),
        boundKnowledgeIds: getFallbackMessage("validation.atLeastOneField"),
        status: getFallbackMessage("validation.atLeastOneField"),
      },
      "validation.atLeastOneField",
    );
  }

  if (normalizedInput.name !== undefined && !name) {
    throw createValidationAppError(
      getFallbackMessage("validation.required.agentName"),
      {
        name: getFallbackMessage("validation.required.agentName"),
      },
      "validation.required.agentName",
    );
  }

  if (normalizedInput.systemPrompt !== undefined && !systemPrompt) {
    throw createValidationAppError(
      getFallbackMessage("validation.required.systemPrompt"),
      {
        systemPrompt: getFallbackMessage("validation.required.systemPrompt"),
      },
      "validation.required.systemPrompt",
    );
  }

  return {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description: description ?? "" } : {}),
    ...(systemPrompt !== undefined ? { systemPrompt } : {}),
    ...(boundSkillIds !== undefined ? { boundSkillIds } : {}),
    ...(boundKnowledgeIds !== undefined ? { boundKnowledgeIds } : {}),
    ...(status !== undefined ? { status } : {}),
  };
};

const applyAgentPatch = (
  currentAgent: AgentDocument & { _id: NonNullable<AgentDocument["_id"]> },
  patch: Partial<
    Pick<
      AgentDocument,
      | "name"
      | "description"
      | "systemPrompt"
      | "boundSkillIds"
      | "boundKnowledgeIds"
      | "status"
    >
  >,
): Partial<
  Pick<
    AgentDocument,
    | "name"
    | "description"
    | "systemPrompt"
    | "boundSkillIds"
    | "boundKnowledgeIds"
    | "status"
    | "updatedAt"
  >
> => {
  return {
    name: patch.name ?? currentAgent.name,
    description: patch.description ?? currentAgent.description,
    systemPrompt: patch.systemPrompt ?? currentAgent.systemPrompt,
    boundSkillIds: patch.boundSkillIds ?? currentAgent.boundSkillIds,
    boundKnowledgeIds:
      patch.boundKnowledgeIds ?? currentAgent.boundKnowledgeIds,
    status: patch.status ?? currentAgent.status,
    updatedAt: new Date(),
  };
};

const validateBoundKnowledgeIds = async (
  knowledgeRepository: KnowledgeRepository,
  knowledgeIds: string[],
): Promise<void> => {
  const checks = await Promise.all(
    knowledgeIds.map(async (knowledgeId) => {
      const knowledge =
        await knowledgeRepository.findKnowledgeById(knowledgeId);
      return knowledge ? null : knowledgeId;
    }),
  );

  const invalidKnowledgeIds = checks.filter(
    (knowledgeId): knowledgeId is string => !!knowledgeId,
  );

  if (invalidKnowledgeIds.length > 0) {
    throw createValidationAppError(
      getFallbackMessage("validation.knowledgeBindings.unregistered"),
      {
        boundKnowledgeIds: `以下知识库不存在：${invalidKnowledgeIds.join(", ")}`,
      },
      "validation.knowledgeBindings.unregistered",
    );
  }
};

export const createAgentsService = ({
  repository,
  knowledgeRepository,
  skillBindingValidator,
}: {
  repository: AgentsRepository;
  knowledgeRepository: KnowledgeRepository;
  skillBindingValidator: SkillBindingValidator;
}): AgentsService => {
  return {
    listAgents: async () => {
      const agents = await repository.listAgents();

      return {
        total: agents.length,
        items: agents.map(toAgentResponse),
      };
    },

    getAgentDetail: async (_context, agentId) => {
      const agent = await repository.findAgentById(agentId);
      if (!agent) {
        throw createAgentNotFoundError();
      }

      return {
        agent: toAgentResponse(agent),
      };
    },

    createAgent: async ({ actor }, input) => {
      const document = validateCreateAgentInput(input, actor.id);

      await skillBindingValidator.assertBindableSkillIds(
        document.boundSkillIds,
        {
          fieldName: "boundSkillIds",
        },
      );
      await validateBoundKnowledgeIds(
        knowledgeRepository,
        document.boundKnowledgeIds,
      );

      const agent = await repository.createAgent(document);

      return {
        agent: toAgentResponse(agent),
      };
    },

    updateAgent: async (_context, agentId, input) => {
      const currentAgent = await repository.findAgentById(agentId);
      if (!currentAgent) {
        throw createAgentNotFoundError();
      }

      const patch = validateUpdateAgentInput(input);

      if (patch.boundSkillIds !== undefined) {
        await skillBindingValidator.assertBindableSkillIds(
          patch.boundSkillIds,
          {
            fieldName: "boundSkillIds",
          },
        );
      }

      if (patch.boundKnowledgeIds !== undefined) {
        await validateBoundKnowledgeIds(
          knowledgeRepository,
          patch.boundKnowledgeIds,
        );
      }

      const nextAgent = applyAgentPatch(currentAgent, patch);

      const updatedAgent = await repository.updateAgent(agentId, nextAgent);
      if (!updatedAgent) {
        throw createAgentNotFoundError();
      }

      return {
        agent: toAgentResponse(updatedAgent),
      };
    },

    deleteAgent: async (_context, agentId) => {
      const currentAgent = await repository.findAgentById(agentId);
      if (!currentAgent) {
        throw createAgentNotFoundError();
      }

      const deleted = await repository.deleteAgent(agentId);
      if (!deleted) {
        throw createAgentNotFoundError();
      }
    },
  };
};
