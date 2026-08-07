import type {
  MakePaymentContext,
  PaymentConfirmation,
} from "@/lib/portal/make-payment-types";
import type { SavedPaymentMethodSummary } from "@/lib/portal/payments-types";

/**
 * Mock rent-payment context — tenant is NOT on ACH, so they pay by debit
 * in the portal or deliver a check to management.
 */
export function getMockMakePaymentContext(): MakePaymentContext {
  return {
    propertyLabel: "Pier 12 · Suite 210",
    currentBalance: 4850,
    currentRent: 4800,
    lateFee: 75,
    dueDate: "May 1, 2026",
    currencySymbol: "$",
    allowCustomAmount: true,
    maxPayable: 4850,
    achEnrolled: false,
    methods: [
      {
        id: "pm-debit",
        brand: "Debit",
        last4: "4242",
        kind: "Debit card",
        isDefault: true,
      },
      {
        id: "pm-check",
        brand: "Check",
        last4: "****",
        kind: "Check",
        isDefault: false,
      },
    ],
  };
}

export function formatUsd(amount: number, symbol = "$") {
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function maskMethodSummary(method: SavedPaymentMethodSummary) {
  if (method.kind === "Check") {
    return "Check delivered to management";
  }
  if (method.kind === "ACH") {
    return `ACH •••• ${method.last4}`;
  }
  return `${method.brand} ${method.kind.toLowerCase()} •••• ${method.last4}`;
}

export function buildMockConfirmation(input: {
  amount: number;
  method: SavedPaymentMethodSummary;
  previousBalance: number;
  propertyLabel: string;
}): PaymentConfirmation {
  const stamp = new Date("2026-04-30T14:32:00");
  const confirmationNumber = `HL-PAY-${stamp
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    confirmationNumber,
    paidAt: stamp.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    amount: input.amount,
    methodSummary: maskMethodSummary(input.method),
    updatedBalance: Math.max(0, input.previousBalance - input.amount),
    propertyLabel: input.propertyLabel,
  };
}

/** Simulated processing delay for demo payment submissions. */
export async function mockProcessPayment(delayMs = 700): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
