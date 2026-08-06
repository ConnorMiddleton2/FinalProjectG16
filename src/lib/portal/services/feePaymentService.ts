/**
 * Application fee payment service.
 *
 * @backend POST /api/portal/applications/:id/fee-payments
 * No real card/ACH processor is configured — keep mock checkout only.
 */

import {
  processMockApplicationFee,
  readFeeReceiptByApplication,
  type MockFeePaymentInput,
} from "@/lib/application-fee";
import { MOCK_FEE_PAYMENTS } from "@/lib/portal/mock/data";
import { PortalServiceError } from "@/lib/portal/mock/delay";
import type { FeePayment } from "@/lib/portal/models";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

function fromReceiptLike(payment: FeePayment): FeePayment {
  return { ...payment };
}

function receiptToPayment(
  receipt: NonNullable<ReturnType<typeof readFeeReceiptByApplication>>
): FeePayment {
  return {
    id: `fee-${receipt.applicationId}`,
    applicationId: receipt.applicationId,
    amountCents: receipt.amountCents,
    currency: receipt.currency,
    status: "paid",
    paymentMethod: receipt.paymentMethod,
    billingName: receipt.billingName,
    billingEmail: receipt.billingEmail,
    paymentDisplayMask: receipt.paymentDisplayMask,
    paidAt: receipt.paidAt,
    receiptId: receipt.receiptId,
    idempotencyKey: receipt.idempotencyKey,
    property: receipt.property,
    floorPlan: receipt.floorPlan,
  };
}

/** @backend GET /api/portal/applications/:applicationId/fee-payments */
export async function listFeePayments(
  applicationId: string
): Promise<ServiceResult<FeePayment[]>> {
  return runMockService(() => {
    const stored = readFeeReceiptByApplication(applicationId);
    const fromStore = stored ? [receiptToPayment(stored)] : [];
    const fromMock = MOCK_FEE_PAYMENTS.filter(
      (item) => item.applicationId === applicationId
    ).map(fromReceiptLike);
    const byId = new Map<string, FeePayment>();
    for (const item of fromMock) byId.set(item.id, item);
    for (const item of fromStore) byId.set(item.id, item);
    return Array.from(byId.values());
  }, {
    minMs: 120,
    maxMs: 320,
    failureRate: 0.02,
    failureMessage: "Could not load fee payments.",
  });
}

/** @backend GET /api/portal/applications/:applicationId/fee-payments/latest */
export async function getFeePaymentForApplication(
  applicationId: string
): Promise<ServiceResult<FeePayment | null>> {
  const listed = await listFeePayments(applicationId);
  if (!listed.ok) return listed;
  return { ok: true, data: listed.data[0] ?? null };
}

/**
 * Processes a mock fee payment (uses existing fee processor + delay/failure).
 * @backend POST /api/portal/applications/:id/fee-payments
 */
export async function createFeePayment(
  input: MockFeePaymentInput
): Promise<ServiceResult<FeePayment>> {
  // Existing processor already includes delay + decline rate.
  try {
    const result = await processMockApplicationFee(input);
    if (!result.ok) {
      return {
        ok: false,
        error: {
          message: result.error || "Payment was declined.",
          code: "PAYMENT_FAILED",
          status: 402,
        },
      };
    }
    return { ok: true, data: receiptToPayment(result.receipt) };
  } catch (error) {
    return {
      ok: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Payment could not be processed.",
        code: "PAYMENT_ERROR",
        status: 500,
      },
    };
  }
}

/** @backend GET /api/portal/fee-payments/:id */
export async function getFeePayment(
  paymentId: string
): Promise<ServiceResult<FeePayment>> {
  return runMockService(() => {
    const found = MOCK_FEE_PAYMENTS.find((item) => item.id === paymentId);
    if (!found) {
      throw new PortalServiceError("Fee payment not found.", "NOT_FOUND", 404);
    }
    return fromReceiptLike(found);
  }, {
    minMs: 100,
    maxMs: 240,
    failureRate: 0.02,
    failureMessage: "Could not load fee payment.",
  });
}
