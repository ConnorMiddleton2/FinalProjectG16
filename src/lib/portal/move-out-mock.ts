import type { MoveOutContext } from "@/lib/portal/move-out-types";

/** Isolated mock move-out context aligned with Pier 12 Suite 210 lease. */
export function getMockMoveOutContext(): MoveOutContext {
  return {
    leaseNumber: "HL-P12-210-2026",
    propertyName: "Pier 12 Commerce",
    unitNumber: "Suite 210",
    leaseEndDate: "2027-12-31",
    requiredNoticeDays: 60,
    noticeRequirementLabel:
      "Written notice required at least 60 days before vacating (and before the lease end date when ending at term).",
    todayIso: "2026-04-30",
    tenantContactName: "Alex Tenant",
    tenantContactPhone: "(662) 555-0142",
    tenantContactEmail: "alex.tenant@example.com",
    checklist: [
      {
        id: "c1",
        label: "Return keys, fobs, and hangtags",
        detail: "All issued access items must be returned at move-out.",
      },
      {
        id: "c2",
        label: "Provide forwarding address",
        detail: "Used for deposit accounting and final correspondence.",
      },
      {
        id: "c3",
        label: "Schedule final inspection",
        detail: "CPMC confirms the inspection after acknowledging notice.",
      },
      {
        id: "c4",
        label: "Clear unit and common storage",
        detail: "Remove personal property from the suite and assigned storage.",
      },
      {
        id: "c5",
        label: "Settle final charges",
        detail: "Rent through the approved move-out date and any fees still apply.",
      },
      {
        id: "c6",
        label: "Update insurance / utilities as needed",
        detail: "Coordinate utility stop dates after management acknowledges notice.",
      },
    ],
  };
}
