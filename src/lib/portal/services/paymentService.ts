import {
  getEmptyPaymentsOverview,
  getMockPaymentsOverview,
} from "@/lib/portal/payments-mock";
import { getMockPaymentHistory } from "@/lib/portal/payment-history-mock";
import {
  buildMockConfirmation,
  getMockMakePaymentContext,
  maskMethodSummary,
  mockProcessPayment,
} from "@/lib/portal/make-payment-mock";
import type { PaymentConfirmation } from "@/lib/portal/make-payment-types";
import type { MakePaymentContext } from "@/lib/portal/make-payment-types";
import type { PaymentHistoryRecord } from "@/lib/portal/models";
import type { PaymentsOverview, SavedPaymentMethodSummary } from "@/lib/portal/models";
import { sessionOwnsDemoFixtures } from "@/lib/portal/tenant-scope";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

/**
 * Payments service — balance, history, and make-payment processing.
 *
 * BACKEND_TODO:
 *   GET  /api/tenant/payments/overview
 *   GET  /api/tenant/payments/history
 *   POST /api/tenant/payments  (tokenized method only — never raw PAN)
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
    // BACKEND_TODO: live overview scoped to session tenant lease
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok(getEmptyPaymentsOverview(), "mock");
    }
    return ok(getMockPaymentsOverview(), "mock");
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
    // BACKEND_TODO: live history scoped to session tenant
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok([], "mock");
    }
    return ok(getMockPaymentHistory(), "mock");
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
    const base = getMockMakePaymentContext();
    if (auth.data.propertyName || auth.data.unit) {
      return ok(
        {
          ...base,
          propertyLabel: [auth.data.propertyName, auth.data.unit]
            .filter(Boolean)
            .join(" · "),
        },
        "live"
      );
    }
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok(
        {
          ...base,
          propertyLabel: "Your leased unit",
          currentBalance: base.currentRent,
          maxPayable: base.currentRent,
        },
        "live"
      );
    }
    return ok(base, "mock");
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
      // Fall back to mock confirmation for demo tenants without a bank link
      if (sessionOwnsDemoFixtures(auth.data)) {
        await mockProcessPayment();
        return ok(buildMockConfirmation(input), "mock");
      }
      return failFromUnknown(
        new Error(bank.error),
        bank.error,
        "validation"
      );
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
  return getMockPaymentsOverview();
}

export function getEmptyPaymentsOverviewFixture(): PaymentsOverview {
  return getEmptyPaymentsOverview();
}

export function getMakePaymentContextSync(): MakePaymentContext {
  return getMockMakePaymentContext();
}

export function buildPaymentConfirmation(input: {
  amount: number;
  method: SavedPaymentMethodSummary;
  previousBalance: number;
  propertyLabel: string;
}): PaymentConfirmation {
  return buildMockConfirmation(input);
}
