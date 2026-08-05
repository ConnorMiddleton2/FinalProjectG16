"use client";

import { useCallback, useMemo, useState } from "react";
import {
  formatUsd,
  maskMethodSummary,
} from "@/lib/portal/make-payment-mock";
import type {
  AmountChoice,
  MakePaymentDraft,
  MakePaymentStep,
  PaymentConfirmation,
} from "@/lib/portal/make-payment-types";
import {
  amountErrorMessage,
  methodErrorMessage,
  resolveAmountForChoice,
  validateAmountSelection,
  validateMethodSelection,
} from "@/lib/portal/make-payment-validation";
import {
  getMakePaymentContextSync,
  submitPayment,
} from "@/lib/portal/services/paymentService";

const STEPS: MakePaymentStep[] = [
  "review-balance",
  "select-amount",
  "select-method",
  "review-payment",
  "confirm-payment",
  "confirmation",
];

const STEP_LABELS: Record<MakePaymentStep, string> = {
  "review-balance": "Review balance",
  "select-amount": "Select amount",
  "select-method": "Select method",
  "review-payment": "Review",
  "confirm-payment": "Confirm",
  confirmation: "Done",
};

const initialDraft: MakePaymentDraft = {
  amountChoice: null,
  customAmountInput: "",
  resolvedAmount: null,
  methodId: null,
};

export function useMakePaymentFlow() {
  const context = useMemo(() => getMakePaymentContextSync(), []);
  const [step, setStep] = useState<MakePaymentStep>("review-balance");
  const [draft, setDraft] = useState<MakePaymentDraft>(initialDraft);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [methodError, setMethodError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(
    null
  );

  const stepIndex = STEPS.indexOf(step);
  const selectedMethod =
    context.methods.find((m) => m.id === draft.methodId) ?? null;

  const resolvedAmount = useMemo(() => {
    if (!draft.amountChoice) return null;
    return resolveAmountForChoice(
      draft.amountChoice,
      draft.customAmountInput,
      context
    );
  }, [draft.amountChoice, draft.customAmountInput, context]);

  const goNextFromBalance = useCallback(() => {
    setStep("select-amount");
  }, []);

  const setAmountChoice = useCallback((choice: AmountChoice) => {
    setAmountError(null);
    setDraft((prev) => ({
      ...prev,
      amountChoice: choice,
      customAmountInput:
        choice === "custom" ? prev.customAmountInput : prev.customAmountInput,
    }));
  }, []);

  const setCustomAmountInput = useCallback((value: string) => {
    setAmountError(null);
    setDraft((prev) => ({
      ...prev,
      amountChoice: "custom",
      customAmountInput: value,
    }));
  }, []);

  const goNextFromAmount = useCallback(() => {
    const error = validateAmountSelection(draft, context);
    if (error) {
      setAmountError(amountErrorMessage(error));
      return false;
    }
    const amount = resolveAmountForChoice(
      draft.amountChoice!,
      draft.customAmountInput,
      context
    );
    setDraft((prev) => ({ ...prev, resolvedAmount: amount }));
    setAmountError(null);
    setStep("select-method");
    return true;
  }, [draft, context]);

  const setMethodId = useCallback((methodId: string) => {
    setMethodError(null);
    setDraft((prev) => ({ ...prev, methodId }));
  }, []);

  const goNextFromMethod = useCallback(() => {
    const error = validateMethodSelection(draft.methodId);
    if (error) {
      setMethodError(methodErrorMessage(error));
      return false;
    }
    setMethodError(null);
    setStep("review-payment");
    return true;
  }, [draft.methodId]);

  const goNextFromReview = useCallback(() => {
    setConfirmError(null);
    setStep("confirm-payment");
  }, []);

  const goBack = useCallback(() => {
    if (processing || step === "confirmation") return;
    const idx = STEPS.indexOf(step);
    if (idx <= 0) return;
    setConfirmError(null);
    setStep(STEPS[idx - 1]);
  }, [processing, step]);

  const confirmPayment = useCallback(async () => {
    if (processing) {
      setConfirmError("Payment is already processing. Please wait.");
      return;
    }
    if (submitted) {
      setConfirmError(
        "This payment was already submitted. Check your confirmation or start a new payment."
      );
      return;
    }

    const amountErr = validateAmountSelection(draft, context);
    if (amountErr) {
      setConfirmError(amountErrorMessage(amountErr));
      setStep("select-amount");
      return;
    }
    const methodErr = validateMethodSelection(draft.methodId);
    if (methodErr) {
      setConfirmError(methodErrorMessage(methodErr));
      setStep("select-method");
      return;
    }

    const method = context.methods.find((m) => m.id === draft.methodId);
    const amount = resolveAmountForChoice(
      draft.amountChoice!,
      draft.customAmountInput,
      context
    );
    if (!method || amount === null) {
      setConfirmError("Payment details are incomplete.");
      return;
    }

    setProcessing(true);
    setConfirmError(null);
    try {
      const result = await submitPayment({
        amount,
        method,
        previousBalance: context.currentBalance,
        propertyLabel: context.propertyLabel,
      });
      if (!result.ok) {
        setConfirmError(result.error.message);
        return;
      }
      setConfirmation(result.data);
      setSubmitted(true);
      setStep("confirmation");
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : "Mock payment failed. Try again."
      );
    } finally {
      setProcessing(false);
    }
  }, [processing, submitted, draft, context]);

  const startNewPayment = useCallback(() => {
    setDraft(initialDraft);
    setAmountError(null);
    setMethodError(null);
    setConfirmError(null);
    setProcessing(false);
    setSubmitted(false);
    setConfirmation(null);
    setStep("review-balance");
  }, []);

  return {
    context,
    step,
    stepIndex,
    steps: STEPS,
    stepLabels: STEP_LABELS,
    draft,
    resolvedAmount,
    selectedMethod,
    amountError,
    methodError,
    confirmError,
    processing,
    submitted,
    confirmation,
    formatUsd,
    maskMethodSummary,
    goNextFromBalance,
    setAmountChoice,
    setCustomAmountInput,
    goNextFromAmount,
    setMethodId,
    goNextFromMethod,
    goNextFromReview,
    goBack,
    confirmPayment,
    startNewPayment,
  };
}
