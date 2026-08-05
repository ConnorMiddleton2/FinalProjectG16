import {
  feeStructureLabel,
  type ManagementContractDraft,
} from "@/lib/management-contract";
import { OWNER_SPEND_APPROVAL_THRESHOLD } from "@/lib/owner-approval-policy";
import { ownerFacingFeeSummary } from "@/lib/owner-properties";

export type ContractStatus =
  | "pending_terms"
  | "upcoming"
  | "active"
  | "expiring_soon"
  | "expired";

const EXPIRING_SOON_DAYS = 90;

function parseDateOnly(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  // Prefer YYYY-MM-DD as local date
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Derive contract lifecycle status from start/end dates. */
export function getContractStatus(
  contract: ManagementContractDraft
): ContractStatus {
  const start = parseDateOnly(contract.contractStartDate);
  const end = parseDateOnly(contract.contractEndDate);
  const today = startOfToday();

  if (!start) {
    return "pending_terms";
  }

  if (start > today) {
    return "upcoming";
  }

  if (end) {
    if (end < today) {
      return "expired";
    }
    const soon = new Date(today);
    soon.setDate(soon.getDate() + EXPIRING_SOON_DAYS);
    if (end <= soon) {
      return "expiring_soon";
    }
  }

  return "active";
}

export function contractStatusLabel(status: ContractStatus): string {
  switch (status) {
    case "pending_terms":
      return "Pending terms";
    case "upcoming":
      return "Upcoming";
    case "active":
      return "Active";
    case "expiring_soon":
      return "Expiring soon";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export function contractStatusBadgeClass(status: ContractStatus): string {
  switch (status) {
    case "pending_terms":
      return "badge-ghost";
    case "upcoming":
      return "badge-info";
    case "active":
      return "badge-success";
    case "expiring_soon":
      return "badge-warning";
    case "expired":
      return "badge-error";
    default:
      return "badge-outline";
  }
}

/** Per-contract threshold if set; otherwise Harborline default policy. */
export function resolveOwnerApprovalThreshold(
  contract: ManagementContractDraft
): { amount: number; source: "contract" | "policy" } {
  const raw = (contract.ownerApprovalThreshold ?? "").trim();
  if (raw) {
    const n = Number(raw.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n) && n > 0) {
      return { amount: n, source: "contract" };
    }
  }
  return { amount: OWNER_SPEND_APPROVAL_THRESHOLD, source: "policy" };
}

export function formatContractAddress(contract: ManagementContractDraft): string {
  return [contract.streetAddress, contract.city, contract.state, contract.zip]
    .filter(Boolean)
    .join(", ");
}

export function formatTermRange(contract: ManagementContractDraft): string {
  const start = contract.contractStartDate || "—";
  const end = contract.contractEndDate || "Open-ended";
  return `${start} → ${end}`;
}

export type AgreementSection = {
  title: string;
  paragraphs: string[];
};

/** Build readable agreement sections from the same structured staff record. */
export function buildAgreementSections(
  contract: ManagementContractDraft
): AgreementSection[] {
  const fee = ownerFacingFeeSummary(contract);
  const threshold = resolveOwnerApprovalThreshold(contract);
  const address = formatContractAddress(contract) || "Address to be confirmed";

  return [
    {
      title: "1. Parties",
      paragraphs: [
        `This Property Management Agreement (the "Agreement") is between Harborline Management ("Manager") and ${
          contract.ownerLegalName || "the Owner"
        }${contract.ownerEntityType ? ` (${contract.ownerEntityType})` : ""} ("Owner").`,
        `Owner primary contact: ${contract.ownerContactName || "—"}${
          contract.ownerEmail ? `, ${contract.ownerEmail}` : ""
        }${contract.ownerPhone ? `, ${contract.ownerPhone}` : ""}.`,
        contract.ownerMailingAddress
          ? `Owner mailing address: ${contract.ownerMailingAddress}.`
          : "",
      ].filter(Boolean),
    },
    {
      title: "2. Property covered",
      paragraphs: [
        `Manager shall manage the commercial property known as ${
          contract.propertyName || "Untitled property"
        }, located at ${address}.`,
        `Property type: ${contract.propertyType}. Units/suites: ${
          contract.unitsSuites || "—"
        }. Rentable SF: ${contract.rentableSf || "—"}. Gross SF: ${
          contract.grossSf || "—"
        }.`,
        contract.camOrNnnStructure
          ? `Lease / recovery structure: ${contract.camOrNnnStructure}.`
          : "",
      ].filter(Boolean),
    },
    {
      title: "3. Term, renewal, and termination",
      paragraphs: [
        `Contract term: ${formatTermRange(contract)}.`,
        contract.renewalOptions
          ? `Renewal options: ${contract.renewalOptions}.`
          : "Renewal options: as mutually agreed in writing.",
        `Either party may terminate in accordance with a notice period of ${
          contract.terminationNoticeDays || "30"
        } days, unless otherwise stated in Special Terms.`,
        contract.exclusiveManagement
          ? "This is an exclusive management engagement for the Property during the term."
          : "This engagement is non-exclusive unless otherwise stated in Special Terms.",
      ],
    },
    {
      title: "4. Management fees",
      paragraphs: [
        `Management fee structure: ${feeStructureLabel(contract.feeStructure)} (${fee}).`,
        contract.leasingCommissionPercent
          ? `Leasing commission: ${contract.leasingCommissionPercent}%.`
          : "",
        contract.constructionMgmtFeePercent
          ? `Construction / project management fee: ${contract.constructionMgmtFeePercent}%.`
          : "",
        contract.otherFeeNotes
          ? `Additional fee notes: ${contract.otherFeeNotes}`
          : "",
      ].filter(Boolean),
    },
    {
      title: "5. Owner approval of expenditures",
      paragraphs: [
        `Manager shall obtain Owner approval before committing to expenditures at or above $${threshold.amount.toLocaleString()} ${
          threshold.source === "contract"
            ? "(as specified in this Agreement)"
            : "(Harborline default approval policy)"
        }, except for emergencies protecting life, safety, or the Property.`,
      ],
    },
    {
      title: "6. Insurance and liability",
      paragraphs: [
        contract.insuranceRequirements
          ? contract.insuranceRequirements
          : "Insurance and liability requirements shall be as reasonably required by Manager and Owner and documented separately if not listed here.",
      ],
    },
    {
      title: "7. Operations and service commitments",
      paragraphs: [
        contract.assignedManager
          ? `Assigned property manager: ${contract.assignedManager}.`
          : "Harborline will assign a property manager for day-to-day operations.",
        contract.preferredVendors
          ? `Preferred vendors: ${contract.preferredVendors}.`
          : "",
        contract.knownIssues
          ? `Known issues at commencement: ${contract.knownIssues}.`
          : "",
      ].filter(Boolean),
    },
    {
      title: "8. Special terms",
      paragraphs: [
        contract.specialTerms ||
          "No additional special terms were recorded on this agreement.",
      ],
    },
    {
      title: "9. Notes",
      paragraphs: [
        contract.notes || "No additional notes were recorded on this agreement.",
      ],
    },
  ];
}
