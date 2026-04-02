import type { SkillAuthoringMessage, SkillAuthoringOption, SkillAuthoringScopeInput, SkillAuthoringStructuredDraft, SkillAuthoringTurnResponse } from '../skills.authoring.js';
import type { SkillDefinitionFields } from '../skills.definition.js';

export interface NormalizedSkillAuthoringTurnInput {
  scope: SkillAuthoringScopeInput;
  messages: SkillAuthoringMessage[];
  questionCount: number;
  currentSummary: string;
  currentStructuredDraft: SkillAuthoringStructuredDraft | null;
}

export interface SkillAuthoringModelDraft {
  name?: string;
  description?: string;
  definition?: SkillDefinitionFields;
}

export interface SkillAuthoringModelTurn {
  assistantMessage: string;
  nextQuestion: string;
  options: SkillAuthoringOption[];
  structuredDraft: SkillAuthoringModelDraft | null;
}

export interface SkillAuthoringLlmService {
  generateTurn(input: {
    actor: { id: string; username: string };
    session: NormalizedSkillAuthoringTurnInput;
  }): Promise<SkillAuthoringModelTurn>;
}

type SkillAuthoringTurnKind =
  | 'scenario'
  | 'scope'
  | 'output'
  | 'followup'
  | 'freeform'
  | 'synthesize';

const MIN_SYNTHESIS_QUESTION_COUNT = 5;
const FORCED_SYNTHESIS_QUESTION_COUNT = 12;

const createUniqueList = (items: string[]): string[] => {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean)),
  );
};

const readLastUserMessage = (
  messages: SkillAuthoringMessage[],
): string | undefined => {
  return [...messages]
    .reverse()
    .find((message) => message.role === 'user')
    ?.content.trim();
};

const buildAuthoringSummary = (
  input: NormalizedSkillAuthoringTurnInput,
): string => {
  const normalizedSummary = input.currentSummary.trim();

  if (normalizedSummary) {
    return normalizedSummary;
  }

  const lastUserMessage = readLastUserMessage(input.messages);
  const scopeSummary = `${input.scope.scenario}: ${input.scope.targets.join(', ')}`;

  if (lastUserMessage) {
    return `${scopeSummary} | ${lastUserMessage}`;
  }

  return scopeSummary;
};

const resolveTurnKind = ({
  input,
  nextQuestionCount,
}: {
  input: NormalizedSkillAuthoringTurnInput;
  nextQuestionCount: number;
}): SkillAuthoringTurnKind => {
  if (
    input.questionCount >= MIN_SYNTHESIS_QUESTION_COUNT ||
    nextQuestionCount >= FORCED_SYNTHESIS_QUESTION_COUNT ||
    (nextQuestionCount >= MIN_SYNTHESIS_QUESTION_COUNT &&
      input.messages.length >= 8)
  ) {
    return 'synthesize';
  }

  if (input.questionCount === 0) {
    return 'scenario';
  }

  if (input.questionCount === 1) {
    return 'scope';
  }

  if (input.questionCount === 3) {
    return 'followup';
  }

  return 'freeform';
};

const constrainOptionsToDecisionTurns = ({
  turnKind,
  options,
}: {
  turnKind: SkillAuthoringTurnKind;
  options: SkillAuthoringOption[];
}): SkillAuthoringOption[] => {
  return turnKind === 'scenario' ||
    turnKind === 'scope' ||
    turnKind === 'output' ||
    turnKind === 'followup'
    ? options
    : [];
};

const inferDraftName = ({
  summary,
  scenario,
}: {
  summary: string;
  scenario: SkillAuthoringScopeInput['scenario'];
}): string => {
  const prefix =
    scenario === 'documentation_architecture'
      ? 'Architecture Alignment'
      : scenario === 'governance_capture'
        ? 'Governance Capture'
        : 'Execution Alignment';
  const normalizedSummary = summary.replace(/\s+/g, ' ').trim();
  const suffix = normalizedSummary ? ` - ${normalizedSummary.slice(0, 24)}` : '';

  return `${prefix} Skill${suffix}`;
};

const createFallbackDefinition = ({
  summary,
  scope,
  messages,
}: {
  summary: string;
  scope: SkillAuthoringScopeInput;
  messages: SkillAuthoringMessage[];
}): SkillDefinitionFields => {
  const lastUserMessage = readLastUserMessage(messages);
  const requiredContext = createUniqueList([
    ...scope.targets,
    '当前项目事实',
    '现有模块边界',
  ]);
  const projectBindingNotes = createUniqueList([
    ...scope.targets.map((target) => `适用范围：${target}`),
    `默认按 ${scope.scenario} 场景执行`,
  ]);

  return {
    goal: summary || '把需求和约束整理成可执行的 Skill。',
    triggerScenarios: createUniqueList([
      `适用于 ${scope.scenario} 场景`,
      lastUserMessage || '当团队需要把模糊需求收敛成结构化执行方案时',
    ]),
    requiredContext,
    workflow: createUniqueList([
      '确认目标、范围和约束',
      '结合当前项目事实归纳执行步骤',
      '输出结构化 Skill 草稿',
    ]),
    outputContract: createUniqueList([
      '结构化 Skill 草稿',
      '可执行的步骤和验证方式',
    ]),
    guardrails: createUniqueList([
      '不得脱离当前仓库事实',
      '优先最小可行改动',
      '不得臆造不存在的接口或依赖',
    ]),
    artifacts: createUniqueList([
      'Skill 草稿',
      '关键约束摘要',
    ]),
    projectBindingNotes,
    followupQuestionsStrategy: 'required',
  };
};

const buildStructuredDraft = ({
  actorName,
  input,
  summary,
  modelDraft,
}: {
  actorName: string;
  input: NormalizedSkillAuthoringTurnInput;
  summary: string;
  modelDraft: SkillAuthoringModelDraft | null;
}): SkillAuthoringStructuredDraft => {
  const fallbackDefinition = createFallbackDefinition({
    summary,
    scope: input.scope,
    messages: input.messages,
  });
  const definition = modelDraft?.definition ??
    input.currentStructuredDraft?.definition ??
    fallbackDefinition;

  return {
    name:
      modelDraft?.name?.trim() ||
      input.currentStructuredDraft?.name?.trim() ||
      inferDraftName({ summary, scenario: input.scope.scenario }),
    description:
      modelDraft?.description?.trim() ||
      input.currentStructuredDraft?.description?.trim() ||
      summary ||
      '通过对话收敛出的 Skill 草稿。',
    category: input.scope.scenario,
    owner: actorName,
    definition: {
      ...definition,
      followupQuestionsStrategy: 'required',
    },
  };
};

export const createNormalizedAuthoringTurnInput = (
  overrides: Partial<NormalizedSkillAuthoringTurnInput> & {
    scope?: Partial<NormalizedSkillAuthoringTurnInput['scope']>;
  } = {},
): NormalizedSkillAuthoringTurnInput => {
  return {
    scope: {
      scenario: overrides.scope?.scenario ?? 'engineering_execution',
      targets: overrides.scope?.targets ?? ['docs/current/architecture.md'],
    },
    messages: overrides.messages ?? [],
    questionCount: overrides.questionCount ?? 0,
    currentSummary: overrides.currentSummary ?? '',
    currentStructuredDraft: overrides.currentStructuredDraft ?? null,
  };
};

export const runSkillAuthoringTurn = async ({
  actor,
  input,
  llm,
}: {
  actor: { id: string; username: string };
  input: NormalizedSkillAuthoringTurnInput;
  llm: SkillAuthoringLlmService;
}): Promise<SkillAuthoringTurnResponse> => {
  const nextQuestionCount = input.questionCount + 1;
  const currentSummary = buildAuthoringSummary(input);
  const turnKind = resolveTurnKind({
    input,
    nextQuestionCount,
  });
  const modelQuestionCount =
    turnKind === 'synthesize' && input.questionCount >= MIN_SYNTHESIS_QUESTION_COUNT
      ? input.questionCount
      : nextQuestionCount;
  const modelTurn = await llm.generateTurn({
    actor,
    session: {
      ...input,
      questionCount: modelQuestionCount,
      currentSummary,
    },
  });

  if (turnKind !== 'synthesize') {
    return {
      stage: 'interviewing',
      assistantMessage: modelTurn.assistantMessage,
      nextQuestion: modelTurn.nextQuestion,
      options: constrainOptionsToDecisionTurns({
        turnKind,
        options: modelTurn.options,
      }),
      questionCount: nextQuestionCount,
      currentSummary,
      structuredDraft: null,
      readyForConfirmation: false,
    };
  }

  if (input.questionCount < MIN_SYNTHESIS_QUESTION_COUNT) {
    return {
      stage: 'synthesizing',
      assistantMessage: modelTurn.assistantMessage,
      nextQuestion: modelTurn.nextQuestion,
      options: [],
      questionCount: nextQuestionCount,
      currentSummary,
      structuredDraft: null,
      readyForConfirmation: false,
    };
  }

  return {
    stage: 'awaiting_confirmation',
    assistantMessage: modelTurn.assistantMessage,
    nextQuestion: modelTurn.nextQuestion,
    options: [],
    questionCount: input.questionCount,
    currentSummary,
    structuredDraft: buildStructuredDraft({
      actorName: actor.username,
      input,
      summary: currentSummary,
      modelDraft: modelTurn.structuredDraft,
    }),
    readyForConfirmation: true,
  };
};
