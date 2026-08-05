"use client";

import { useCallback, useEffect, useState } from "react";
import {
  appendTenantUpdate,
  cancelMaintenanceRequest,
  resolveMaintenanceDetail,
} from "@/lib/portal/maintenance-detail-store";
import type {
  MaintenanceDetailLoadState,
  MaintenanceRequestDetail,
} from "@/lib/portal/maintenance-detail-types";

const LOAD_DELAY_MS = 350;

export function useMaintenanceRequestDetail(id: string) {
  const [state, setState] = useState<MaintenanceDetailLoadState>({
    status: "loading",
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setActionError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));
      const detail = resolveMaintenanceDetail(id);
      if (!detail) {
        setState({
          status: "empty",
          message:
            "We could not find that maintenance request. It may have expired from this demo session.",
        });
        return;
      }
      setState({ status: "success", detail });
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load this maintenance request.",
      });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDetail = useCallback((detail: MaintenanceRequestDetail) => {
    setState({ status: "success", detail });
  }, []);

  const addUpdate = useCallback(
    async (message: string) => {
      if (state.status !== "success") return false;
      const trimmed = message.trim();
      if (!trimmed) {
        setActionError("Enter an update before sending.");
        return false;
      }
      setBusy(true);
      setActionError(null);
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const next = appendTenantUpdate(state.detail, trimmed);
        setDetail(next);
        setActionMessage("Your update was added to this request.");
        window.setTimeout(() => setActionMessage(null), 3500);
        return true;
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Could not add update."
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [state, setDetail]
  );

  const cancelRequest = useCallback(async () => {
    if (state.status !== "success") return false;
    if (state.detail.status === "Cancelled") {
      setActionError("This request is already cancelled.");
      return false;
    }
    if (state.detail.status === "Completed") {
      setActionError("Completed requests cannot be cancelled.");
      return false;
    }
    setBusy(true);
    setActionError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const next = cancelMaintenanceRequest(state.detail);
      setDetail(next);
      setActionMessage("Request cancelled.");
      window.setTimeout(() => setActionMessage(null), 3500);
      return true;
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not cancel request."
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [state, setDetail]);

  return {
    state,
    actionMessage,
    actionError,
    busy,
    reload: load,
    addUpdate,
    cancelRequest,
  };
}
