"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { canStartNewRenewalRequest } from "@/lib/portal/renewal-format";
import type {
  RenewalDraft,
  RenewalLoadState,
  RenewalWizardStep,
} from "@/lib/portal/renewal-types";
import {
  clearRenewalRequest,
  getRenewalBundle,
  submitRenewalRequest,
} from "@/lib/portal/services/renewalService";


const WIZARD_STEPS: RenewalWizardStep[] = [
  "overview",
  "select-term",
  "add-message",
  "review",
  "confirmation",
];

const STEP_LABELS: Record<RenewalWizardStep, string> = {
  overview: "Overview",
  "select-term": "Select term",
  "add-message": "Message",
  review: "Review",
  confirmation: "Submitted",
};

const EMPTY_DRAFT: RenewalDraft = {
  preferredTermId: "",
  message: "",
};

export function useLeaseRenewal() {
  const [state, setState] = useState<RenewalLoadState>({ status: "loading" });
  const [step, setStep] = useState<RenewalWizardStep>("overview");
  const [draft, setDraft] = useState<RenewalDraft>(EMPTY_DRAFT);
  const [termError, setTermError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setSubmitError(null);
    try {
      const result = await getRenewalBundle();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      const { context, request } = result.data;
      setState({
        status: "success",
        context,
        request,
        source: result.source,
      });
      if (request && !canStartNewRenewalRequest(request.status)) {
        setStep("confirmation");
      } else {
        setStep("overview");
        setDraft(EMPTY_DRAFT);
      }
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load renewal information.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedTerm = useMemo(() => {
    if (state.status !== "success" || !draft.preferredTermId) return null;
    return (
      state.context.availableTerms.find((t) => t.id === draft.preferredTermId) ??
      null
    );
  }, [state, draft.preferredTermId]);

  const stepIndex = WIZARD_STEPS.indexOf(step);

  const goNextFromOverview = useCallback(() => {
    if (state.status !== "success") return;
    if (!state.context.eligibility.eligible) {
      setSubmitError(
        "You are not currently eligible to submit a renewal request."
      );
      return;
    }
    if (
      state.request &&
      !canStartNewRenewalRequest(state.request.status)
    ) {
      setStep("confirmation");
      return;
    }
    setSubmitError(null);
    setStep("select-term");
  }, [state]);

  const selectTerm = useCallback((termId: string) => {
    setTermError(null);
    setDraft((prev) => ({ ...prev, preferredTermId: termId }));
  }, []);

  const goNextFromTerm = useCallback(() => {
    if (!draft.preferredTermId) {
      setTermError("Select a preferred renewal term to continue.");
      return;
    }
    setTermError(null);
    setStep("add-message");
  }, [draft.preferredTermId]);

  const setMessage = useCallback((message: string) => {
    setDraft((prev) => ({ ...prev, message: message.slice(0, 1000) }));
  }, []);

  const goNextFromMessage = useCallback(() => {
    if (draft.message.length > 1000) {
      setSubmitError("Message must be 1000 characters or fewer.");
      return;
    }
    setSubmitError(null);
    setStep("review");
  }, [draft.message]);

  const goBack = useCallback(() => {
    setSubmitError(null);
    setTermError(null);
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx <= 0) return;
    if (step === "confirmation") return;
    setStep(WIZARD_STEPS[idx - 1]!);
  }, [step]);

  const submitRequest = useCallback(async () => {
    if (submitting) return false;
    if (state.status !== "success") return false;
    if (!selectedTerm) {
      setTermError("Select a preferred renewal term before submitting.");
      setStep("select-term");
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitRenewalRequest({
        context: state.context,
        draft,
        termLabel: selectedTerm.label,
        estimatedMonthlyRent: selectedTerm.estimatedMonthlyRent,
      });
      if (!result.ok) {
        setSubmitError(result.error.message);
        return false;
      }
      setState({
        status: "success",
        context: state.context,
        request: result.data,
        source: result.source,
      });
      setStep("confirmation");
      setSuccessMessage(
        "Request submitted. CPMC will review it — this does not finalize your renewal."
      );
      window.setTimeout(() => setSuccessMessage(null), 5000);
      return true;
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Could not submit the renewal request. Try again."
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [draft.message, selectedTerm, state, submitting]);

  const startOver = useCallback(() => {
    void clearRenewalRequest();
    if (state.status === "success") {
      setState({
        status: "success",
        context: state.context,
        request: null,
        source: state.source,
      });
    }
    setDraft(EMPTY_DRAFT);
    setStep("overview");
    setTermError(null);
    setSubmitError(null);
    setSuccessMessage(null);
  }, [state]);

  return {
    state,
    step,
    stepIndex,
    stepLabels: STEP_LABELS,
    wizardSteps: WIZARD_STEPS,
    draft,
    selectedTerm,
    termError,
    submitError,
    submitting,
    successMessage,
    reload: () => void load(),
    goNextFromOverview,
    selectTerm,
    goNextFromTerm,
    setMessage,
    goNextFromMessage,
    goBack,
    submitRequest,
    startOver,
  };
}
