import type { PaymentsOverview } from "@/lib/portal/payments-types";

/** True when the tenant lease is enrolled in ACH autopay. */
export function isAchEnrolled(data: PaymentsOverview): boolean {
  if (data.autopay.enabled) return true;
  const kind = (data.savedMethod?.kind || "").toLowerCase();
  return kind === "ach" || kind === "bank";
}
