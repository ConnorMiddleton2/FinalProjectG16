import type { EvictionChecklistItem } from "@/lib/eviction-jurisdiction";

export type OverdueTenantCaseStatus =
  | "open"
  | "cured_with_infraction"
  | "evicted";

export type OverdueTenantCase = {
  id: string;
  tenantId: string;
  status: OverdueTenantCaseStatus;
  jurisdictionState: string;
  jurisdictionSummary: string;
  checklist: EvictionChecklistItem[];
  checklistGeneratedAt: string;
  updatedAt: string;
  /** Highest days overdue observed while the case was open. */
  peakDaysOverdue?: number;
  peakAmountDue?: number;
  evictedAt?: string;
  curedAt?: string;
  infractionNote?: string;
};

export function overdueCaseId(tenantId: string) {
  return `otc-${tenantId.trim().toLowerCase()}`;
}

export function emptyOverdueCase(
  tenantId: string,
  partial?: Partial<OverdueTenantCase>
): OverdueTenantCase {
  const now = new Date().toISOString();
  return {
    id: overdueCaseId(tenantId),
    tenantId,
    status: "open",
    jurisdictionState: "",
    jurisdictionSummary: "",
    checklist: [],
    checklistGeneratedAt: "",
    updatedAt: now,
    ...partial,
  };
}
