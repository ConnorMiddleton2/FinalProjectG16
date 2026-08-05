"use client";

import { useCallback, useState } from "react";
import {
  attachmentMetaFromFile,
  EMPTY_MAINTENANCE_FORM,
  isAllowedAttachment,
  MAX_ATTACHMENTS,
  validateMaintenanceForm,
} from "@/lib/portal/maintenance-form-validation";
import {
  createDetailFromSubmission,
  upsertStoredMaintenanceDetail,
} from "@/lib/portal/maintenance-detail-store";
import type { MaintenanceAttachmentMeta } from "@/lib/portal/maintenance-types";
import type {
  MaintenanceFormErrors,
  MaintenanceFormValues,
  MaintenanceSubmissionResult,
} from "@/lib/portal/maintenance-types";

export function useMaintenanceForm() {
  const [values, setValues] = useState<MaintenanceFormValues>(
    EMPTY_MAINTENANCE_FORM
  );
  const [errors, setErrors] = useState<MaintenanceFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<MaintenanceSubmissionResult | null>(
    null
  );

  const updateField = useCallback(
    <K extends keyof MaintenanceFormValues>(
      key: K,
      value: MaintenanceFormValues[K]
    ) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key] && !prev.form) return prev;
        const next = { ...prev };
        delete next[key];
        delete next.form;
        return next;
      });
      setSubmitError(null);
    },
    []
  );

  const addAttachments = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setSubmitError(null);

    const incoming = Array.from(fileList);
    const nextErrors: MaintenanceFormErrors = {};
    const accepted: MaintenanceAttachmentMeta[] = [];

    for (const file of incoming) {
      const problem = isAllowedAttachment(file);
      if (problem) {
        nextErrors.attachments = problem;
        continue;
      }
      accepted.push(attachmentMetaFromFile(file));
    }

    setValues((prev) => {
      const merged = [...prev.attachments, ...accepted].slice(
        0,
        MAX_ATTACHMENTS
      );
      if (prev.attachments.length + accepted.length > MAX_ATTACHMENTS) {
        nextErrors.attachments = `You can upload up to ${MAX_ATTACHMENTS} files.`;
      }
      return { ...prev, attachments: merged };
    });
    setErrors((prev) => ({ ...prev, ...nextErrors }));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setValues((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((file) => file.id !== id),
    }));
    setErrors((prev) => {
      if (!prev.attachments) return prev;
      const next = { ...prev };
      delete next.attachments;
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    const nextErrors = validateMaintenanceForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmitError("Fix the highlighted fields before submitting.");
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Isolated mock submit — no live work-order API in this portal scope.
      await new Promise((resolve) => setTimeout(resolve, 900));
      const submittedAt = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const requestNumber = `MR-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const id = `maint-${crypto.randomUUID().slice(0, 8)}`;
      const result: MaintenanceSubmissionResult = {
        id,
        requestNumber,
        submittedAt,
        values,
      };
      upsertStoredMaintenanceDetail(
        createDetailFromSubmission({ id, result })
      );
      setResult(result);
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
  }, [values]);

  const reset = useCallback(() => {
    setValues(EMPTY_MAINTENANCE_FORM);
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
    addAttachments,
    removeAttachment,
    submit,
    reset,
  };
}
