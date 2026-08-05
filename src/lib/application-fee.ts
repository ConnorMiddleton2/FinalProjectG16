/**
 * Application fee policy, mock payment processing, and receipt storage.
 *
 * No compliant payment provider is configured in this project, so payments are
 * simulated only. Never collect or persist full card/bank account numbers.
 */

export const APPLICATION_FEE_RECEIPTS_KEY =
  "harborline_application_fee_receipts";

/** Primary applicant application fee (matches unit fee sheet). */
export const APPLICATION_FEE_AMOUNT_CENTS = 5500;
export const APPLICATION_FEE_CURRENCY = "USD";
export const APPLICATION_FEE_LABEL = "Application fee";

export type FeePaymentMethod = "" | "mock-card" | "mock-ach";

export type FeePaymentStatus =
  | "unpaid"
  | "processing"
  | "paid"
  | "failed";

export type FeeBillingDetails = {
  name: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type ApplicationFeeReceipt = {
  receiptId: string;
  applicationId: string;
  idempotencyKey: string;
  amountCents: number;
  currency: string;
  paymentMethod: Exclude<FeePaymentMethod, "">;
  billingName: string;
  billingEmail: string;
  /** Display-only mock mask — never a full PAN or account number. */
  paymentDisplayMask: string;
  paidAt: string;
  property: string;
  floorPlan: string;
  applicantFullName: string;
  mockProviderLabel: string;
};

export function formatFeeAmount(
  cents = APPLICATION_FEE_AMOUNT_CENTS,
  currency = APPLICATION_FEE_CURRENCY
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function feePaymentMethodLabel(method: FeePaymentMethod): string {
  switch (method) {
    case "mock-card":
      return "Card (mock checkout)";
    case "mock-ach":
      return "Bank transfer / ACH (mock)";
    default:
      return "Not selected";
  }
}

export function createFeeIdempotencyKey(applicationId: string): string {
  return `fee-${applicationId}`;
}

export function createReceiptId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 900 + 100);
  return `RCPT-${stamp.slice(-6)}-${rand}`;
}

export function createMockPaymentReference(receiptId: string): string {
  return `MOCK-PAY-${receiptId}`;
}

export function paymentDisplayMask(method: Exclude<FeePaymentMethod, "">): string {
  if (method === "mock-card") return "Mock card ·•••• 4242";
  return "Mock ACH ·••• 6789";
}

export function isApplicationFeePaid(input: {
  feeStatus: FeePaymentStatus;
  feeReceiptId: string;
  feeAcknowledged: boolean;
  feeRefundPolicyAcknowledged: boolean;
}): boolean {
  return (
    input.feeStatus === "paid" &&
    Boolean(input.feeReceiptId) &&
    input.feeAcknowledged &&
    input.feeRefundPolicyAcknowledged
  );
}

function readAllReceipts(): ApplicationFeeReceipt[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(APPLICATION_FEE_RECEIPTS_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as ApplicationFeeReceipt[];
}

function writeAllReceipts(receipts: ApplicationFeeReceipt[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    APPLICATION_FEE_RECEIPTS_KEY,
    JSON.stringify(receipts)
  );
}

export function readFeeReceiptByApplication(
  applicationId: string
): ApplicationFeeReceipt | null {
  return (
    readAllReceipts().find((item) => item.applicationId === applicationId) ??
    null
  );
}

export function readFeeReceiptByIdempotencyKey(
  idempotencyKey: string
): ApplicationFeeReceipt | null {
  return (
    readAllReceipts().find((item) => item.idempotencyKey === idempotencyKey) ??
    null
  );
}

export function validateFeeBilling(billing: FeeBillingDetails): string | null {
  if (!billing.name.trim()) return "Billing name is required.";
  if (!billing.email.trim() || !billing.email.includes("@")) {
    return "Enter a valid billing email.";
  }
  if (!billing.street.trim()) return "Billing street is required.";
  if (!billing.city.trim()) return "Billing city is required.";
  if (!billing.state.trim()) return "Billing state is required.";
  if (!billing.zip.trim()) return "Billing ZIP is required.";
  return null;
}

export type MockFeePaymentInput = {
  applicationId: string;
  idempotencyKey: string;
  paymentMethod: Exclude<FeePaymentMethod, "">;
  billing: FeeBillingDetails;
  property: string;
  floorPlan: string;
  applicantFullName: string;
};

export type MockFeePaymentResult =
  | { ok: true; receipt: ApplicationFeeReceipt; duplicate: boolean }
  | { ok: false; error: string };

/**
 * Simulate a hosted checkout charge. Idempotent per application —
 * a second call with the same key returns the existing receipt without charging again.
 */
export async function processMockApplicationFee(
  input: MockFeePaymentInput
): Promise<MockFeePaymentResult> {
  if (!input.paymentMethod) {
    return { ok: false, error: "Choose a payment method." };
  }

  const billingError = validateFeeBilling(input.billing);
  if (billingError) return { ok: false, error: billingError };

  const existing =
    readFeeReceiptByIdempotencyKey(input.idempotencyKey) ||
    readFeeReceiptByApplication(input.applicationId);
  if (existing) {
    return { ok: true, receipt: existing, duplicate: true };
  }

  await new Promise((resolve) => window.setTimeout(resolve, 900));

  // Rare mock decline so failure UI can be exercised without real processors.
  if (Math.random() < 0.04) {
    return {
      ok: false,
      error: "Mock payment declined. No charge was made — you can try again.",
    };
  }

  const receiptId = createReceiptId();
  const receipt: ApplicationFeeReceipt = {
    receiptId,
    applicationId: input.applicationId,
    idempotencyKey: input.idempotencyKey,
    amountCents: APPLICATION_FEE_AMOUNT_CENTS,
    currency: APPLICATION_FEE_CURRENCY,
    paymentMethod: input.paymentMethod,
    billingName: input.billing.name.trim(),
    billingEmail: input.billing.email.trim(),
    paymentDisplayMask: paymentDisplayMask(input.paymentMethod),
    paidAt: new Date().toISOString(),
    property: input.property,
    floorPlan: input.floorPlan,
    applicantFullName: input.applicantFullName,
    mockProviderLabel: "Harborline Mock Checkout (demo only)",
  };

  // Re-check after the async delay to prevent double submit races.
  const raced =
    readFeeReceiptByIdempotencyKey(input.idempotencyKey) ||
    readFeeReceiptByApplication(input.applicationId);
  if (raced) {
    return { ok: true, receipt: raced, duplicate: true };
  }

  writeAllReceipts([receipt, ...readAllReceipts()]);
  return { ok: true, receipt, duplicate: false };
}

export function normalizeLegacyFeePaymentMethod(
  value: string | undefined
): FeePaymentMethod {
  if (value === "card" || value === "mock-card") return "mock-card";
  if (value === "ach-placeholder" || value === "mock-ach") return "mock-ach";
  return "";
}
