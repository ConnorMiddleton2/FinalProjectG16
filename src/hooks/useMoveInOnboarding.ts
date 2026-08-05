"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isMoveInOnboardingComplete,
  readMoveInOnboarding,
  toggleMoveInTask,
  writeMoveInOnboarding,
  type MoveInOnboarding,
  type MoveInTaskId,
} from "@/lib/move-in-onboarding";

export function useMoveInOnboarding() {
  const [onboarding, setOnboarding] = useState<MoveInOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    try {
      setOnboarding(readMoveInOnboarding());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load move-in onboarding in this browser."
      );
      setOnboarding(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const setTaskCompleted = useCallback(
    (taskId: MoveInTaskId, completed: boolean) => {
      if (!onboarding) return;
      const next = toggleMoveInTask(onboarding, taskId, completed);
      writeMoveInOnboarding(next);
      setOnboarding(next);
    },
    [onboarding]
  );

  return {
    onboarding,
    loading,
    error,
    refresh,
    setTaskCompleted,
    isComplete: onboarding ? isMoveInOnboardingComplete(onboarding) : false,
  };
}
