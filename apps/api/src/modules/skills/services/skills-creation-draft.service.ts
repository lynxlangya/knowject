import type { SkillAuthoringInference } from "../skills.authoring.js";
import type {
  SkillCreationDraftResponse,
  SkillCreationTemplateHint,
} from "../skills.creation.js";
import {
  buildSkillCreationMarkdownDraft,
  parseSkillCreationMarkdownDraft,
  type ParsedSkillCreationDraft,
  type SkillCategory,
  type SkillDefinitionFields,
} from "../skills.definition.js";

export interface NormalizedSkillCreationDraftGenerateInput {
  name: string;
  description: string;
  taskIntent: string;
  templateHint: SkillCreationTemplateHint | null;
}

export interface NormalizedSkillCreationDraftRefineInput {
  name: string;
  description: string;
  markdownDraft: string;
  optimizationInstruction: string;
  currentInference: SkillAuthoringInference | null;
}

export interface SkillCreationDraftLlmService {
  generateDraft(input: {
    actor: { id: string; username: string };
    request: NormalizedSkillCreationDraftGenerateInput;
    fallback: SkillCreationDraftResponse;
    signal?: AbortSignal;
  }): Promise<Partial<SkillCreationDraftResponse> | null>;
  refineDraft(input: {
    actor: { id: string; username: string };
    request: NormalizedSkillCreationDraftRefineInput;
    fallback: SkillCreationDraftResponse;
    signal?: AbortSignal;
  }): Promise<Partial<SkillCreationDraftResponse> | null>;
}

const GOVERNANCE_SIGNAL_PATTERNS = [
  /治理/u,
  /governance/i,
  /规范/u,
  /规则/u,
  /约定/u,
  /守则/u,
  /审计/u,
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
  /模块/u,
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
      /编辑器/u,
      /\beditor\b/i,
      /预览/u,
      /\bpreview\b/i,
    ],
  },
  {
    target: "apps/api/src/modules/skills",
    patterns: [
      /apps\/api\/src\/modules\/skills/i,
      /skills api/i,
      /skills 后端/u,
      /路由/u,
      /\brouter\b/i,
      /\bservice\b/i,
      /contract/i,
      /接口/u,
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

const extractDraftBoundContextTargets = (markdownDraft?: string): string[] => {
  if (!markdownDraft) {
    return [];
  }

  return createUniqueList(
    markdownDraft
      .split(/\n+/u)
      .map((line) => line.trim())
      .flatMap((line) => {
        const match = line.match(/^[-*]?\s*当前推断参考范围：(.+)$/u);
        return match?.[1] ? [match[1].trim()] : [];
      }),
  );
};

const hasAnySignal = (
  value: string,
  patterns: readonly RegExp[],
): boolean => {
  return patterns.some((pattern) => pattern.test(value));
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

const extractIntentLines = (value: string): string[] => {
  const normalizedValue = value.replace(/\r\n/g, "\n").trim();

  if (!normalizedValue) {
    return [];
  }

  const rawLines = normalizedValue
    .split(/\n+/u)
    .flatMap((line) => line.split(/[；;。]/u))
    .map((line) =>
      line
        .trim()
        .replace(/^[-*]\s+/u, "")
        .replace(/^\d+\.\s+/u, "")
        .trim(),
    )
    .filter(Boolean);

  return createUniqueList(rawLines);
};

const inferCreationDraftContextTargets = (value: string): string[] => {
  return CONTEXT_TARGET_SIGNAL_PATTERNS.flatMap(({ target, patterns }) =>
    hasAnySignal(value, patterns) ? [target] : [],
  );
};

const inferCreationDraftCategory = (
  value: string,
  contextTargets: string[],
): SkillCategory => {
  if (hasAnySignal(value, GOVERNANCE_SIGNAL_PATTERNS)) {
    return "governance_capture";
  }

  if (contextTargets.includes("docs/current/architecture.md")) {
    return "documentation_architecture";
  }

  if (contextTargets.includes("apps/platform/src/pages/skills")) {
    return "engineering_execution";
  }

  if (hasAnySignal(value, EXECUTION_SIGNAL_PATTERNS)) {
    return "engineering_execution";
  }

  if (hasAnySignal(value, DOCUMENTATION_SIGNAL_PATTERNS)) {
    return "documentation_architecture";
  }

  return "engineering_execution";
};

const inferCreationDraftInference = ({
  description,
  taskIntent,
  markdownDraft,
  currentInference,
}: {
  description: string;
  taskIntent?: string;
  markdownDraft?: string;
  currentInference?: SkillAuthoringInference | null;
}): SkillAuthoringInference => {
  const signalText = [description, taskIntent ?? "", markdownDraft ?? ""]
    .filter(Boolean)
    .join(" | ");
  const draftBoundTargets = extractDraftBoundContextTargets(markdownDraft);
  const inferredTargets =
    draftBoundTargets.length > 0
      ? draftBoundTargets
      : inferCreationDraftContextTargets(signalText);

  return createNormalizedInference({
    category: inferCreationDraftCategory(signalText, inferredTargets),
    contextTargets: inferredTargets,
    rationale: currentInference?.rationale,
  });
};

const buildWorkflow = ({
  taskLines,
  templateHint,
}: {
  taskLines: string[];
  templateHint: SkillCreationTemplateHint | null;
}): string[] => {
  if (taskLines.length >= 3) {
    return taskLines.slice(0, 5);
  }

  if (templateHint === "workflow" && taskLines.length > 0) {
    return [
      "先梳理输入信息与现有约束",
      ...taskLines.slice(0, 2).map((line) => `围绕“${line}”展开执行`),
      "补齐缺失细节并输出最终草稿",
    ];
  }

  return createUniqueList([
    "阅读名称、描述和任务意图，确认目标边界",
    ...(taskLines[0] ? [`围绕“${taskLines[0]}”展开主体执行`] : []),
    "将结果整理成清晰、可复用的 Skill 草稿",
  ]);
};

const buildOutputContract = ({
  name,
  taskLines,
  templateHint,
}: {
  name: string;
  taskLines: string[];
  templateHint: SkillCreationTemplateHint | null;
}): string[] => {
  if (templateHint === "output") {
    return createUniqueList([
      `${name} 的可执行 Skill 草稿`,
      "清晰的输出结构与交付说明",
      ...(taskLines[0] ? [`覆盖“${taskLines[0]}”对应的结果要求`] : []),
    ]);
  }

  return createUniqueList([
    `${name} 的可用 Skill 草稿`,
    "清晰的工作流与输出要求",
    "可直接保存或继续优化的 Markdown 结构",
  ]);
};

const buildRequiredContext = ({
  inference,
  taskLines,
}: {
  inference: SkillAuthoringInference;
  taskLines: string[];
}): string[] => {
  const baseContext = [
    "Skill 名称与描述",
    "具体要做的事情",
    ...(taskLines[0] ? [`围绕“${taskLines[0]}”的补充背景`] : []),
  ];

  const targetContext = inference.contextTargets.map((target) =>
    `相关事实源：${target}`,
  );

  return createUniqueList([...baseContext, ...targetContext]).slice(0, 5);
};

const buildGuardrails = ({
  templateHint,
}: {
  templateHint: SkillCreationTemplateHint | null;
}): string[] => {
  return createUniqueList([
    "不要偏离名称、描述与任务意图约定的目标",
    "缺少明确信息时先标注假设，不要臆造项目事实",
    ...(templateHint === "guardrails"
      ? ["若约束不足，优先补齐约束说明后再扩写流程"]
      : []),
  ]);
};

const buildConfirmationQuestions = ({
  inference,
  definition,
}: {
  inference: SkillAuthoringInference;
  definition: SkillDefinitionFields;
}): string[] => {
  const questions: string[] = [];

  if (inference.category === null) {
    questions.push("这个 Skill 更偏文档梳理、工程执行，还是治理沉淀？");
  }

  if (inference.contextTargets.length === 0) {
    questions.push("是否有需要优先参考的目录、模块或事实文档？");
  }

  if (definition.outputContract.length < 2) {
    questions.push("最后的输出还需要补哪些固定部分？");
  }

  return questions;
};

const buildCreationDraftDefinition = ({
  name,
  description,
  taskIntent,
  templateHint,
  inference,
}: {
  name: string;
  description: string;
  taskIntent: string;
  templateHint: SkillCreationTemplateHint | null;
  inference: SkillAuthoringInference;
}): SkillDefinitionFields => {
  const taskLines = extractIntentLines(taskIntent);
  const goalSuffix =
    taskLines[0] ?? "把输入意图整理成清晰、可执行的 Skill 草稿";

  return {
    goal: `${description}。重点完成：${goalSuffix}`.trim(),
    triggerScenarios: createUniqueList([
      `当团队需要${description}时使用`,
      ...(taskLines[0] ? [`当用户明确提出“${taskLines[0]}”时使用`] : []),
    ]),
    requiredContext: buildRequiredContext({
      inference,
      taskLines,
    }),
    workflow: buildWorkflow({
      taskLines,
      templateHint,
    }),
    outputContract: buildOutputContract({
      name,
      taskLines,
      templateHint,
    }),
    guardrails: buildGuardrails({
      templateHint,
    }),
    artifacts: [],
    projectBindingNotes: inference.contextTargets.map(
      (target) => `当前推断参考范围：${target}`,
    ),
    followupQuestionsStrategy: "optional",
  };
};

const mergeDraftResponse = (
  fallback: SkillCreationDraftResponse,
  modelOutput: Partial<SkillCreationDraftResponse> | null,
): SkillCreationDraftResponse => {
  if (!modelOutput) {
    return fallback;
  }

  return {
    markdownDraft:
      typeof modelOutput.markdownDraft === "string" &&
      modelOutput.markdownDraft.trim()
        ? modelOutput.markdownDraft.trim()
        : fallback.markdownDraft,
    currentSummary:
      typeof modelOutput.currentSummary === "string" &&
      modelOutput.currentSummary.trim()
        ? modelOutput.currentSummary.trim()
        : fallback.currentSummary,
    currentInference:
      modelOutput.currentInference &&
      typeof modelOutput.currentInference === "object" &&
      !Array.isArray(modelOutput.currentInference)
        ? createNormalizedInference(modelOutput.currentInference)
        : fallback.currentInference,
    confirmationQuestions: Array.isArray(modelOutput.confirmationQuestions)
      ? createUniqueList(
          modelOutput.confirmationQuestions.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          ),
        )
      : fallback.confirmationQuestions,
    needsFollowup:
      typeof modelOutput.needsFollowup === "boolean"
        ? modelOutput.needsFollowup
        : fallback.needsFollowup,
  };
};

const buildCreationDraftSummary = ({
  description,
  inference,
  definition,
}: {
  description: string;
  inference: SkillAuthoringInference;
  definition: SkillDefinitionFields;
}): string => {
  return createUniqueList([
    `用途：${description}`,
    inference.category ? `分类：${inference.category}` : "",
    inference.contextTargets.length
      ? `范围：${inference.contextTargets.join(", ")}`
      : "",
    definition.workflow[0] ? `流程起点：${definition.workflow[0]}` : "",
  ]).join(" | ");
};

const createFallbackResponse = ({
  name,
  description,
  definition,
  inference,
}: {
  name: string;
  description: string;
  definition: SkillDefinitionFields;
  inference: SkillAuthoringInference;
}): SkillCreationDraftResponse => {
  const currentSummary = buildCreationDraftSummary({
    description,
    inference,
    definition,
  });
  const confirmationQuestions = buildConfirmationQuestions({
    inference,
    definition,
  });

  return {
    markdownDraft: buildSkillCreationMarkdownDraft({
      name,
      description,
      definition,
    }),
    currentSummary,
    currentInference: inference,
    confirmationQuestions,
    needsFollowup: confirmationQuestions.length > 0,
  };
};

export const generateSkillCreationDraft = async ({
  actor,
  input,
  llm,
  signal,
}: {
  actor: { id: string; username: string };
  input: NormalizedSkillCreationDraftGenerateInput;
  llm?: SkillCreationDraftLlmService;
  signal?: AbortSignal;
}): Promise<SkillCreationDraftResponse> => {
  const inference = inferCreationDraftInference({
    description: input.description,
    taskIntent: input.taskIntent,
  });
  const definition = buildCreationDraftDefinition({
    name: input.name,
    description: input.description,
    taskIntent: input.taskIntent,
    templateHint: input.templateHint,
    inference,
  });
  const fallback = createFallbackResponse({
    name: input.name,
    description: input.description,
    definition,
    inference,
  });

  if (!llm) {
    return fallback;
  }

  try {
    return mergeDraftResponse(
      fallback,
      await llm.generateDraft({
        actor,
        request: input,
        fallback,
        signal,
      }),
    );
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    return fallback;
  }
};

export const refineSkillCreationDraft = async ({
  actor,
  input,
  llm,
  signal,
}: {
  actor: { id: string; username: string };
  input: NormalizedSkillCreationDraftRefineInput;
  llm?: SkillCreationDraftLlmService;
  signal?: AbortSignal;
}): Promise<SkillCreationDraftResponse> => {
  const parsedDraft = parseSkillCreationMarkdownDraft(
    input.markdownDraft,
  ) as ParsedSkillCreationDraft;
  const inference = inferCreationDraftInference({
    description: input.description,
    markdownDraft: input.markdownDraft,
    currentInference: input.currentInference,
  });
  const fallback = createFallbackResponse({
    name: parsedDraft.name,
    description: parsedDraft.description,
    definition: {
      ...parsedDraft.definition,
      projectBindingNotes: createUniqueList([
        ...parsedDraft.definition.projectBindingNotes,
        ...inference.contextTargets.map((target) => `当前推断参考范围：${target}`),
      ]),
    },
    inference,
  });

  if (!llm) {
    return fallback;
  }

  try {
    return mergeDraftResponse(
      fallback,
      await llm.refineDraft({
        actor,
        request: input,
        fallback,
        signal,
      }),
    );
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    return fallback;
  }
};

export const resolveSkillCreationDraftCategory = ({
  description,
  markdownDraft,
  currentInference,
}: {
  description: string;
  markdownDraft: string;
  currentInference?: SkillAuthoringInference | null;
}): SkillCategory => {
  return inferCreationDraftInference({
    description,
    markdownDraft,
    currentInference,
  }).category ?? "engineering_execution";
};

export const resolveSkillCreationDraftInference = ({
  description,
  markdownDraft,
  currentInference,
}: {
  description: string;
  markdownDraft: string;
  currentInference?: SkillAuthoringInference | null;
}): SkillAuthoringInference => {
  return inferCreationDraftInference({
    description,
    markdownDraft,
    currentInference,
  });
};
