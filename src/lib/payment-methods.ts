/**
 * Shared tenant payment-method categories used by the tenant master list,
 * tenant portal, and related billing surfaces.
 */
export type TenantPaymentMethod = "ach" | "check" | "debit_card";

export const TENANT_PAYMENT_METHODS: {
  value: TenantPaymentMethod;
  label: string;
}[] = [
  { value: "ach", label: "ACH" },
  { value: "check", label: "Check" },
  { value: "debit_card", label: "Debit card" },
];

/** Portal saved-method kind values that map to the shared categories. */
export type PortalPaymentMethodKind =
  | "ACH"
  | "Check"
  | "Debit card"
  | "Card"
  | "Bank"
  | "Monthly";

export function paymentMethodLabel(value: TenantPaymentMethod | string): string {
  return (
    TENANT_PAYMENT_METHODS.find((m) => m.value === value)?.label ??
    String(value).replaceAll("_", " ")
  );
}

export function isTenantPaymentMethod(
  value: unknown
): value is TenantPaymentMethod {
  return value === "ach" || value === "check" || value === "debit_card";
}

/** Map portal UI kinds (including legacy Card/Bank) onto shared categories. */
export function portalKindToPaymentMethod(
  kind: string | null | undefined
): TenantPaymentMethod {
  const k = (kind || "").trim().toLowerCase();
  if (k === "ach" || k === "bank") return "ach";
  if (k === "check") return "check";
  if (k === "debit card" || k === "debit_card" || k === "card") {
    return "debit_card";
  }
  if (k === "monthly") return "ach";
  return "check";
}

export function paymentMethodToPortalKind(
  method: TenantPaymentMethod
): "ACH" | "Check" | "Debit card" {
  switch (method) {
    case "ach":
      return "ACH";
    case "debit_card":
      return "Debit card";
    case "check":
    default:
      return "Check";
  }
}

export function paymentMethodToPortalBrand(method: TenantPaymentMethod): string {
  switch (method) {
    case "ach":
      return "ACH";
    case "debit_card":
      return "Debit";
    case "check":
    default:
      return "Check";
  }
}
