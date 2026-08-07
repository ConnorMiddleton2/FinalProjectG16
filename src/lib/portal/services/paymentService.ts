import {
  getEmptyPaymentsOverview,
} from "@/lib/portal/payments-mock";
import {
  buildMockConfirmation,
  maskMethodSummary,
} from "@/lib/portal/make-payment-mock";
import type { PaymentConfirmation } from "@/lib/portal/make-payment-types";
import type { MakePaymentContext } from "@/lib/portal/make-payment-types";
import type { PaymentHistoryRecord } from "@/lib/portal/models";
import type { PaymentsOverview, SavedPaymentMethodSummary } from "@/lib/portal/models";
import {
  buildLiveMakePaymentFromSession,
  buildLivePaymentsFromSession,
} from "@/lib/portal/live-lease-from-session";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

type ManagementPayload = {
  payments?: PaymentsOverview | null;
  makePayment?: MakePaymentContext | null;
  history?: PaymentHistoryRecord[] | null;
  pendingCheck?: PaymentsOverview["pendingCheck"];
};

async function fetchManagementPayments(): Promise<ManagementPayload | null> {
  try {
    const res = await fetch("/api/portal/management-snapshot", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ManagementPayload;
  } catch {
    return null;
  }
}

function paymentsHasBill(data: PaymentsOverview) {
  const due = Number(String(data.amountDue).replace(/[^0-9.-]/g, ""));
  const bal = Number(String(data.currentBalance).replace(/[^0-9.-]/g, ""));
  return (
    (Number.isFinite(due) && due > 0.009) ||
    (Number.isFinite(bal) && bal > 0.009) ||
    data.transactions.length > 0 ||
    data.ledger.length > 0
  );
}

/**
 * Payments service — balance and history from Management rental receivables,
 * with session lease fallback when AR is not linked yet.
 */
export async function getPaymentsOverview(): Promise<
  ServiceResult<PaymentsOverview>
> {
  const forced = assertNotForcedError("getPaymentsOverview");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    const mgmt = await fetchManagementPayments();
    if (mgmt?.payments && paymentsHasBill(mgmt.payments)) {
      return ok(
        {
          ...mgmt.payments,
          pendingCheck:
            mgmt.payments.pendingCheck ?? mgmt.pendingCheck ?? null,
        },
        "live"
      );
    }

    const fromSession = buildLivePaymentsFromSession(auth.data);
    if (fromSession) {
      return ok(
        {
          ...fromSession,
          pendingCheck: mgmt?.pendingCheck ?? mgmt?.payments?.pendingCheck ?? null,
        },
        "live"
      );
    }

    if (mgmt?.payments) {
      return ok(
        {
          ...mgmt.payments,
          pendingCheck:
            mgmt.payments.pendingCheck ?? mgmt.pendingCheck ?? null,
        },
        "live"
      );
    }

    return ok(getEmptyPaymentsOverview(), "live");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load your payments overview.",
      "network"
    );
  }
}

export async function getPaymentHistory(): Promise<
  ServiceResult<PaymentHistoryRecord[]>
> {
  const forced = assertNotForcedError("getPaymentHistory");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    const mgmt = await fetchManagementPayments();
    if (mgmt?.history) {
      return ok(mgmt.history, "live");
    }
    return ok([], "live");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load payment history.",
      "network"
    );
  }
}

export async function getMakePaymentContext(): Promise<
  ServiceResult<MakePaymentContext>
> {
  const forced = assertNotForcedError("getMakePaymentContext");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    const mgmt = await fetchManagementPayments();
    if (mgmt?.makePayment && mgmt.makePayment.currentBalance > 0) {
      return ok(mgmt.makePayment, "live");
    }
    const fromSession = buildLiveMakePaymentFromSession(auth.data);
    if (fromSession) {
      return ok(fromSession, "live");
    }
    if (mgmt?.makePayment) {
      return ok(mgmt.makePayment, "live");
    }
    const propertyLabel =
      [auth.data.propertyName, auth.data.unit].filter(Boolean).join(" · ") ||
      "Your leased unit";
    const rent = Number(auth.data.monthlyRent) || 0;
    return ok(
      {
        propertyLabel,
        currentBalance: rent,
        currentRent: rent,
        lateFee: 0,
        dueDate: "—",
        currencySymbol: "$",
        allowCustomAmount: true,
        maxPayable: rent,
        achEnrolled: false,
        methods: [],
      },
      "live"
    );
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load payment options.",
      "network"
    );
  }
}

export async function submitPayment(input: {
  amount: number;
  method: SavedPaymentMethodSummary;
  previousBalance: number;
  propertyLabel: string;
}): Promise<ServiceResult<PaymentConfirmation>> {
  const forced = assertNotForcedError("submitPayment");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    const { portalRecordRentPayment } = await import(
      "@/app/portal/payment-actions"
    );
    const bank = await portalRecordRentPayment({
      amount: input.amount,
      method: `${input.method.kind} ${input.method.brand}`,
      propertyLabel: input.propertyLabel,
    });

    if (bank && "error" in bank && bank.error) {
      return failFromUnknown(new Error(bank.error), bank.error, "validation");
    }

    const confirmationNumber =
      bank && "confirmationNumber" in bank && bank.confirmationNumber
        ? bank.confirmationNumber
        : `HL-PAY-${Date.now()}`;

    return ok(
      {
        confirmationNumber,
        paidAt: new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        amount: input.amount,
        methodSummary: maskMethodSummary(input.method),
        updatedBalance: Math.max(
          0,
          Number((input.previousBalance - input.amount).toFixed(2))
        ),
        propertyLabel: input.propertyLabel,
      },
      "live"
    );
  } catch (err) {
    return failFromUnknown(
      err,
      "Payment could not be processed. Please try again.",
      "network"
    );
  }
}

export function getPaymentsOverviewDemoFixture(): PaymentsOverview {
  return getEmptyPaymentsOverview();
}

export function getEmptyPaymentsOverviewFixture(): PaymentsOverview {
  return getEmptyPaymentsOverview();
}

export function getMakePaymentContextSync(): MakePaymentContext {
  return {
    propertyLabel: "Your leased unit",
    currentBalance: 0,
    currentRent: 0,
    lateFee: 0,
    dueDate: "—",
    currencySymbol: "$",
    allowCustomAmount: true,
    maxPayable: 0,
    achEnrolled: false,
    methods: [],
  };
}

export function buildPaymentConfirmation(input: {
  amount: number;
  method: SavedPaymentMethodSummary;
  previousBalance: number;
  propertyLabel: string;
}): PaymentConfirmation {
  return buildMockConfirmation(input);
}
