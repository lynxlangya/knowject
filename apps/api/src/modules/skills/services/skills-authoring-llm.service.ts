import type { AppEnv } from '@config/env.js';
import { getEffectiveLlmConfig } from '@config/ai-config.js';
import { AppError } from '@lib/app-error.js';
import { createProjectConversationProviderAdapter } from '@modules/projects/project-conversation-provider.js';
import type { SettingsRepository } from '@modules/settings/settings.repository.js';
import { validateSkillDefinitionInput } from '../skills.definition.js';
import type { SkillAuthoringOption } from '../skills.authoring.js';
import type { NormalizedSkillAuthoringTurnInput, SkillAuthoringLlmService, SkillAuthoringModelDraft, SkillAuthoringModelTurn } from './skills-authoring.service.js';

const extractJsonPayload = (value: string): string => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith('{')) {
    return normalizedValue;
  }

  const fencedMatch = normalizedValue.match(/```(?:json)?\s*([\s\S]+?)\s*```/u);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = normalizedValue.indexOf('{');
  const objectEnd = normalizedValue.lastIndexOf('}');

  if (objectStart >= 0 && objectEnd > objectStart) {
    return normalizedValue.slice(objectStart, objectEnd + 1);
  }

  return normalizedValue;
};

const createInvalidAuthoringModelResponseError = (
  cause?: unknown,
): AppError => {
  return new AppError({
    statusCode: 502,
    code: 'SKILL_AUTHORING_LLM_INVALID_RESPONSE',
    message: 'Skill authoring model returned invalid response',
    cause,
  });
};

const readRequiredModelString = (
  value: unknown,
  field: string,
): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createInvalidAuthoringModelResponseError(
      new Error(`${field} must be a non-empty string`),
    );
  }

  return value.trim();
};

const normalizeAuthoringOptions = (value: unknown): SkillAuthoringOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): SkillAuthoringOption[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }

    const option = item as Record<string, unknown>;
    const id = typeof option.id === 'string' ? option.id.trim() : '';
    const label = typeof option.label === 'string' ? option.label.trim() : '';
    const rationale =
      typeof option.rationale === 'string' ? option.rationale.trim() : '';

    if (
      (id !== 'a' && id !== 'b' && id !== 'c') ||
      !label ||
      !rationale ||
      typeof option.recommended !== 'boolean'
    ) {
      return [];
    }

    return [
      {
        id,
        label,
        rationale,
        recommended: option.recommended,
      },
    ];
  });
};

const normalizeModelDraft = (value: unknown): SkillAuthoringModelDraft | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const draft = value as Record<string, unknown>;
  const definition =
    draft.definition && typeof draft.definition === 'object'
      ? validateSkillDefinitionInput(draft.definition)
      : undefined;

  return {
    ...(typeof draft.name === 'string' && draft.name.trim()
      ? { name: draft.name.trim() }
      : {}),
    ...(typeof draft.description === 'string' && draft.description.trim()
      ? { description: draft.description.trim() }
      : {}),
    ...(definition ? { definition } : {}),
  };
};

const parseSkillAuthoringModelTurn = (rawContent: string): SkillAuthoringModelTurn => {
  let payload: unknown;

  try {
    payload = JSON.parse(extractJsonPayload(rawContent));
  } catch (error) {
    throw createInvalidAuthoringModelResponseError(error);
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createInvalidAuthoringModelResponseError();
  }

  const normalizedPayload = payload as Record<string, unknown>;

  return {
    assistantMessage: readRequiredModelString(
      normalizedPayload.assistantMessage,
      'assistantMessage',
    ),
    nextQuestion: readRequiredModelString(
      normalizedPayload.nextQuestion,
      'nextQuestion',
    ),
    options: normalizeAuthoringOptions(normalizedPayload.options),
    structuredDraft: normalizeModelDraft(normalizedPayload.structuredDraft),
  };
};

const buildSkillAuthoringContextPrompt = ({
  actorName,
  session,
}: {
  actorName: string;
  session: NormalizedSkillAuthoringTurnInput;
}): string => {
  return [
    'Current skill authoring context:',
    `actorName: ${actorName}`,
    `scenario: ${session.scope.scenario}`,
    `targets: ${session.scope.targets.join(', ')}`,
    `questionCount: ${session.questionCount}`,
    `currentSummary: ${session.currentSummary || '(empty)'}`,
    `currentStructuredDraft: ${JSON.stringify(session.currentStructuredDraft)}`,
    '',
    'Respond with valid JSON only:',
    JSON.stringify({
      assistantMessage: 'string',
      nextQuestion: 'string',
      options: [
        {
          id: 'a',
          label: 'string',
          rationale: 'string',
          recommended: true,
        },
      ],
      structuredDraft: {
        name: 'string',
        description: 'string',
        definition: {
          goal: 'string',
          triggerScenarios: ['string'],
          requiredContext: ['string'],
          workflow: ['string'],
          outputContract: ['string'],
          guardrails: ['string'],
          artifacts: ['string'],
          projectBindingNotes: ['string'],
          followupQuestionsStrategy: 'required',
        },
      },
    }),
    '',
    'Rules:',
    '- Keep options only when the next turn is a key decision round.',
    '- For synthesizing, summarize the current state and avoid emitting a draft unless information is already sufficient.',
    '- If a structured draft is included, keep followupQuestionsStrategy as required.',
  ].join('\n');
};

const buildSkillAuthoringMessages = ({
  actorName,
  session,
}: {
  actorName: string;
  session: NormalizedSkillAuthoringTurnInput;
}) => {
  return [
    {
      role: 'system' as const,
      content:
        'You are the backend skill authoring assistant for Knowject. Ask controlled questions, summarize accurately, and return valid JSON only.',
    },
    ...session.messages,
    {
      role: 'user' as const,
      content: buildSkillAuthoringContextPrompt({
        actorName,
        session,
      }),
    },
  ];
};

export const createSkillAuthoringLlmService = ({
  env,
  settingsRepository,
}: {
  env: AppEnv;
  settingsRepository: SettingsRepository;
}): SkillAuthoringLlmService => {
  const providerAdapter = createProjectConversationProviderAdapter();

  return {
    async generateTurn({ actor, session }) {
      const llmConfig = await getEffectiveLlmConfig({
        env,
        repository: settingsRepository,
      });
      const rawContent = await providerAdapter.generate({
        llmConfig,
        messages: buildSkillAuthoringMessages({
          actorName: actor.username,
          session,
        }),
      });

      return parseSkillAuthoringModelTurn(rawContent);
    },
  };
};
