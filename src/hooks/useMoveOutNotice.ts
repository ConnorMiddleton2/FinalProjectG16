"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MoveOutFormErrors,
  MoveOutFormValues,
  MoveOutLoadState,
  MoveOutWizardStep,
} from "@/lib/portal/move-out-types";
import {
  canStartNewMoveOutNotice,
  emptyMoveOutForm,
  getNoticePeriodWarning,
  validateMoveOutForm,
} from "@/lib/portal/move-out-validation";
import {
  clearMoveOutNotice,
  getMoveOutBundle,
  submitMoveOutNotice,
} from "@/lib/portal/services/moveOutService";


const WIZARD_STEPS: MoveOutWizardStep[] = [
  "overview",
  "details",
  "review",
  "confirmation",
];

const STEP_LABELS: Record<MoveOutWizardStep, string> = {
  overview: "Overview",
  details: "Details",
  review: "Review",
  confirmation: "Receipt",
};

export function useMoveOutNotice() {
  const [state, setState] = useState<MoveOutLoadState>({ status: "loading" });
  const [step, setStep] = useState<MoveOutWizardStep>("overview");
  const [values, setValues] = useState<MoveOutFormValues | null>(null);
  const [errors, setErrors] = useState<MoveOutFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setSubmitError(null);
    try {
      const result = await getMoveOutBundle();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      const { context, notice } = result.data;
      setState({
        status: "success",
        context,
        notice,
        source: result.source,
      });
      setValues(emptyMoveOutForm(context));
      if (notice && !canStartNewMoveOutNotice(notice.status)) {
        setStep("confirmation");
      } else {
        setStep("overview");
      }
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load move-out information.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const noticeWarning = useMemo(() => {
    if (state.status !== "success" || !values) return null;
    return getNoticePeriodWarning(state.context, values.requestedMoveOutDate);
  }, [state, values]);

  const updateField = useCallback(
    <K extends keyof MoveOutFormValues>(key: K, value: MoveOutFormValues[K]) => {
      setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        delete next.form;
        return next;
      });
      setSubmitError(null);
    },
    []
  );

  const goNextFromOverview = useCallback(() => {
    if (state.status !== "success") return;
    if (state.notice && !canStartNewMoveOutNotice(state.notice.status)) {
      setStep("confirmation");
      return;
    }
    setStep("details");
  }, [state]);

  const goNextFromDetails = useCallback(() => {
    if (state.status !== "success" || !values) return;
    const nextErrors = validateMoveOutForm(values, state.context);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmitError("Fix the highlighted fields before continuing.");
      return;
    }
    setSubmitError(null);
    setStep("review");
  }, [state, values]);

  const goBack = useCallback(() => {
    setSubmitError(null);
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx <= 0 || step === "confirmation") return;
    setStep(WIZARD_STEPS[idx - 1]!);
  }, [step]);

  const submitNotice = useCallback(async () => {
    if (submitting) return false;
    if (state.status !== "success" || !values) return false;
    const nextErrors = validateMoveOutForm(values, state.context);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmitError("Fix the highlighted fields before submitting.");
      setStep("details");
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitMoveOutNotice({
        context: state.context,
        values,
      });
      if (!result.ok) {
        setSubmitError(result.error.message);
        return false;
      }
      setState({
        status: "success",
        context: state.context,
        notice: result.data,
        source: result.source,
      });
      setStep("confirmation");
      setSuccessMessage(
        "Notice submitted. It is not accepted until management acknowledges or approves it."
      );
      window.setTimeout(() => setSuccessMessage(null), 5000);
      return true;
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Could not submit the move-out notice. Try again."
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [state, values, submitting]);

  const startOver = useCallback(() => {
    void clearMoveOutNotice();
    if (state.status === "success") {
      setValues(emptyMoveOutForm(state.context));
      setState({
        status: "success",
        context: state.context,
        notice: null,
        source: state.source,
      });
    }
    setErrors({});
    setStep("overview");
    setSubmitError(null);
    setSuccessMessage(null);
  }, [state]);

  return {
    state,
    step,
    stepIndex: WIZARD_STEPS.indexOf(step),
    stepLabels: STEP_LABELS,
    wizardSteps: WIZARD_STEPS,
    values,
    errors,
    noticeWarning,
    submitting,
    submitError,
    successMessage,
    reload: () => void load(),
    updateField,
    goNextFromOverview,
    goNextFromDetails,
    goBack,
    submitNotice,
    startOver,
  };
}
