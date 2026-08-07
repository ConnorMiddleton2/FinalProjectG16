"use client";

import { useCallback, useState } from "react";
import type {
  WorkOrderCategory,
  WorkOrderPriority,
} from "@/lib/maintenance";
import { createMaintenanceRequest } from "@/lib/portal/services/maintenanceService";

export type PortalWorkOrderFormValues = {
  title: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  description: string;
};

const EMPTY: PortalWorkOrderFormValues = {
  title: "",
  category: "general",
  priority: "normal",
  description: "",
};

/**
 * Legacy hook kept for any remaining callers.
 * Prefer MaintenanceRequestForm which posts directly to the work-order ledger.
 */
export function useMaintenanceForm(
  defaults?: Partial<PortalWorkOrderFormValues>
) {
  const [values, setValues] = useState<PortalWorkOrderFormValues>(() => ({
    ...EMPTY,
    ...defaults,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string;
    requestNumber: string;
    submittedAt: string;
  } | null>(null);

  const updateField = useCallback(
    <K extends keyof PortalWorkOrderFormValues>(
      key: K,
      value: PortalWorkOrderFormValues[K]
    ) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors({});
      setSubmitError(null);
    },
    []
  );

  const submit = useCallback(async () => {
    if (submitting) return false;
    if (!values.title.trim() || !values.description.trim()) {
      setSubmitError("Title and description are required.");
      return false;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createMaintenanceRequest(values);
      if (!res.ok) {
        setSubmitError(res.error.message);
        return false;
      }
      setResult({
        id: res.data.id,
        requestNumber: res.data.requestNumber,
        submittedAt: res.data.submittedAt,
      });
      return true;
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Could not submit the maintenance request."
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [values, submitting]);

  const reset = useCallback(() => {
    setValues(EMPTY);
    setErrors({});
    setSubmitError(null);
    setResult(null);
    setSubmitting(false);
  }, []);

  return {
    values,
    errors,
    submitting,
    submitError,
    result,
    updateField,
    addAttachments: () => undefined,
    removeAttachment: () => undefined,
    submit,
    reset,
  };
}
