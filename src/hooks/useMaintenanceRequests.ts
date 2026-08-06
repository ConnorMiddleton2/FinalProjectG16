"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MaintenanceFilters,
  MaintenanceLoadState,
  MaintenanceRequest,
  MaintenanceRequestStatus,
} from "@/lib/portal/maintenance-types";
import { MAINTENANCE_STATUSES } from "@/lib/portal/maintenance-types";
import {
  getMaintenanceRequestsDemoFixture,
  listMaintenanceRequests,
} from "@/lib/portal/services/maintenanceService";

const DEMO_TODAY = new Date("2026-04-30T12:00:00");

const DEFAULT_FILTERS: MaintenanceFilters = {
  status: "all",
  priority: "all",
  category: "all",
  dateFilter: "all",
  customFrom: "",
  customTo: "",
};

function inDateFilter(
  request: MaintenanceRequest,
  filters: MaintenanceFilters,
  today: Date
) {
  const submitted = new Date(`${request.submittedOn}T12:00:00`);
  if (Number.isNaN(submitted.getTime())) return true;
  if (filters.dateFilter === "all") return true;

  if (filters.dateFilter === "custom") {
    if (filters.customFrom) {
      const from = new Date(`${filters.customFrom}T00:00:00`);
      if (submitted < from) return false;
    }
    if (filters.customTo) {
      const to = new Date(`${filters.customTo}T23:59:59`);
      if (submitted > to) return false;
    }
    return true;
  }

  const start = new Date(today);
  if (filters.dateFilter === "30d") start.setDate(start.getDate() - 30);
  else if (filters.dateFilter === "90d") start.setDate(start.getDate() - 90);
  else if (filters.dateFilter === "ytd") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return submitted >= start && submitted <= today;
}

export function useMaintenanceRequests() {
  const [state, setState] = useState<MaintenanceLoadState>({
    status: "loading",
  });
  const [filters, setFilters] = useState<MaintenanceFilters>(DEFAULT_FILTERS);

  const applyRequests = useCallback(
    (requests: MaintenanceRequest[], source: "live" | "mock") => {
      if (requests.length === 0) {
        setState({
          status: "empty",
          message:
            "You have no maintenance requests yet. Submit one when something needs attention in your space.",
        });
        return;
      }
      setState({ status: "success", requests, source });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const result = await listMaintenanceRequests();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      applyRequests(result.data, result.source);
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load maintenance requests.",
      });
    }
  }, [applyRequests]);

  const loadDemoData = useCallback(() => {
    applyRequests(getMaintenanceRequestsDemoFixture(), "mock");
  }, [applyRequests]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (state.status !== "success") return [];
    return state.requests
      .filter((request) => {
        if (filters.status !== "all" && request.status !== filters.status) {
          return false;
        }
        if (
          filters.priority !== "all" &&
          request.priority !== filters.priority
        ) {
          return false;
        }
        if (
          filters.category !== "all" &&
          request.category !== filters.category
        ) {
          return false;
        }
        return inDateFilter(request, filters, DEMO_TODAY);
      })
      .sort((a, b) => b.submittedOn.localeCompare(a.submittedOn));
  }, [state, filters]);

  const grouped = useMemo(() => {
    const buckets: Record<MaintenanceRequestStatus, MaintenanceRequest[]> = {
      Open: [],
      Scheduled: [],
      Completed: [],
      Cancelled: [],
    };
    for (const request of filtered) {
      buckets[request.status].push(request);
    }
    return buckets;
  }, [filtered]);

  const counts = useMemo(() => {
    const next: Record<MaintenanceRequestStatus, number> = {
      Open: 0,
      Scheduled: 0,
      Completed: 0,
      Cancelled: 0,
    };
    for (const status of MAINTENANCE_STATUSES) {
      next[status] = grouped[status].length;
    }
    return next;
  }, [grouped]);

  const updateFilters = useCallback((patch: Partial<MaintenanceFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    state,
    filters,
    filtered,
    grouped,
    counts,
    reload: load,
    loadDemoData,
    updateFilters,
    resetFilters,
  };
}
