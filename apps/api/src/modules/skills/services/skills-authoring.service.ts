import type {
  SkillAuthoringHumanOverrides,
  SkillAuthoringInference,
  SkillAuthoringMessage,
  SkillAuthoringOption,
  SkillAuthoringScopeInput,
  SkillAuthoringStructuredDraft,
  SkillAuthoringTurnResponse,
} from "../skills.authoring.js";
import type {
  SkillCategory,
  SkillDefinitionFields,
} from "../skills.definition.js";

export interface NormalizedSkillAuthoringTurnInput {
  scope: SkillAuthoringScopeInput | null;
  messages: SkillAuthoringMessage[];
  questionCount: number;
  currentSummary: string;
  currentStructuredDraft: SkillAuthoringStructuredDraft | null;
  currentInference: SkillAuthoringInference | null;
  humanOverrides: SkillAuthoringHumanOverrides | null;
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
    signal?: AbortSignal;
  }): Promise<SkillAuthoringModelTurn>;
}

type SkillAuthoringTurnKind =
  | "scenario"
  | "scope"
  | "output"
  | "followup"
  | "freeform"
  | "synthesize";

const MIN_SYNTHESIS_QUESTION_COUNT = 5;
const FORCED_SYNTHESIS_QUESTION_COUNT = 12;
const DEFAULT_SCOPE_SCENARIO: SkillCategory = "engineering_execution";
const DEFAULT_SCOPE_TARGETS = ["docs/current/architecture.md"];
const SUMMARY_SEGMENT_LIMIT = 5;
const OUTPUT_SIGNAL_PATTERN =
  /输出|结果|草稿|模板|结构化|编辑器|预览|保存|验证|验收/u;
const GOVERNANCE_SIGNAL_PATTERNS = [
  /治理/u,
  /governance/i,
  /规范/u,
  /规则/u,
  /约定/u,
  /守则/u,
  /AGENTS\.md/i,
];
const EXECUTION_SIGNAL_PATTERNS = [
  /页面/u,
  /\bpage\b/i,
  /界面/u,
  /交互/u,
  /编辑器/u,
  /\beditor\b/i,
  /预览/u,
  /\bpreview\b/i,
  /drawer/i,
  /流程/u,
  /\bflow\b/i,
  /引导/u,
  /重构/u,
  /实现/u,
  /执行/u,
  /组件/u,
  /\bhook\b/i,
  /\bapi\b/i,
];
const DOCUMENTATION_SIGNAL_PATTERNS = [
  /文档/u,
  /\bdocs?\b/i,
  /架构/u,
  /architecture/i,
  /边界/u,
  /说明/u,
];
const CONTEXT_TARGET_SIGNAL_PATTERNS = [
  {
    target: "apps/platform/src/pages/skills",
    patterns: [
      /apps\/platform\/src\/pages\/skills/i,
      /skills 页面/u,
      /\bskills page\b/i,
      /技能页/u,
      /技能管理/u,
      /结构化编辑器/u,
      /编辑器/u,
      /\beditor\b/i,
      /预览/u,
      /\bpreview\b/i,
      /drawer/i,
    ],
  },
  {
    target: "docs/current/architecture.md",
    patterns: [
      /docs\/current\/architecture\.md/i,
      /当前架构事实文档/u,
      /架构事实/u,
      /架构/u,
      /architecture/i,
      /模块边界/u,
    ],
  },
] as const;

const createUniqueList = (items: string[]): string[] => {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
};

const readLastUserMessage = (
  messages: SkillAuthoringMessage[],
): string | undefined => {
  return [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.content.trim();
};

const readUserMessages = (messages: SkillAuthoringMessage[]): string[] => {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);
};

const readConversationSignals = (
  input: NormalizedSkillAuthoringTurnInput,
): string => {
  return [
    input.currentSummary.trim(),
    ...input.messages.map((message) => message.content.trim()),
  ]
    .filter(Boolean)
    .join(" | ");
};

const readSummarySegments = (summary: string): string[] => {
  return summary
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const createNormalizedInference = ({
  category = null,
  contextTargets = [],
  rationale,
}: Partial<SkillAuthoringInference> = {}): SkillAuthoringInference => {
  return {
    category,
    contextTargets: createUniqueList(contextTargets),
    ...(rationale?.trim() ? { rationale: rationale.trim() } : {}),
  };
};

const hasAnySignal = (
  value: string,
  patterns: readonly RegExp[],
): boolean => {
  return patterns.some((pattern) => pattern.test(value));
};

const inferConversationTargets = (
  input: NormalizedSkillAuthoringTurnInput,
): string[] => {
  const signalText = readConversationSignals(input);

  return CONTEXT_TARGET_SIGNAL_PATTERNS.flatMap(({ target, patterns }) =>
    hasAnySignal(signalText, patterns) ? [target] : [],
  );
};

const inferConversationCategory = (
  input: NormalizedSkillAuthoringTurnInput,
  inferredTargets: string[],
): SkillCategory | null => {
  const signalText = readConversationSignals(input);

  if (!signalText.trim()) {
    return null;
  }

  if (hasAnySignal(signalText, GOVERNANCE_SIGNAL_PATTERNS)) {
    return "governance_capture";
  }

  if (hasAnySignal(signalText, EXECUTION_SIGNAL_PATTERNS)) {
    return "engineering_execution";
  }

  if (hasAnySignal(signalText, DOCUMENTATION_SIGNAL_PATTERNS)) {
    return "documentation_architecture";
  }

  if (inferredTargets.includes("apps/platform/src/pages/skills")) {
    return "engineering_execution";
  }

  if (inferredTargets.includes("docs/current/architecture.md")) {
    return "documentation_architecture";
  }

  return null;
};

const inferInferenceFromConversation = (
  input: NormalizedSkillAuthoringTurnInput,
): SkillAuthoringInference | null => {
  const signalText = readConversationSignals(input);

  if (!signalText.trim()) {
    return null;
  }

  const contextTargets = inferConversationTargets(input);
  const category = inferConversationCategory(input, contextTargets);

  if (category === null && contextTargets.length === 0) {
    return null;
  }

  return createNormalizedInference({
    category,
    contextTargets,
  });
};

const readPreferredTargets = (
  ...sources: Array<string[] | undefined>
): string[] => {
  for (const source of sources) {
    if (source?.length) {
      return createUniqueList(source);
    }
  }

  return [];
};

const extractInferenceFromSummary = (
  summary: string,
): SkillAuthoringInference | null => {
  const summarySegments = readSummarySegments(summary);
  const categorySegment = summarySegments.find((segment) =>
    segment.startsWith("分类："),
  );
  const targetsSegment = summarySegments.find((segment) =>
    segment.startsWith("范围："),
  );
  const categoryCandidate =
    categorySegment?.slice("分类：".length).trim() ?? "";
  const contextTargets = createUniqueList(
    (targetsSegment?.slice("范围：".length).split(",") ?? []).map((target) =>
      target.trim(),
    ),
  );

  return createNormalizedInference({
    category:
      categoryCandidate &&
      (
        [
          "documentation_architecture",
          "engineering_execution",
          "governance_capture",
        ] as const
      ).includes(categoryCandidate as SkillCategory)
        ? (categoryCandidate as SkillCategory)
        : null,
    contextTargets,
  });
};

const resolveKnownInference = (
  input: NormalizedSkillAuthoringTurnInput,
): SkillAuthoringInference => {
  const hasHumanOverrideCategory = Boolean(
    input.humanOverrides &&
    Object.prototype.hasOwnProperty.call(input.humanOverrides, "category"),
  );
  const hasHumanOverrideTargets = Boolean(
    input.humanOverrides &&
    Object.prototype.hasOwnProperty.call(
      input.humanOverrides,
      "contextTargets",
    ),
  );
  const scopeInference = input.scope
    ? createNormalizedInference({
        category: input.scope.scenario,
        contextTargets: input.scope.targets,
      })
    : null;
  const conversationInference = inferInferenceFromConversation(input);
  const summaryInference = extractInferenceFromSummary(input.currentSummary);

  return createNormalizedInference({
    category: hasHumanOverrideCategory
      ? (input.humanOverrides?.category ?? null)
      : (conversationInference?.category ??
        input.currentInference?.category ??
        scopeInference?.category ??
        input.currentStructuredDraft?.category ??
        summaryInference?.category ??
        null),
    contextTargets: hasHumanOverrideTargets
      ? createUniqueList(input.humanOverrides?.contextTargets ?? [])
      : readPreferredTargets(
          conversationInference?.contextTargets,
          input.currentInference?.contextTargets,
          scopeInference?.contextTargets,
          summaryInference?.contextTargets,
        ),
    rationale: input.currentInference?.rationale,
  });
};

const resolveEffectiveScope = (
  input: NormalizedSkillAuthoringTurnInput,
): SkillAuthoringScopeInput => {
  const inference = resolveKnownInference(input);

  return {
    scenario: inference.category ?? DEFAULT_SCOPE_SCENARIO,
    targets: inference.contextTargets.length
      ? inference.contextTargets
      : DEFAULT_SCOPE_TARGETS,
  };
};

const isRefinementTurn = (
  input: NormalizedSkillAuthoringTurnInput,
): boolean => {
  if (!input.currentStructuredDraft) {
    return false;
  }

  return input.messages[input.messages.length - 1]?.role === "user";
};

const buildAuthoringSummary = (
  input: NormalizedSkillAuthoringTurnInput,
): string => {
  const summarySegments = readSummarySegments(input.currentSummary).slice(-2);
  const inference = resolveKnownInference(input);
  const userMessages = readUserMessages(input.messages).slice(-2);
  const summaryParts = createUniqueList([
    ...summarySegments,
    inference.category ? `分类：${inference.category}` : "",
    inference.contextTargets.length
      ? `范围：${inference.contextTargets.join(", ")}`
      : "",
    input.currentStructuredDraft?.name
      ? `现有草稿：${input.currentStructuredDraft.name}`
      : "",
    ...userMessages,
  ]).slice(-SUMMARY_SEGMENT_LIMIT);

  if (summaryParts.length) {
    return summaryParts.join(" | ");
  }

  return "当前 Skill 需求仍在收敛中。";
};

const assessAuthoringSlots = (
  input: NormalizedSkillAuthoringTurnInput,
): {
  hasGoal: boolean;
  hasCategory: boolean;
  hasContextTargets: boolean;
  hasOutputExpectation: boolean;
  isReadyToSynthesize: boolean;
} => {
  const inference = resolveKnownInference(input);
  const userMessages = readUserMessages(input.messages);
  const hasGoal =
    Boolean(userMessages.length) ||
    Boolean(input.currentSummary.trim()) ||
    Boolean(input.currentStructuredDraft);
  const hasCategory = inference.category !== null;
  const hasContextTargets = inference.contextTargets.length > 0;
  const hasOutputExpectation =
    Boolean(input.currentStructuredDraft) ||
    userMessages.some((message) => OUTPUT_SIGNAL_PATTERN.test(message)) ||
    (userMessages.length >= 2 && input.questionCount >= 1);

  return {
    hasGoal,
    hasCategory,
    hasContextTargets,
    hasOutputExpectation,
    isReadyToSynthesize:
      hasGoal && hasCategory && hasContextTargets && hasOutputExpectation,
  };
};

const resolveTurnKind = ({
  input,
  nextQuestionCount,
}: {
  input: NormalizedSkillAuthoringTurnInput;
  nextQuestionCount: number;
}): SkillAuthoringTurnKind => {
  if (isRefinementTurn(input)) {
    return "freeform";
  }

  const slotAssessment = assessAuthoringSlots(input);

  if (
    nextQuestionCount >= FORCED_SYNTHESIS_QUESTION_COUNT ||
    (slotAssessment.isReadyToSynthesize &&
      (input.messages.length >= 6 ||
        input.questionCount >= 2 ||
        nextQuestionCount >= MIN_SYNTHESIS_QUESTION_COUNT))
  ) {
    return "synthesize";
  }

  if (!slotAssessment.hasGoal || !slotAssessment.hasCategory) {
    return "scenario";
  }

  if (!slotAssessment.hasContextTargets) {
    return "scope";
  }

  if (!slotAssessment.hasOutputExpectation) {
    return "output";
  }

  if (input.questionCount >= 2 || input.messages.length >= 4) {
    return "followup";
  }

  return "freeform";
};

const DECISION_TURNS = new Set<SkillAuthoringTurnKind>([
  "scenario",
  "scope",
  "output",
  "followup",
]);

const constrainOptionsToDecisionTurns = ({
  turnKind,
  options,
}: {
  turnKind: SkillAuthoringTurnKind;
  options: SkillAuthoringOption[];
}): SkillAuthoringOption[] => {
  return DECISION_TURNS.has(turnKind) ? options : [];
};

// Keep in sync with SkillCategory — each scenario gets a human-readable draft name prefix.
const SCENARIO_NAME_PREFIX: Record<string, string> = {
  documentation_architecture: "Architecture Alignment",
  governance_capture: "Governance Capture",
};

const inferDraftName = ({
  summary,
  scenario,
}: {
  summary: string;
  scenario: SkillAuthoringScopeInput["scenario"];
}): string => {
  const prefix = SCENARIO_NAME_PREFIX[scenario] ?? "Execution Alignment";
  const normalizedSummary = summary.replace(/\s+/g, " ").trim();
  const suffix = normalizedSummary
    ? ` - ${normalizedSummary.slice(0, 24)}`
    : "";

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
    "当前项目事实",
    "现有模块边界",
  ]);
  const projectBindingNotes = createUniqueList([
    ...scope.targets.map((target) => `适用范围：${target}`),
    `默认按 ${scope.scenario} 场景执行`,
  ]);

  return {
    goal: summary || "把需求和约束整理成可执行的 Skill。",
    triggerScenarios: createUniqueList([
      `适用于 ${scope.scenario} 场景`,
      lastUserMessage || "当团队需要把模糊需求收敛成结构化执行方案时",
    ]),
    requiredContext,
    workflow: createUniqueList([
      "确认目标、范围和约束",
      "结合当前项目事实归纳执行步骤",
      "输出结构化 Skill 草稿",
    ]),
    outputContract: createUniqueList([
      "结构化 Skill 草稿",
      "可执行的步骤和验证方式",
    ]),
    guardrails: createUniqueList([
      "不得脱离当前仓库事实",
      "优先最小可行改动",
      "不得臆造不存在的接口或依赖",
    ]),
    artifacts: createUniqueList(["Skill 草稿", "关键约束摘要"]),
    projectBindingNotes,
    followupQuestionsStrategy: "required",
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
  const effectiveScope = resolveEffectiveScope(input);
  const fallbackDefinition = createFallbackDefinition({
    summary,
    scope: effectiveScope,
    messages: input.messages,
  });
  const definition =
    modelDraft?.definition ??
    input.currentStructuredDraft?.definition ??
    fallbackDefinition;

  return {
    name:
      modelDraft?.name?.trim() ||
      input.currentStructuredDraft?.name?.trim() ||
      inferDraftName({ summary, scenario: effectiveScope.scenario }),
    description:
      modelDraft?.description?.trim() ||
      input.currentStructuredDraft?.description?.trim() ||
      summary ||
      "通过对话收敛出的 Skill 草稿。",
    category: effectiveScope.scenario,
    owner: actorName,
    definition: {
      ...definition,
      followupQuestionsStrategy: "required",
    },
  };
};

export const createNormalizedAuthoringTurnInput = (
  overrides: Partial<NormalizedSkillAuthoringTurnInput> & {
    scope?: Partial<SkillAuthoringScopeInput> | null;
  } = {},
): NormalizedSkillAuthoringTurnInput => {
  return {
    scope:
      overrides.scope === undefined || overrides.scope === null
        ? null
        : {
            scenario: overrides.scope?.scenario ?? DEFAULT_SCOPE_SCENARIO,
            targets: overrides.scope?.targets ?? DEFAULT_SCOPE_TARGETS,
          },
    messages: overrides.messages ?? [],
    questionCount: overrides.questionCount ?? 0,
    currentSummary: overrides.currentSummary ?? "",
    currentStructuredDraft: overrides.currentStructuredDraft ?? null,
    currentInference:
      overrides.currentInference === null
        ? null
        : overrides.currentInference
          ? createNormalizedInference(overrides.currentInference)
          : null,
    humanOverrides:
      overrides.humanOverrides === null
        ? null
        : overrides.humanOverrides
          ? {
              ...(overrides.humanOverrides.category !== undefined
                ? { category: overrides.humanOverrides.category }
                : {}),
              ...(overrides.humanOverrides.contextTargets
                ? {
                    contextTargets: createUniqueList(
                      overrides.humanOverrides.contextTargets,
                    ),
                  }
                : {}),
            }
          : null,
  };
};

export const runSkillAuthoringTurn = async ({
  actor,
  input,
  llm,
  signal,
}: {
  actor: { id: string; username: string };
  input: NormalizedSkillAuthoringTurnInput;
  llm: SkillAuthoringLlmService;
  signal?: AbortSignal;
}): Promise<SkillAuthoringTurnResponse> => {
  const nextQuestionCount = input.questionCount + 1;
  const currentSummary = buildAuthoringSummary(input);
  const inputWithCurrentSummary = {
    ...input,
    currentSummary,
  };
  const currentInference = resolveKnownInference(inputWithCurrentSummary);
  const effectiveScope = resolveEffectiveScope({
    ...inputWithCurrentSummary,
    currentInference,
  });
  const turnKind = resolveTurnKind({
    input: inputWithCurrentSummary,
    nextQuestionCount,
  });
  const modelQuestionCount =
    turnKind === "synthesize" &&
    inputWithCurrentSummary.questionCount >= MIN_SYNTHESIS_QUESTION_COUNT
      ? inputWithCurrentSummary.questionCount
      : nextQuestionCount;
  const modelTurn = await llm.generateTurn({
    actor,
    session: {
      ...inputWithCurrentSummary,
      scope: effectiveScope,
      currentInference,
      questionCount: modelQuestionCount,
      currentSummary,
    },
    signal,
  });

  if (turnKind !== "synthesize") {
    return {
      stage: "interviewing",
      assistantMessage: modelTurn.assistantMessage,
      nextQuestion: modelTurn.nextQuestion,
      options: constrainOptionsToDecisionTurns({
        turnKind,
        options: modelTurn.options,
      }),
      questionCount: nextQuestionCount,
      currentSummary,
      currentInference,
      structuredDraft: null,
      readyForConfirmation: false,
    };
  }

  if (input.questionCount < MIN_SYNTHESIS_QUESTION_COUNT) {
    return {
      stage: "synthesizing",
      assistantMessage: modelTurn.assistantMessage,
      nextQuestion: modelTurn.nextQuestion,
      options: [],
      questionCount: nextQuestionCount,
      currentSummary,
      currentInference,
      structuredDraft: null,
      readyForConfirmation: false,
    };
  }

  return {
    stage: "awaiting_confirmation",
    assistantMessage: modelTurn.assistantMessage,
    nextQuestion: modelTurn.nextQuestion,
    options: [],
    questionCount: input.questionCount,
    currentSummary,
    currentInference,
    structuredDraft: buildStructuredDraft({
      actorName: actor.username,
      input: {
        ...input,
        scope: effectiveScope,
      },
      summary: currentSummary,
      modelDraft: modelTurn.structuredDraft,
    }),
    readyForConfirmation: true,
  };
};
