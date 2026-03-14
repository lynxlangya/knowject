import { AppError } from '@lib/app-error.js';
import {
  createRequiredFieldError,
  createValidationAppError,
  readOptionalStringField,
} from '@lib/validation.js';
import type { KnowledgeRepository } from '@modules/knowledge/knowledge.repository.js';
import type { SkillBindingValidator } from '@modules/skills/skills.binding.js';
import type { AgentsRepository } from './agents.repository.js';
import { toAgentResponse } from './agents.shared.js';
import type {
  AgentDetailEnvelope,
  AgentDocument,
  AgentMutationResponse,
  AgentsCommandContext,
  AgentsListResponse,
  CreateAgentInput,
  UpdateAgentInput,
} from './agents.types.js';
import { DEFAULT_AGENT_MODEL } from './agents.types.js';

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
    code: 'AGENT_NOT_FOUND',
    message: '智能体不存在',
  });
};

const readOptionalStringArrayField = (
  value: unknown,
  field: 'boundSkillIds' | 'boundKnowledgeIds',
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw createValidationAppError(`${field} 必须为字符串数组`, {
      [field]: `${field} 必须为字符串数组`,
    });
  }

  const normalizedValues = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedValues.length !== value.length) {
    throw createValidationAppError(`${field} 必须为字符串数组`, {
      [field]: `${field} 必须为字符串数组`,
    });
  }

  return Array.from(new Set(normalizedValues));
};

const readOptionalAgentStatus = (
  value: unknown,
): AgentDocument['status'] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'active' || value === 'disabled') {
    return value;
  }

  throw createValidationAppError('status 不合法', {
    status: 'status 只能为 active 或 disabled',
  });
};

const readAgentMutationInput = <T extends CreateAgentInput | UpdateAgentInput>(
  input: T,
): T => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createValidationAppError('请求体必须为对象', {
      body: '请求体必须为对象',
    });
  }

  return input;
};

const validateCreateAgentInput = (
  input: CreateAgentInput,
  actorId: string,
): Omit<AgentDocument, '_id'> => {
  const normalizedInput = readAgentMutationInput(input);
  const name = readOptionalStringField(normalizedInput.name, 'name');
  const description = readOptionalStringField(normalizedInput.description, 'description');
  const systemPrompt = readOptionalStringField(
    normalizedInput.systemPrompt,
    'systemPrompt',
  );
  const boundSkillIds =
    readOptionalStringArrayField(normalizedInput.boundSkillIds, 'boundSkillIds') ?? [];
  const boundKnowledgeIds =
    readOptionalStringArrayField(normalizedInput.boundKnowledgeIds, 'boundKnowledgeIds') ?? [];
  const status = readOptionalAgentStatus(normalizedInput.status) ?? 'active';

  if (!name) {
    throw createValidationAppError('请输入智能体名称', {
      name: '请输入智能体名称',
    });
  }

  if (!systemPrompt) {
    throw new AppError(createRequiredFieldError('systemPrompt'));
  }

  const now = new Date();

  return {
    name,
    description: description ?? '',
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
    'name' | 'description' | 'systemPrompt' | 'boundSkillIds' | 'boundKnowledgeIds' | 'status'
  >
> => {
  const normalizedInput = readAgentMutationInput(input);
  const name = readOptionalStringField(normalizedInput.name, 'name');
  const description = readOptionalStringField(normalizedInput.description, 'description');
  const systemPrompt = readOptionalStringField(
    normalizedInput.systemPrompt,
    'systemPrompt',
  );
  const boundSkillIds = readOptionalStringArrayField(
    normalizedInput.boundSkillIds,
    'boundSkillIds',
  );
  const boundKnowledgeIds = readOptionalStringArrayField(
    normalizedInput.boundKnowledgeIds,
    'boundKnowledgeIds',
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
    throw createValidationAppError('至少需要提供一个可更新字段', {
      name: '至少需要提供一个可更新字段',
      description: '至少需要提供一个可更新字段',
      systemPrompt: '至少需要提供一个可更新字段',
      boundSkillIds: '至少需要提供一个可更新字段',
      boundKnowledgeIds: '至少需要提供一个可更新字段',
      status: '至少需要提供一个可更新字段',
    });
  }

  if (normalizedInput.name !== undefined && !name) {
    throw createValidationAppError('请输入智能体名称', {
      name: '请输入智能体名称',
    });
  }

  if (normalizedInput.systemPrompt !== undefined && !systemPrompt) {
    throw createValidationAppError('请输入 systemPrompt', {
      systemPrompt: '请输入 systemPrompt',
    });
  }

  return {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description: description ?? '' } : {}),
    ...(systemPrompt !== undefined ? { systemPrompt } : {}),
    ...(boundSkillIds !== undefined ? { boundSkillIds } : {}),
    ...(boundKnowledgeIds !== undefined ? { boundKnowledgeIds } : {}),
    ...(status !== undefined ? { status } : {}),
  };
};

const applyAgentPatch = (
  currentAgent: AgentDocument & { _id: NonNullable<AgentDocument['_id']> },
  patch: Partial<
    Pick<
      AgentDocument,
      'name' | 'description' | 'systemPrompt' | 'boundSkillIds' | 'boundKnowledgeIds' | 'status'
    >
  >,
): Partial<
  Pick<
    AgentDocument,
    | 'name'
    | 'description'
    | 'systemPrompt'
    | 'boundSkillIds'
    | 'boundKnowledgeIds'
    | 'status'
    | 'updatedAt'
  >
> => {
  return {
    name: patch.name ?? currentAgent.name,
    description: patch.description ?? currentAgent.description,
    systemPrompt: patch.systemPrompt ?? currentAgent.systemPrompt,
    boundSkillIds: patch.boundSkillIds ?? currentAgent.boundSkillIds,
    boundKnowledgeIds: patch.boundKnowledgeIds ?? currentAgent.boundKnowledgeIds,
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
      const knowledge = await knowledgeRepository.findKnowledgeById(knowledgeId);
      return knowledge ? null : knowledgeId;
    }),
  );

  const invalidKnowledgeIds = checks.filter((knowledgeId): knowledgeId is string => !!knowledgeId);

  if (invalidKnowledgeIds.length > 0) {
    throw createValidationAppError('存在未注册的知识库绑定', {
      boundKnowledgeIds: `以下知识库不存在：${invalidKnowledgeIds.join(', ')}`,
    });
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

      await skillBindingValidator.assertBindableSkillIds(document.boundSkillIds, {
        fieldName: 'boundSkillIds',
      });
      await validateBoundKnowledgeIds(knowledgeRepository, document.boundKnowledgeIds);

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
        await skillBindingValidator.assertBindableSkillIds(patch.boundSkillIds, {
          fieldName: 'boundSkillIds',
        });
      }

      if (patch.boundKnowledgeIds !== undefined) {
        await validateBoundKnowledgeIds(knowledgeRepository, patch.boundKnowledgeIds);
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
