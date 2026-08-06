"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  MaintenanceDetailLoadState,
  MaintenanceRequestDetail,
} from "@/lib/portal/maintenance-detail-types";
import {
  addMaintenanceUpdate,
  cancelMaintenanceRequest,
  getMaintenanceRequest,
} from "@/lib/portal/services/maintenanceService";

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
      const result = await getMaintenanceRequest(id);
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      if (!result.data) {
        setState({
          status: "empty",
          message:
            "We could not find that maintenance request. It may have expired from this demo session.",
        });
        return;
      }
      setState({ status: "success", detail: result.data });
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
      if (busy) return false;
      if (state.status !== "success") return false;
      const trimmed = message.trim();
      if (!trimmed) {
        setActionError("Enter an update before sending.");
        return false;
      }
      if (trimmed.length < 3) {
        setActionError("Update must be at least 3 characters.");
        return false;
      }
      if (trimmed.length > 1000) {
        setActionError("Update must be 1000 characters or fewer.");
        return false;
      }
      setBusy(true);
      setActionError(null);
      try {
        const result = await addMaintenanceUpdate(state.detail.id, trimmed);
        if (!result.ok) {
          setActionError(result.error.message);
          return false;
        }
        setDetail(result.data);
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
    [state, setDetail, busy]
  );

  const cancelRequest = useCallback(async () => {
    if (busy) return false;
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
      const result = await cancelMaintenanceRequest(state.detail.id);
      if (!result.ok) {
        setActionError(result.error.message);
        return false;
      }
      setDetail(result.data);
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
  }, [state, setDetail, busy]);

  return {
    state,
    actionMessage,
    actionError,
    busy,
    reload: () => void load(),
    addUpdate,
    cancelRequest,
  };
}
