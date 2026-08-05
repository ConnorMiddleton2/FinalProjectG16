"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getEmptyTenantDashboard,
  getMockTenantDashboard,
} from "@/lib/portal/dashboard-mock";
import type {
  DashboardLoadState,
  TenantDashboardData,
} from "@/lib/portal/dashboard-types";

const LOAD_DELAY_MS = 450;

function isDashboardEmpty(data: TenantDashboardData) {
  return (
    !data.lease &&
    !data.upcomingPayment &&
    data.recentPayments.length === 0 &&
    data.activeMaintenance.length === 0 &&
    data.announcements.length === 0
  );
}

/**
 * Loads Current Tenant Dashboard data.
 * Uses isolated mock data when live tenant dashboard data is unavailable.
 */
export function useTenantDashboard() {
  const [state, setState] = useState<DashboardLoadState>({ status: "loading" });

  const applyData = useCallback(
    (data: TenantDashboardData, source: "live" | "mock") => {
      if (isDashboardEmpty(data)) {
        setState({
          status: "empty",
          message:
            "No current-tenant activity yet. Once your lease is linked, rent, maintenance, and announcements will show here.",
        });
        return;
      }
      setState({ status: "success", data, source });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });

    try {
      await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));
      const live = await tryLoadLiveDashboard();
      if (live === "empty") {
        applyData(getEmptyTenantDashboard(), "live");
        return;
      }
      if (live) {
        applyData(live, "live");
        return;
      }
      applyData(getMockTenantDashboard(), "mock");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not load your tenant dashboard.";
      setState({ status: "error", message });
    }
  }, [applyData]);

  const loadDemoData = useCallback(() => {
    applyData(getMockTenantDashboard(), "mock");
  }, [applyData]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));
        if (cancelled) return;

        const live = await tryLoadLiveDashboard();
        if (cancelled) return;

        if (live === "empty") {
          applyData(getEmptyTenantDashboard(), "live");
          return;
        }
        if (live) {
          applyData(live, "live");
          return;
        }
        applyData(getMockTenantDashboard(), "mock");
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "Could not load your tenant dashboard.";
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyData]);

  return { state, reload: load, loadDemoData };
}

async function tryLoadLiveDashboard(): Promise<
  TenantDashboardData | "empty" | null
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-supabase") || key === "REPLACE_ME") {
    return null;
  }

  // No dedicated current-tenant dashboard collection yet.
  // Returning null triggers isolated mock data.
  return null;
}
