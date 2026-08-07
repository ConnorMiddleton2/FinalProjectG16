"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  DashboardLoadState,
  TenantDashboardData,
} from "@/lib/portal/dashboard-types";
import {
  getDashboard,
  getEmptyDashboardFixture,
} from "@/lib/portal/services/dashboardService";

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
 * Loads Current Tenant Dashboard data via the portal service layer.
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
      const result = await getDashboard();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      if (result.source === "live" && isDashboardEmpty(result.data)) {
        applyData(getEmptyDashboardFixture(), "live");
        return;
      }
      applyData(result.data, result.source);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not load your tenant dashboard.";
      setState({ status: "error", message });
    }
  }, [applyData]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
