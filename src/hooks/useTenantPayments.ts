"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getPortalTenantSessionClient } from "@/lib/portal/auth-client";
import type {
  PaymentsFilters,
  PaymentsLoadState,
  PaymentsOverview,
  PaymentTransaction,
} from "@/lib/portal/payments-types";
import { sessionOwnsDemoFixtures } from "@/lib/portal/tenant-scope";
import {
  getEmptyPaymentsOverviewFixture,
  getPaymentsOverview,
  getPaymentsOverviewDemoFixture,
} from "@/lib/portal/services/paymentService";

const DEFAULT_FILTERS: PaymentsFilters = {
  dateRange: "all",
  customFrom: "",
  customTo: "",
  status: "all",
  type: "all",
};

function isPaymentsEmpty(data: PaymentsOverview) {
  return (
    data.transactions.length === 0 &&
    data.amountDue === "$0.00" &&
    !data.savedMethod
  );
}

function inDateRange(
  txn: PaymentTransaction,
  filters: PaymentsFilters,
  today: Date
) {
  if (filters.dateRange === "all") return true;

  const txnDate = new Date(`${txn.date}T12:00:00`);
  if (Number.isNaN(txnDate.getTime())) return true;

  if (filters.dateRange === "custom") {
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
  if (filters.dateRange === "30d") {
    start.setDate(start.getDate() - 30);
  } else if (filters.dateRange === "90d") {
    start.setDate(start.getDate() - 90);
  } else if (filters.dateRange === "ytd") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return txnDate >= start && txnDate <= today;
}

export function filterTransactions(
  transactions: PaymentTransaction[],
  filters: PaymentsFilters,
  today = new Date("2026-04-30T12:00:00")
) {
  return transactions.filter((txn) => {
    if (filters.status !== "all" && txn.status !== filters.status) return false;
    if (filters.type !== "all" && txn.type !== filters.type) return false;
    return inDateRange(txn, filters, today);
  });
}

export function useTenantPayments() {
  const [state, setState] = useState<PaymentsLoadState>({ status: "loading" });
  const [filters, setFilters] = useState<PaymentsFilters>(DEFAULT_FILTERS);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const applyData = useCallback(
    (data: PaymentsOverview, source: "live" | "mock") => {
      if (isPaymentsEmpty(data)) {
        setState({
          status: "empty",
          message:
            "No payment activity yet. When charges post to your lease, balances and transactions will appear here.",
        });
        return;
      }
      setState({ status: "success", data, source });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setSuccessMessage(null);
    try {
      const result = await getPaymentsOverview();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      applyData(result.data, result.source);
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load payment information.",
      });
    }
  }, [applyData]);

  const loadDemoData = useCallback(() => {
    void (async () => {
      const session = await getPortalTenantSessionClient();
      if (!session || !sessionOwnsDemoFixtures(session)) {
        void load();
        return;
      }
      applyData(getPaymentsOverviewDemoFixture(), "mock");
    })();
  }, [applyData, load]);

  const loadEmptyDemo = useCallback(() => {
    void (async () => {
      const session = await getPortalTenantSessionClient();
      if (!session || !sessionOwnsDemoFixtures(session)) {
        void load();
        return;
      }
      applyData(getEmptyPaymentsOverviewFixture(), "mock");
    })();
  }, [applyData, load]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTransactions = useMemo(() => {
    if (state.status !== "success") return [];
    return filterTransactions(state.data.transactions, filters);
  }, [state, filters]);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 4000);
  }, []);

  const updateFilters = useCallback((patch: Partial<PaymentsFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    state,
    filters,
    filteredTransactions,
    successMessage,
    reload: load,
    loadDemoData,
    loadEmptyDemo,
    updateFilters,
    resetFilters,
    showSuccess,
  };
}
