import { useEffect, useRef, useState } from 'react';
import {
  type SkillAuthoringStructuredDraft,
} from '@api/skills';
import { isAbortError, streamSkillAuthoringTurn } from '@api/skills.stream';
import type {
  SkillAuthoringCreateScopeState,
  SkillAuthoringSessionMessage,
  SkillAuthoringSessionState,
} from '../types/skillsManagement.types';

const STORAGE_KEY = 'knowject:skills:create-authoring-session';

const EMPTY_SCOPE: SkillAuthoringCreateScopeState = {
  scenario: null,
  targets: [],
};

const SCOPE_INTRO_MESSAGE: SkillAuthoringSessionMessage = {
  id: 'assistant-scope-intro',
  role: 'assistant',
  content: '先从目标场景和涉及范围开始，我会基于这两个边界继续追问。',
};

const createEmptySessionState = (): SkillAuthoringSessionState => ({
  stage: 'scope_selecting',
  scope: EMPTY_SCOPE,
  messages: [SCOPE_INTRO_MESSAGE],
  questionCount: 0,
  currentSummary: '',
  structuredDraft: null,
  readyForConfirmation: false,
  pendingAnswer: '',
});

const isBrowser = () => typeof window !== 'undefined';

const isValidStage = (value: unknown): value is SkillAuthoringSessionState['stage'] =>
  value === 'scope_selecting' ||
  value === 'interviewing' ||
  value === 'synthesizing' ||
  value === 'awaiting_confirmation' ||
  value === 'hydrated';

const isValidScope = (value: unknown): value is SkillAuthoringCreateScopeState => {
  if (!value || typeof value !== 'object') return false;

  const scope = value as Partial<SkillAuthoringCreateScopeState>;
  const hasValidScenario =
    scope.scenario === null ||
    scope.scenario === undefined ||
    typeof scope.scenario === 'string';

  return hasValidScenario && Array.isArray(scope.targets);
};

const isValidMessages = (value: unknown): value is SkillAuthoringSessionMessage[] => {
  if (!Array.isArray(value)) return false;

  return value.every(
    (message) =>
      message &&
      typeof message === 'object' &&
      (message.role === 'assistant' || message.role === 'user') &&
      typeof message.content === 'string',
  );
};

const readSessionFromLocalStorage = (): SkillAuthoringSessionState => {
  if (!isBrowser()) return createEmptySessionState();

  const raw = localStorage.getItem('knowject:skills:create-authoring-session');
  if (!raw) return createEmptySessionState();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('invalid session payload');
    }

    const record = parsed as Partial<SkillAuthoringSessionState>;
    if (!isValidStage(record.stage)) {
      throw new Error('invalid session stage');
    }
    if (record.scope && !isValidScope(record.scope)) {
      throw new Error('invalid session scope');
    }
    if (record.messages && !isValidMessages(record.messages)) {
      throw new Error('invalid session messages');
    }

    return {
      ...createEmptySessionState(),
      stage: record.stage,
      scope: record.scope ?? EMPTY_SCOPE,
      messages: record.messages ?? [SCOPE_INTRO_MESSAGE],
      questionCount: record.questionCount ?? 0,
      currentSummary: record.currentSummary ?? '',
      structuredDraft: record.structuredDraft ?? null,
      readyForConfirmation: record.readyForConfirmation ?? false,
      pendingAnswer: record.pendingAnswer ?? '',
    };
  } catch (error) {
    console.warn('[useSkillAuthoringSession] localStorage 恢复失败，将回退为新会话:', error);
    localStorage.removeItem(STORAGE_KEY);
    return createEmptySessionState();
  }
};

const createMessageId = (): string => {
  if (!isBrowser()) return `${Date.now()}`;
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const hasRealProgress = (session: SkillAuthoringSessionState): boolean => {
  return Boolean(
    session.scope.scenario ||
      session.scope.targets.length > 0 ||
      session.messages.length > 1 ||
      session.questionCount > 0 ||
      session.currentSummary.trim() ||
      session.structuredDraft ||
      session.pendingAnswer.trim(),
  );
};

type SkillAuthoringAbortReason = 'cancel' | 'reset' | 'superseded' | 'unmount';

interface ActiveSkillAuthoringTurn {
  requestId: number;
  controller: AbortController;
}

const isSkillAuthoringAbortReason = (
  value: unknown,
): value is SkillAuthoringAbortReason => {
  return value === 'cancel' ||
    value === 'reset' ||
    value === 'superseded' ||
    value === 'unmount';
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

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('[useSkillAuthoringSession] localStorage 持久化失败:', error);
    }
  }, [session]);

  useEffect(() => {
    return () => {
      const activeTurn = activeTurnRef.current;
      if (activeTurn && !activeTurn.controller.signal.aborted) {
        activeTurn.controller.abort('unmount');
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
      readyForConfirmation: previousSession.readyForConfirmation,
      pendingAnswer: answer,
    }));
  };

  const applyStructuredDraft = (draft: SkillAuthoringStructuredDraft) => {
    setSession((current) => ({
      ...current,
      stage: 'hydrated',
      structuredDraft: draft,
      readyForConfirmation: true,
    }));
  };

  const hasRecoverableSession = () => {
    return hasRealProgress(session);
  };

  const resumeExistingSession = () => {
    if (!hasRecoverableSession()) {
      // Brand-new intro-only session stays in scope_selecting.
      if (session.stage !== 'scope_selecting') {
        setSession((current) => ({
          ...current,
          stage: 'scope_selecting',
        }));
      }
      return;
    }

    setSession((current) => ({
      ...current,
      stage:
        current.stage !== 'scope_selecting'
          ? current.stage
          : current.pendingAnswer.trim()
            ? 'synthesizing'
            : current.structuredDraft
              ? 'hydrated'
              : 'interviewing',
    }));
  };

  const startFreshSession = () => {
    abortActiveTurn('reset');
    if (isBrowser()) {
      localStorage.removeItem(STORAGE_KEY);
    }

    setSession(createEmptySessionState());
  };

  const resetSession = () => {
    startFreshSession();
  };

  const cancelActiveTurn = () => {
    abortActiveTurn('cancel');
  };

  const appendMessage = (message: Omit<SkillAuthoringSessionMessage, 'id'>) => {
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
    if (!session.scope.scenario) {
      throw new Error('authoring scope is not selected');
    }

    const previousSession = session;
    abortActiveTurn('superseded');

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
        role: 'user',
        content: answer,
      },
    ];

    setSession((current) => ({
      ...current,
      stage: 'synthesizing',
      pendingAnswer: answer,
      messages: nextMessages,
    }));

    try {
      const result = await streamSkillAuthoringTurn({
        scope: {
          scenario: session.scope.scenario,
          targets: session.scope.targets,
        },
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        questionCount: session.questionCount,
        currentSummary: session.currentSummary,
        currentStructuredDraft: session.structuredDraft,
      }, {
        signal: controller.signal,
      });

      if (
        activeTurnRef.current?.requestId !== requestId ||
        controller.signal.aborted
      ) {
        if (getSkillAuthoringAbortReason(controller.signal) === 'cancel') {
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
        readyForConfirmation: result.readyForConfirmation,
        pendingAnswer: '',
        messages: [
          ...current.messages,
          {
            id: createMessageId(),
            role: 'assistant',
            content: result.assistantMessage,
          },
          {
            id: createMessageId(),
            role: 'assistant',
            content: result.nextQuestion,
          },
        ],
      }));
    } catch (error) {
      const isStaleRequest = activeTurnRef.current?.requestId !== requestId;

      if (isStaleRequest || controller.signal.aborted || isAbortError(error)) {
        if (getSkillAuthoringAbortReason(controller.signal) === 'cancel') {
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
    resetSession,
    cancelActiveTurn,
    appendMessage,
    submitAnswer,
  };
};
