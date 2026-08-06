/**
 * Additional charges beyond base rent (utilities, CAM, parking, fees).
 * BACKEND_TODO: GET /api/tenant/charges · POST /api/tenant/charges/:id/pay
 */

export type AdditionalChargeKind =
  | "utility"
  | "cam"
  | "parking"
  | "fee"
  | "other";

export type AdditionalChargeStatus = "open" | "paid" | "partial";

export type AdditionalCharge = {
  id: string;
  kind: AdditionalChargeKind;
  label: string;
  description: string;
  amount: number;
  dueDate: string;
  status: AdditionalChargeStatus;
  occupancyClass: "personal" | "commercial";
  periodLabel: string;
};
