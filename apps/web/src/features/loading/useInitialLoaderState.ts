import { useCallback, useEffect, useRef, useState } from "react";

type InitialLoaderPhase = "active" | "exiting" | "done";

type UseInitialLoaderStateOptions = {
  minimumVisibleMs?: number;
};

export const useInitialLoaderState = (isLoading: boolean, { minimumVisibleMs = 900 }: UseInitialLoaderStateOptions = {}) => {
  const [phase, setPhase] = useState<InitialLoaderPhase>("active");
  const [hasObservedInitialLoad, setHasObservedInitialLoad] = useState(isLoading);
  const shownAtRef = useRef(Date.now());
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearExitTimer;
  }, [clearExitTimer]);

  useEffect(() => {
    if (phase !== "active") {
      return;
    }

    if (isLoading) {
      clearExitTimer();
      setHasObservedInitialLoad(true);
      return;
    }

    if (!hasObservedInitialLoad) {
      return;
    }

    const visibleForMs = Date.now() - shownAtRef.current;
    const remainingMs = Math.max(0, minimumVisibleMs - visibleForMs);

    if (remainingMs === 0) {
      setPhase("exiting");
      return;
    }

    clearExitTimer();
    exitTimerRef.current = setTimeout(() => {
      exitTimerRef.current = null;
      setPhase((currentPhase) => (currentPhase === "active" ? "exiting" : currentPhase));
    }, remainingMs);
  }, [clearExitTimer, hasObservedInitialLoad, isLoading, minimumVisibleMs, phase]);

  const completeInitialLoader = useCallback(() => {
    setPhase((currentPhase) => (currentPhase === "exiting" ? "done" : currentPhase));
  }, []);

  return {
    completeInitialLoader,
    initialLoaderActive: phase === "active",
    showInitialLoader: phase === "active" || phase === "exiting"
  };
};
