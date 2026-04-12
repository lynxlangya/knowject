import { useEffect, useRef, useState } from "react";
import {
  SKILL_CATEGORY_VALUES,
  type SkillAuthoringHumanOverrides,
  type SkillAuthoringInference,
  type SkillCategory,
  type SkillAuthoringStructuredDraft,
} from "@api/skills";
import { isAbortError, streamSkillAuthoringTurn } from "@api/skills.stream";
import { AUTHORING_SCOPE_TARGET_ALLOWLIST } from "../constants/skillsManagement.constants";
import type {
  SkillAuthoringCreateScopeState,
  SkillAuthoringSessionMessage,
  SkillAuthoringSessionState,
} from "../types/skillsManagement.types";

const STORAGE_KEY = "knowject:skills:create-authoring-session";

const EMPTY_SCOPE: SkillAuthoringCreateScopeState = {
  scenario: null,
  targets: [],
};

const SCOPE_INTRO_MESSAGE: SkillAuthoringSessionMessage = {
  id: "assistant-scope-intro",
  role: "assistant",
  content:
    "先直接说清这个 Skill 想解决什么问题，我会在对话里逐步收敛范围和草稿。",
};

const createEmptySessionState = (): SkillAuthoringSessionState => ({
  stage: "interviewing",
  scope: EMPTY_SCOPE,
  messages: [SCOPE_INTRO_MESSAGE],
  questionCount: 0,
  currentSummary: "",
  structuredDraft: null,
  currentInference: null,
  humanOverrides: null,
  readyForConfirmation: false,
  pendingAnswer: "",
});

const isBrowser = () => typeof window !== "undefined";

const isValidStage = (
  value: unknown,
): value is SkillAuthoringSessionState["stage"] =>
  value === "interviewing" ||
  value === "synthesizing" ||
  value === "awaiting_confirmation" ||
  value === "hydrated";

const normalizeStoredStage = (
  value: unknown,
): SkillAuthoringSessionState["stage"] | null => {
  if (value === "scope_selecting") {
    return "interviewing";
  }

  return isValidStage(value) ? value : null;
};

const isSkillCategory = (value: unknown): value is SkillCategory =>
  typeof value === "string" &&
  SKILL_CATEGORY_VALUES.includes(value as SkillCategory);

const isAllowedAuthoringTarget = (value: unknown): value is string =>
  typeof value === "string" &&
  AUTHORING_SCOPE_TARGET_ALLOWLIST.includes(
    value as (typeof AUTHORING_SCOPE_TARGET_ALLOWLIST)[number],
  );

const sanitizeStoredAuthoringTargets = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.filter((item): item is string => isAllowedAuthoringTarget(item))),
  );
};

const isValidScope = (
  value: unknown,
): value is SkillAuthoringCreateScopeState => {
  if (!value || typeof value !== "object") return false;

  const scope = value as Partial<SkillAuthoringCreateScopeState>;
  const hasValidScenario =
    scope.scenario === null ||
    scope.scenario === undefined ||
    isSkillCategory(scope.scenario);

  return hasValidScenario && Array.isArray(scope.targets);
};

const isValidMessages = (
  value: unknown,
): value is SkillAuthoringSessionMessage[] => {
  if (!Array.isArray(value)) return false;

  return value.every(
    (message) =>
      message &&
      typeof message === "object" &&
      (message.role === "assistant" || message.role === "user") &&
      typeof message.content === "string",
  );
};

const isValidInference = (value: unknown): value is SkillAuthoringInference => {
  if (!value || typeof value !== "object") return false;

  const inference = value as Partial<SkillAuthoringInference>;
  const hasValidCategory =
    inference.category === null ||
    inference.category === undefined ||
    isSkillCategory(inference.category);

  return hasValidCategory && Array.isArray(inference.contextTargets);
};

const isValidHumanOverrides = (
  value: unknown,
): value is SkillAuthoringHumanOverrides => {
  if (!value || typeof value !== "object") return false;

  const overrides = value as Partial<SkillAuthoringHumanOverrides>;
  const hasValidCategory =
    overrides.category === null ||
    overrides.category === undefined ||
    isSkillCategory(overrides.category);
  const hasValidTargets =
    overrides.contextTargets === undefined ||
    Array.isArray(overrides.contextTargets);

  return hasValidCategory && hasValidTargets;
};

const createInferenceFromScope = (
  scope: SkillAuthoringCreateScopeState,
): SkillAuthoringInference | null => {
  if (!scope.scenario && scope.targets.length === 0) {
    return null;
  }

  return {
    category: scope.scenario,
    contextTargets: scope.targets,
  };
};

const createHumanOverridesFromScope = (
  scope: SkillAuthoringCreateScopeState,
): SkillAuthoringHumanOverrides | null => {
  const overrides: SkillAuthoringHumanOverrides = {};

  if (scope.scenario !== null) {
    overrides.category = scope.scenario;
  }

  if (scope.targets.length > 0) {
    overrides.contextTargets = scope.targets;
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
};

const readSessionFromLocalStorage = (): SkillAuthoringSessionState => {
  if (!isBrowser()) return createEmptySessionState();

  const raw = localStorage.getItem("knowject:skills:create-authoring-session");
  if (!raw) return createEmptySessionState();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("invalid session payload");
    }

    const record = parsed as Partial<SkillAuthoringSessionState>;
    const normalizedStage = normalizeStoredStage(record.stage);
    if (!normalizedStage) {
      throw new Error("invalid session stage");
    }
    if (record.scope && !isValidScope(record.scope)) {
      throw new Error("invalid session scope");
    }
    if (record.messages && !isValidMessages(record.messages)) {
      throw new Error("invalid session messages");
    }
    if (record.currentInference && !isValidInference(record.currentInference)) {
      throw new Error("invalid session inference");
    }
    if (
      record.humanOverrides &&
      !isValidHumanOverrides(record.humanOverrides)
    ) {
      throw new Error("invalid session humanOverrides");
    }

    const normalizedScope: SkillAuthoringCreateScopeState = {
      scenario: record.scope?.scenario ?? null,
      targets: sanitizeStoredAuthoringTargets(record.scope?.targets),
    };
    const normalizedCurrentInference = record.currentInference
      ? {
          ...record.currentInference,
          contextTargets: sanitizeStoredAuthoringTargets(
            record.currentInference.contextTargets,
          ),
        }
      : createInferenceFromScope(normalizedScope);
    const normalizedHumanOverrides = record.humanOverrides
      ? {
          ...(record.humanOverrides.category !== undefined
            ? { category: record.humanOverrides.category }
            : {}),
          ...(record.humanOverrides.contextTargets !== undefined
            ? {
                contextTargets: sanitizeStoredAuthoringTargets(
                  record.humanOverrides.contextTargets,
                ),
              }
            : {}),
        }
      : createHumanOverridesFromScope(normalizedScope);

    return {
      ...createEmptySessionState(),
      stage: normalizedStage,
      scope: normalizedScope,
      messages: record.messages ?? [SCOPE_INTRO_MESSAGE],
      questionCount: record.questionCount ?? 0,
      currentSummary: record.currentSummary ?? "",
      structuredDraft: record.structuredDraft ?? null,
      currentInference: normalizedCurrentInference,
      humanOverrides:
        normalizedHumanOverrides &&
        Object.keys(normalizedHumanOverrides).length > 0
          ? normalizedHumanOverrides
          : null,
      readyForConfirmation: record.readyForConfirmation ?? false,
      pendingAnswer: record.pendingAnswer ?? "",
    };
  } catch (error) {
    console.warn(
      "[useSkillAuthoringSession] localStorage 恢复失败，将回退为新会话:",
      error,
    );
    localStorage.removeItem(STORAGE_KEY);
    return createEmptySessionState();
  }
};

const createMessageId = (): string => {
  if (!isBrowser()) return `${Date.now()}`;
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
};

export const hasRealProgress = (
  session: SkillAuthoringSessionState,
): boolean => {
  return Boolean(
    session.scope.scenario ||
    session.scope.targets.length > 0 ||
    session.messages.length > 1 ||
    session.questionCount > 0 ||
    session.currentSummary.trim() ||
    session.structuredDraft ||
    session.currentInference?.category ||
    session.currentInference?.contextTargets.length ||
    session.humanOverrides?.category !== undefined ||
    (session.humanOverrides?.contextTargets?.length ?? 0) > 0 ||
    session.pendingAnswer.trim(),
  );
};

export const resolveAuthoringResumeStage = (
  current: SkillAuthoringSessionState,
): SkillAuthoringSessionState["stage"] => {
  if (current.readyForConfirmation && current.structuredDraft) {
    return "hydrated";
  }
  if (current.readyForConfirmation) {
    return "awaiting_confirmation";
  }
  return "interviewing";
};

type SkillAuthoringAbortReason = "cancel" | "reset" | "superseded" | "unmount";

interface ActiveSkillAuthoringTurn {
  requestId: number;
  controller: AbortController;
}

const isSkillAuthoringAbortReason = (
  value: unknown,
): value is SkillAuthoringAbortReason => {
  return (
    value === "cancel" ||
    value === "reset" ||
    value === "superseded" ||
    value === "unmount"
  );
};

const getSkillAuthoringAbortReason = (
  signal: AbortSignal,
): SkillAuthoringAbortReason | null => {
  return isSkillAuthoringAbortReason(signal.reason) ? signal.reason : null;
};

export const useSkillAuthoringSession = () => {
  const [session, setSession] = useState<SkillAuthoringSessionState>(() =>
    readSessionFromLocalStorage(),
  );
  const activeTurnRef = useRef<ActiveSkillAuthoringTurn | null>(null);
  const nextTurnRequestIdRef = useRef(0);
  const lastPersistedSessionRef = useRef<SkillAuthoringSessionState | null>(
    null,
  );

  useEffect(() => {
    if (!isBrowser()) return;
    if (session === lastPersistedSessionRef.current) return;

    lastPersistedSessionRef.current = session;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn(
        "[useSkillAuthoringSession] localStorage 持久化失败:",
        error,
      );
    }
  }, [session]);

  useEffect(() => {
    return () => {
      const activeTurn = activeTurnRef.current;
      if (activeTurn && !activeTurn.controller.signal.aborted) {
        activeTurn.controller.abort("unmount");
      }
    };
  }, []);

  const abortActiveTurn = (reason: SkillAuthoringAbortReason) => {
    const activeTurn = activeTurnRef.current;

    if (!activeTurn || activeTurn.controller.signal.aborted) {
      return;
    }

    activeTurn.controller.abort(reason);
  };

  const restoreSessionSnapshot = (
    previousSession: SkillAuthoringSessionState,
    answer: string,
  ) => {
    setSession((current) => ({
      ...current,
      stage: previousSession.stage,
      scope: previousSession.scope,
      messages: previousSession.messages,
      questionCount: previousSession.questionCount,
      currentSummary: previousSession.currentSummary,
      structuredDraft: previousSession.structuredDraft,
      currentInference: previousSession.currentInference,
      humanOverrides: previousSession.humanOverrides,
      readyForConfirmation: previousSession.readyForConfirmation,
      pendingAnswer: answer,
    }));
  };

  const applyStructuredDraft = (draft: SkillAuthoringStructuredDraft) => {
    setSession((current) => ({
      ...current,
      stage: "hydrated",
      structuredDraft: draft,
      readyForConfirmation: true,
    }));
  };

  const hasRecoverableSession = () => {
    return hasRealProgress(session);
  };

  const resumeExistingSession = () => {
    if (!hasRecoverableSession()) {
      if (session.stage !== "interviewing") {
        setSession((current) => ({
          ...current,
          stage: "interviewing",
        }));
      }
      return;
    }

    setSession((current) => ({
      ...current,
      stage: resolveAuthoringResumeStage(current),
    }));
  };

  const startFreshSession = () => {
    abortActiveTurn("reset");
    if (isBrowser()) {
      localStorage.removeItem(STORAGE_KEY);
    }

    setSession(createEmptySessionState());
  };

  const cancelActiveTurn = () => {
    abortActiveTurn("cancel");
  };

  const appendMessage = (message: Omit<SkillAuthoringSessionMessage, "id">) => {
    setSession((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          ...message,
          id: createMessageId(),
        },
      ],
    }));
  };

  const submitAnswer = async (answer: string) => {
    const previousSession = session;
    abortActiveTurn("superseded");

    const requestId = nextTurnRequestIdRef.current + 1;
    nextTurnRequestIdRef.current = requestId;
    const controller = new AbortController();
    activeTurnRef.current = {
      requestId,
      controller,
    };
    const nextMessages: SkillAuthoringSessionMessage[] = [
      ...session.messages,
      {
        id: createMessageId(),
        role: "user",
        content: answer,
      },
    ];

    setSession((current) => ({
      ...current,
      stage: "synthesizing",
      pendingAnswer: answer,
      messages: nextMessages,
    }));

    try {
      const currentInference =
        session.currentInference ?? createInferenceFromScope(session.scope);
      const normalizedScope =
        session.scope.scenario && session.scope.targets.length > 0
          ? {
              scenario: session.scope.scenario,
              targets: session.scope.targets,
            }
          : null;
      const result = await streamSkillAuthoringTurn(
        {
          scope: normalizedScope,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          questionCount: session.questionCount,
          currentSummary: session.currentSummary,
          currentStructuredDraft: session.structuredDraft,
          currentInference,
          humanOverrides: session.humanOverrides,
        },
        {
          signal: controller.signal,
        },
      );

      if (
        activeTurnRef.current?.requestId !== requestId ||
        controller.signal.aborted
      ) {
        if (getSkillAuthoringAbortReason(controller.signal) === "cancel") {
          restoreSessionSnapshot(previousSession, answer);
        }
        return;
      }

      setSession((current) => ({
        ...current,
        stage: result.stage,
        questionCount: result.questionCount,
        currentSummary: result.currentSummary,
        structuredDraft: result.structuredDraft,
        currentInference: result.currentInference,
        humanOverrides: current.humanOverrides,
        readyForConfirmation: result.readyForConfirmation,
        pendingAnswer: "",
        messages: [
          ...current.messages,
          {
            id: createMessageId(),
            role: "assistant",
            content: result.assistantMessage,
          },
          {
            id: createMessageId(),
            role: "assistant",
            content: result.nextQuestion,
          },
        ],
      }));
    } catch (error) {
      const isStaleRequest = activeTurnRef.current?.requestId !== requestId;

      if (isStaleRequest || controller.signal.aborted || isAbortError(error)) {
        if (getSkillAuthoringAbortReason(controller.signal) === "cancel") {
          restoreSessionSnapshot(previousSession, answer);
        }
        return;
      }

      restoreSessionSnapshot(previousSession, answer);
      throw error;
    } finally {
      if (activeTurnRef.current?.requestId === requestId) {
        activeTurnRef.current = null;
      }
    }
  };

  return {
    session,
    setSession,
    readyForConfirmation: session.readyForConfirmation,
    applyStructuredDraft,
    hasRecoverableSession,
    resumeExistingSession,
    startFreshSession,
    cancelActiveTurn,
    appendMessage,
    submitAnswer,
  };
};
