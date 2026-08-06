"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  PaymentHistoryFilters,
  PaymentHistoryLoadState,
  PaymentHistoryRecord,
  PaymentHistorySortKey,
  SortDirection,
} from "@/lib/portal/payment-history-types";
import { getPaymentHistory } from "@/lib/portal/services/paymentService";

const DEFAULT_PAGE_SIZE = 5;

const DEFAULT_FILTERS: PaymentHistoryFilters = {
  search: "",
  status: "all",
  dateFilter: "all",
  customFrom: "",
  customTo: "",
  sortKey: "date",
  sortDirection: "desc",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/** Fixed "today" for stable demo date filters. */
const DEMO_TODAY = new Date("2026-04-30T12:00:00");

function inDateFilter(
  record: PaymentHistoryRecord,
  filters: PaymentHistoryFilters,
  today: Date
) {
  const txnDate = new Date(`${record.date}T12:00:00`);
  if (Number.isNaN(txnDate.getTime())) return true;

  if (filters.dateFilter === "all") return true;

  if (filters.dateFilter === "custom") {
    if (filters.customFrom) {
      const from = new Date(`${filters.customFrom}T00:00:00`);
      if (txnDate < from) return false;
    }
    if (filters.customTo) {
      const to = new Date(`${filters.customTo}T23:59:59`);
      if (txnDate > to) return false;
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
  return txnDate >= start && txnDate <= today;
}

function compareRecords(
  a: PaymentHistoryRecord,
  b: PaymentHistoryRecord,
  key: PaymentHistorySortKey,
  direction: SortDirection
) {
  const dir = direction === "asc" ? 1 : -1;
  switch (key) {
    case "amount":
      return (a.amount - b.amount) * dir;
    case "status":
      return a.status.localeCompare(b.status) * dir;
    case "description":
      return a.description.localeCompare(b.description) * dir;
    case "date":
    default:
      return a.date.localeCompare(b.date) * dir;
  }
}

export function usePaymentHistory() {
  const [state, setState] = useState<PaymentHistoryLoadState>({
    status: "loading",
  });
  const [filters, setFilters] = useState<PaymentHistoryFilters>(DEFAULT_FILTERS);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const applyRecords = useCallback(
    (records: PaymentHistoryRecord[], source: "live" | "mock") => {
      if (records.length === 0) {
        setState({
          status: "empty",
          message:
            "No payment history yet. Completed and attempted payments will appear here.",
        });
        return;
      }
      setState({ status: "success", records, source });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setSuccessMessage(null);
    try {
      const result = await getPaymentHistory();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      applyRecords(result.data, result.source);
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load payment history.",
      });
    }
  }, [applyRecords]);

  const loadDemoData = useCallback(() => {
    void (async () => {
      const result = await getPaymentHistory();
      if (result.ok) applyRecords(result.data, "mock");
    })();
  }, [applyRecords]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSorted = useMemo(() => {
    if (state.status !== "success") return [];
    const q = filters.search.trim().toLowerCase();
    return state.records
      .filter((record) => {
        if (filters.status !== "all" && record.status !== filters.status) {
          return false;
        }
        if (!inDateFilter(record, filters, DEMO_TODAY)) return false;
        if (!q) return true;
        return (
          record.description.toLowerCase().includes(q) ||
          record.confirmationNumber.toLowerCase().includes(q) ||
          record.methodSummary.toLowerCase().includes(q) ||
          record.status.toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        compareRecords(a, b, filters.sortKey, filters.sortDirection)
      );
  }, [state, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSorted.length / filters.pageSize)
  );
  const safePage = Math.min(filters.page, totalPages);

  const pageRecords = useMemo(() => {
    const start = (safePage - 1) * filters.pageSize;
    return filteredSorted.slice(start, start + filters.pageSize);
  }, [filteredSorted, safePage, filters.pageSize]);

  const hasMore = filteredSorted.length > filters.pageSize;

  const updateFilters = useCallback(
    (patch: Partial<PaymentHistoryFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        // Reset to first page when search/filter/sort changes (unless page itself changed).
        if (
          patch.page === undefined &&
          (patch.search !== undefined ||
            patch.status !== undefined ||
            patch.dateFilter !== undefined ||
            patch.customFrom !== undefined ||
            patch.customTo !== undefined ||
            patch.sortKey !== undefined ||
            patch.sortDirection !== undefined ||
            patch.pageSize !== undefined)
        ) {
          next.page = 1;
        }
        return next;
      });
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const loadMore = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      pageSize: prev.pageSize + DEFAULT_PAGE_SIZE,
    }));
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 4000);
  }, []);

  return {
    state,
    filters,
    filteredCount: filteredSorted.length,
    pageRecords,
    totalPages,
    safePage,
    hasMore,
    successMessage,
    reload: load,
    loadDemoData,
    updateFilters,
    resetFilters,
    loadMore,
    showSuccess,
  };
}
