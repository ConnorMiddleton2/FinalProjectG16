"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readApplicantProfile } from "@/lib/applicant-profile";
import {
  clearRentalApplicationDraft,
  createConfirmationNumber,
  emptyRentalApplicationDraft,
  prefillFromProfile,
  readRentalApplicationDraft,
  writeFullSubmittedApplication,
  writeRentalApplicationDraft,
  writeSubmittedApplication,
  type RentalApplicationDraft,
} from "@/lib/rental-application";

export function useRentalApplicationDraft(initialUnitId = "") {
  const [draft, setDraft] = useState<RentalApplicationDraft>(() =>
    emptyRentalApplicationDraft(initialUnitId)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const skipNextAutosave = useRef(true);

  const refresh = useCallback(() => {
    setError(null);
    try {
      const existing = readRentalApplicationDraft();
      const profile = readApplicantProfile();
      if (existing && existing.status === "draft") {
        setDraft(prefillFromProfile(existing, profile));
      } else {
        setDraft(
          prefillFromProfile(emptyRentalApplicationDraft(initialUnitId), profile)
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load application draft."
      );
      setDraft(emptyRentalApplicationDraft(initialUnitId));
    } finally {
      setLoading(false);
      skipNextAutosave.current = true;
    }
  }, [initialUnitId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (loading || draft.status === "submitted") return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }

    setAutosaveStatus("saving");
    const timer = window.setTimeout(() => {
      try {
        writeRentalApplicationDraft(draft);
        setAutosaveStatus("saved");
      } catch {
        setAutosaveStatus("error");
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [draft, loading]);

  const updateDraft = useCallback(
    (updater: (current: RentalApplicationDraft) => RentalApplicationDraft) => {
      setDraft((current) => updater(current));
    },
    []
  );

  const saveNow = useCallback(() => {
    try {
      writeRentalApplicationDraft(draft);
      setAutosaveStatus("saved");
      setError(null);
      return true;
    } catch (err) {
      setAutosaveStatus("error");
      setError(
        err instanceof Error ? err.message : "Could not save application draft."
      );
      return false;
    }
  }, [draft]);

  const submit = useCallback(() => {
    const confirmationNumber = createConfirmationNumber();
    const submittedAt = new Date().toISOString();
    const submitted: RentalApplicationDraft = {
      ...draft,
      status: "submitted",
      confirmationNumber,
      submittedAt,
      stepIndex: 15,
      feePaymentReference:
        draft.feePaymentReference ||
        (draft.feeReceiptId
          ? `MOCK-PAY-${draft.feeReceiptId}`
          : `MOCK-${confirmationNumber}`),
    };

    writeSubmittedApplication({
      confirmationNumber,
      applicationId: submitted.id,
      property: submitted.property,
      floorPlan: submitted.floorPlan,
      submittedAt,
      applicantFullName: submitted.applicantFullName,
      email: submitted.email,
    });
    writeFullSubmittedApplication(submitted);
    clearRentalApplicationDraft();
    skipNextAutosave.current = true;
    setDraft(submitted);
    setAutosaveStatus("idle");
    return submitted;
  }, [draft]);

  const startNew = useCallback(() => {
    clearRentalApplicationDraft();
    const profile = readApplicantProfile();
    skipNextAutosave.current = true;
    setDraft(
      prefillFromProfile(emptyRentalApplicationDraft(initialUnitId), profile)
    );
    setAutosaveStatus("idle");
  }, [initialUnitId]);

  return {
    draft,
    loading,
    error,
    autosaveStatus,
    refresh,
    updateDraft,
    saveNow,
    submit,
    startNew,
  };
}
