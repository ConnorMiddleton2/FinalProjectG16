"use client";

import { useCallback, useEffect, useState } from "react";
import { getMockLeaseInformation } from "@/lib/portal/lease-mock";
import type {
  LeaseInformation,
  LeaseLoadState,
} from "@/lib/portal/lease-types";

const LOAD_DELAY_MS = 400;

/**
 * Loads Current Tenant Portal lease information.
 * Uses isolated mock data when live lease data is unavailable.
 * Never surfaces private management notes.
 */
export function useLeaseInformation() {
  const [state, setState] = useState<LeaseLoadState>({ status: "loading" });

  const applyLease = useCallback(
    (lease: LeaseInformation | null, source: "live" | "mock") => {
      if (!lease) {
        setState({
          status: "empty",
          message:
            "No active lease is linked to this portal account yet. When Harborline connects your lease, terms and unit details will appear here.",
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
      await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));
      const live = await tryLoadLiveLease();
      if (live === "empty") {
        applyLease(null, "live");
        return;
      }
      if (live) {
        applyLease(live, "live");
        return;
      }
      applyLease(getMockLeaseInformation(), "mock");
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
    applyLease(getMockLeaseInformation(), "mock");
  }, [applyLease]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load, loadDemoData };
}

/**
 * Placeholder for a future live lease API.
 * Returns null so the hook falls back to isolated mock data.
 */
async function tryLoadLiveLease(): Promise<
  LeaseInformation | "empty" | null
> {
  return null;
}
