import { useEffect, useState } from 'react';
import {
  runSkillAuthoringTurn,
  type SkillAuthoringStructuredDraft,
} from '@api/skills';
import type {
  SkillAuthoringSessionMessage,
  SkillAuthoringSessionState,
} from '../types/skillsManagement.types';

const STORAGE_KEY = 'knowject:skills:create-authoring-session';

const createEmptySessionState = (): SkillAuthoringSessionState => ({
  stage: 'scope_selecting',
  scope: null,
  messages: [],
  questionCount: 0,
  currentSummary: '',
  structuredDraft: null,
  readyForConfirmation: false,
  pendingAnswer: null,
});

const isBrowser = () => typeof window !== 'undefined';

const isValidStage = (value: unknown): value is SkillAuthoringSessionState['stage'] =>
  value === 'scope_selecting' ||
  value === 'interviewing' ||
  value === 'synthesizing' ||
  value === 'awaiting_confirmation' ||
  value === 'hydrated';

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

    return {
      ...createEmptySessionState(),
      stage: record.stage,
      scope: record.scope ?? null,
      messages: record.messages ?? [],
      questionCount: record.questionCount ?? 0,
      currentSummary: record.currentSummary ?? '',
      structuredDraft: record.structuredDraft ?? null,
      readyForConfirmation: record.readyForConfirmation ?? false,
      pendingAnswer: record.pendingAnswer ?? null,
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

export const useSkillAuthoringSession = () => {
  const [session, setSession] = useState<SkillAuthoringSessionState>(() =>
    readSessionFromLocalStorage(),
  );

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('[useSkillAuthoringSession] localStorage 持久化失败:', error);
    }
  }, [session]);

  const applyStructuredDraft = (
    structuredDraft: SkillAuthoringStructuredDraft | null,
    readyForConfirmation: boolean,
  ) => {
    setSession((current) => ({
      ...current,
      structuredDraft,
      readyForConfirmation,
      stage: readyForConfirmation ? 'awaiting_confirmation' : 'hydrated',
    }));
  };

  const hasRecoverableSession = () => {
    return (
      session.stage !== 'scope_selecting' ||
      Boolean(session.scope) ||
      session.messages.length > 0 ||
      Boolean(session.structuredDraft)
    );
  };

  const resumeExistingSession = () => {
    if (!hasRecoverableSession()) return;

    setSession((current) => ({
      ...current,
      stage:
        current.stage !== 'scope_selecting'
          ? current.stage
          : current.scope
            ? current.structuredDraft
              ? 'hydrated'
              : 'interviewing'
            : current.stage,
    }));
  };

  const startFreshSession = () => {
    if (isBrowser()) {
      localStorage.removeItem(STORAGE_KEY);
    }

    setSession(createEmptySessionState());
  };

  const resetSession = () => {
    startFreshSession();
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
    if (!session.scope) {
      throw new Error('authoring scope is not selected');
    }

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

    const result = await runSkillAuthoringTurn({
      scope: session.scope,
      messages: nextMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      questionCount: session.questionCount,
      currentSummary: session.currentSummary,
      currentStructuredDraft: session.structuredDraft,
    });

    setSession((current) => ({
      ...current,
      stage: result.stage,
      questionCount: result.questionCount,
      currentSummary: result.currentSummary,
      structuredDraft: result.structuredDraft,
      readyForConfirmation: result.readyForConfirmation,
      pendingAnswer: null,
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
    appendMessage,
    submitAnswer,
  };
};
