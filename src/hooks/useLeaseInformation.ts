"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  LeaseInformation,
  LeaseLoadState,
} from "@/lib/portal/lease-types";
import {
  emptyLeaseMessage,
  getLease,
  getLeaseDemoFixture,
} from "@/lib/portal/services/leaseService";

/**
 * Loads Current Tenant Portal lease information via the portal service layer.
 * Never surfaces private management notes.
 */
export function useLeaseInformation() {
  const [state, setState] = useState<LeaseLoadState>({ status: "loading" });

  const applyLease = useCallback(
    (lease: LeaseInformation | null, source: "live" | "mock") => {
      if (!lease) {
        setState({
          status: "empty",
          message: emptyLeaseMessage(),
        });
        return;
      }
      setState({ status: "success", lease, source });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const result = await getLease();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      applyLease(result.data, result.source);
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load your lease information.",
      });
    }
  }, [applyLease]);

  const loadDemoData = useCallback(() => {
    applyLease(getLeaseDemoFixture(), "mock");
  }, [applyLease]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load, loadDemoData };
}
