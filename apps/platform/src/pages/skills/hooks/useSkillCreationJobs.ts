import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractApiErrorMessage } from "@api/error";
import {
  createSkillCreationJob,
  getSkillCreationJob,
  listSkillCreationJobs,
  type CreateSkillCreationJobRequest,
  type SkillCreationJobResponse,
} from "@api/skills";
import { tp } from "../skills.i18n";

const DEFAULT_POLLING_INTERVAL_MS = 1500;
const DEFAULT_MAX_POLLING_ATTEMPTS = 20;

const hasInFlightCreationJobs = (
  items: SkillCreationJobResponse[],
): boolean => {
  return items.some(
    (item) => item.status === "queued" || item.status === "generating",
  );
};

export const useSkillCreationJobs = (options?: {
  pollingIntervalMs?: number;
  maxPollingAttempts?: number;
}) => {
  const pollingIntervalMs =
    options?.pollingIntervalMs ?? DEFAULT_POLLING_INTERVAL_MS;
  const maxPollingAttempts =
    options?.maxPollingAttempts ?? DEFAULT_MAX_POLLING_ATTEMPTS;
  const pollingAttemptsRef = useRef(0);
  const [items, setItems] = useState<SkillCreationJobResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<SkillCreationJobResponse | null>(null);
  const [activeJobLoading, setActiveJobLoading] = useState(false);

  const refresh = useCallback(() => {
    pollingAttemptsRef.current = 0;
    setReloadToken((value) => value + 1);
  }, []);

  const loadJobDetail = useCallback(async (jobId: string) => {
    setActiveJobLoading(true);

    try {
      const result = await getSkillCreationJob(jobId);
      setActiveJob(result.job);
      setItems((current) =>
        current.map((item) => (item.id === result.job.id ? result.job : item)),
      );
    } catch (currentError) {
      setError(
        extractApiErrorMessage(currentError, tp("creation.jobs.feedback.loadFailed")),
      );
    } finally {
      setActiveJobLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      setLoading(true);

      try {
        const result = await listSkillCreationJobs();

        if (cancelled) {
          return;
        }

        setItems(result.items);
        setError(null);
        if (activeJobId) {
          const matchedJob = result.items.find((item) => item.id === activeJobId) ?? null;
          setActiveJob(matchedJob);
        }
      } catch (currentError) {
        if (cancelled) {
          return;
        }

        setError(
          extractApiErrorMessage(currentError, tp("creation.jobs.feedback.loadFailed")),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, [activeJobId, reloadToken]);

  const shouldPoll = useMemo(() => hasInFlightCreationJobs(items), [items]);
  const pollingStopped = shouldPoll && pollingAttemptsRef.current >= maxPollingAttempts;

  useEffect(() => {
    if (!shouldPoll || loading || pollingStopped) {
      if (!shouldPoll) {
        pollingAttemptsRef.current = 0;
      }
      return;
    }

    const attempts = pollingAttemptsRef.current;
    const timer = window.setTimeout(() => {
      pollingAttemptsRef.current = attempts + 1;
      setReloadToken((value) => value + 1);
    }, pollingIntervalMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, maxPollingAttempts, pollingIntervalMs, pollingStopped, shouldPoll]);

  const submitCreateJob = useCallback(
    async (payload: CreateSkillCreationJobRequest) => {
      const result = await createSkillCreationJob(payload);
      setItems((current) => [result.job, ...current.filter((item) => item.id !== result.job.id)]);
      setError(null);
      pollingAttemptsRef.current = 0;
      return result.job;
    },
    [],
  );

  const openDrawer = useCallback(
    (jobId: string) => {
      setDrawerOpen(true);
      setActiveJobId(jobId);
      void loadJobDetail(jobId);
    },
    [loadJobDetail],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setActiveJobId(null);
    setActiveJob(null);
  }, []);

  const mergeJob = useCallback((job: SkillCreationJobResponse) => {
    setActiveJob(job);
    setItems((current) => current.map((item) => (item.id === job.id ? job : item)));
  }, []);

  return {
    items,
    loading,
    error,
    shouldPoll,
    pollingStopped,
    activeJobId,
    activeJob,
    activeJobLoading,
    drawerOpen,
    refresh,
    submitCreateJob,
    openDrawer,
    closeDrawer,
    loadJobDetail,
    mergeJob,
  };
};

