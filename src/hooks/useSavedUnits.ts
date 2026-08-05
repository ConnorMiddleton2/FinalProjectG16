"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readSavedUnitIds,
  writeSavedUnitIds,
} from "@/lib/saved-units";

export function useSavedUnits() {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    try {
      setIds(readSavedUnitIds());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load saved units from this browser."
      );
      setIds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer localStorage hydration until after mount (client-only).
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const persist = useCallback((next: string[]) => {
    try {
      writeSavedUnitIds(next);
      setIds(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update saved units in this browser."
      );
    }
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const save = useCallback(
    (id: string) => {
      if (ids.includes(id)) return;
      persist([id, ...ids]);
    },
    [ids, persist]
  );

  const remove = useCallback(
    (id: string) => {
      persist(ids.filter((item) => item !== id));
    },
    [ids, persist]
  );

  const toggle = useCallback(
    (id: string) => {
      if (ids.includes(id)) remove(id);
      else save(id);
    },
    [ids, remove, save]
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  return {
    ids,
    loading,
    error,
    refresh,
    isSaved,
    save,
    remove,
    toggle,
    clear,
  };
}
