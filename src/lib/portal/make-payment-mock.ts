import type {
  MakePaymentContext,
  PaymentConfirmation,
} from "@/lib/portal/make-payment-types";
import type { SavedPaymentMethodSummary } from "@/lib/portal/payments-types";

/** Isolated mock rent-payment context — no live payment provider. */
export function getMockMakePaymentContext(): MakePaymentContext {
  return {
    propertyLabel: "Pier 12 · Suite 210",
    currentBalance: 4875,
    currentRent: 4800,
    lateFee: 75,
    dueDate: "May 1, 2026",
    currencySymbol: "$",
    allowCustomAmount: true,
    maxPayable: 4875,
    methods: [
      {
        id: "pm-ach",
        brand: "ACH",
        last4: "9910",
        kind: "ACH",
        isDefault: true,
      },
      {
        id: "pm-check",
        brand: "Deliver",
        last4: "CHCK",
        kind: "Check",
        isDefault: false,
      },
      {
        id: "pm-monthly",
        brand: "Monthly",
        last4: "AUTO",
        kind: "Monthly",
        isDefault: false,
      },
      {
        id: "pm-1",
        brand: "Visa",
        last4: "4242",
        kind: "Card",
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
    updatedBalance: Math.max(0, Number((input.previousBalance - input.amount).toFixed(2))),
    propertyLabel: input.propertyLabel,
  };
}

/** Simulated mock processor delay (no real charges). */
export async function mockProcessPayment(ms = 1200) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
