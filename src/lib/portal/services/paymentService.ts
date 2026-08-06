import {
  getEmptyPaymentsOverview,
  getMockPaymentsOverview,
} from "@/lib/portal/payments-mock";
import { getMockPaymentHistory } from "@/lib/portal/payment-history-mock";
import {
  buildMockConfirmation,
  getMockMakePaymentContext,
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
    // BACKEND_TODO: live payable balance + saved methods (token refs only)
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return failFromUnknown(
        new Error("No payable balance is linked to this tenant account."),
        "No payable balance is linked to this tenant account.",
        "not_found"
      );
    }
    return ok(getMockMakePaymentContext(), "mock");
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
  if (!sessionOwnsDemoFixtures(auth.data)) {
    return failFromUnknown(
      new Error("You are not authorized to pay on another tenant’s account."),
      "You are not authorized to pay on another tenant’s account.",
      "unauthorized"
    );
  }

  try {
    // BACKEND_TODO: charge via payment provider using tokenized method id only
    await mockProcessPayment();
    return ok(buildMockConfirmation(input), "mock");
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
