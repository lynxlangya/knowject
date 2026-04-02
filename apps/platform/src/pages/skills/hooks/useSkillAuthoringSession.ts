import { useEffect, useMemo, useState } from 'react';
import {
  runSkillAuthoringTurn,
  type SkillAuthoringTurnDraft,
} from '@api/skills';
import type { SkillAuthoringSessionState } from '../types/skillsManagement.types';

const STORAGE_KEY = 'knowject:skills:create-authoring-session';

const createEmptySessionState = (): SkillAuthoringSessionState => ({
  stage: 'scope_selecting',
  draft: null,
});

const isBrowser = () => typeof window !== 'undefined';

const isValidStage = (value: unknown): value is SkillAuthoringSessionState['stage'] =>
  value === 'scope_selecting' ||
  value === 'drafting' ||
  value === 'confirming' ||
  value === 'synthesizing';

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
      draft: record.draft ?? null,
    };
  } catch (error) {
    console.warn('[useSkillAuthoringSession] localStorage 恢复失败，将回退为新会话:', error);
    localStorage.removeItem(STORAGE_KEY);
    return createEmptySessionState();
  }
};

export const useSkillAuthoringSession = () => {
  const [session, setSession] = useState<SkillAuthoringSessionState>(() =>
    readSessionFromLocalStorage(),
  );

  const readyForConfirmation = useMemo(() => {
    return Boolean(
      session.draft?.name &&
        session.draft?.description &&
        session.draft?.category &&
        session.draft?.owner,
    );
  }, [session.draft]);

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('[useSkillAuthoringSession] localStorage 持久化失败:', error);
    }
  }, [session]);

  const applyStructuredDraft = (draft: SkillAuthoringTurnDraft) => {
    const nextReadyForConfirmation = Boolean(
      draft?.name && draft?.description && draft?.category && draft?.owner,
    );

    setSession((current) => ({
      ...current,
      draft,
      stage: nextReadyForConfirmation ? 'confirming' : 'drafting',
    }));
  };

  const hasRecoverableSession = () => {
    return session.stage !== 'scope_selecting' || Boolean(session.draft);
  };

  const resumeExistingSession = () => {
    if (!hasRecoverableSession()) return;

    setSession((current) => ({
      ...current,
      stage: current.draft ? 'confirming' : current.stage,
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

  const submitAnswer = async (answer: string) => {
    const draftSnapshot = session.draft;

    setSession((current) => ({
      ...current,
      stage: 'synthesizing',
    }));

    const result = await runSkillAuthoringTurn({
      answer,
      draft: draftSnapshot,
    });

    applyStructuredDraft(result.draft);
  };

  return {
    session,
    setSession,
    readyForConfirmation,
    applyStructuredDraft,
    hasRecoverableSession,
    resumeExistingSession,
    startFreshSession,
    resetSession,
    submitAnswer,
  };
};
