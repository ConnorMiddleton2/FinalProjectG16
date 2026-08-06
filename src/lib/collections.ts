import type { TenantRecord } from "@/lib/tenants";
import {
  daysOverdueForReceivable,
  isQualifyingOverdueBaseRent,
  normalizeCustomerId,
  obligationDisplayId,
  openReceivableAmount,
  startOfDay,
  type RentalReceivable,
} from "@/lib/rental-receivables";

export { obligationDisplayId, normalizeCustomerId };

/** Simulated delivery only — never claim real delivery / “Delivered”. */
export type NoticeDeliveryStatus =
  | "Generated"
  | "Queued"
  | "Simulated sent"
  | "Failed"
  | "Failed — contact information incomplete"
  | "Failed — email missing"
  | "Failed — mailing address missing"
  | "Paused";

export type NoticeKind = "weekly_rent_overdue" | "day90_escalation";

export type CollectionsNotice = {
  id: string;
  /** Weekly: tenantId|obligationId|weekIndex. Day-90: tenantId|obligationId|day90-escalation */
  uniqueKey: string;
  tenantId: string;
  tenantName: string;
  property: string;
  unit: string;
  obligationId: string;
  receivableRecordId: string;
  unpaidAmount: number;
  originalDueDate: string;
  daysOverdue: number;
  noticeSequenceNumber: number;
  overdueWeekIndex: number;
  noticeType: NoticeKind;
  intendedEmail: string;
  intendedMailingAddress: string;
  generatedAt: string;
  /** Overall / legacy status — never “Delivered”. */
  deliveryStatus: NoticeDeliveryStatus;
  deliveryMethod: "simulated_email_and_mail";
  /** Per-channel simulated statuses. */
  emailChannelStatus: NoticeDeliveryStatus;
  postalChannelStatus: NoticeDeliveryStatus;
  subject: string;
  noticeSummary: string;
  /** Full notice body for preview / history. */
  noticeBody: string;
  nextNoticeDate: string;
  escalationDate: string;
  createdBy: "system" | "management";
  contactIncomplete: boolean;
  managementNotes?: string;
  /** True for weekly notice #12 (day 84). */
  isFinalPreEscalation?: boolean;
};

export type CollectionsAccountState = {
  id: string;
  tenantId: string;
  noticesPaused: boolean;
  pauseReason: string;
  pausedAt: string;
  pausedBy: string;
  accountDisputed: boolean;
  disputeNotes: string;
  disputedAt: string;
  disputedBy: string;
  paymentPlanApproved: boolean;
  paymentPlanNotes: string;
  paymentPlanApprovedAt: string;
  paymentPlanApprovedBy: string;
  updatedAt: string;
};

export type ManagementAlertReviewStatus =
  | "open"
  | "under_review"
  | "reviewed"
  | "closed";

export type ManagementAlertFollowUp =
  | "pending"
  | "monitoring"
  | "legal_consult"
  | "resolved"
  | "other";

export type ManagementAlert = {
  id: string;
  alertType: "eviction_review_90_day";
  tenantId: string;
  tenantName: string;
  property: string;
  unit: string;
  obligationId: string;
  receivableRecordId: string;
  oldestUnpaidDueDate: string;
  daysOverdue: number;
  overdueRentBalance: number;
  noticesGenerated: number;
  weeklyNoticesCount: number;
  lastNoticeDate: string;
  notice12Date: string;
  day90EscalationNoticeDate: string;
  managementNotifiedAt: string;
  createdAt: string;
  reviewStatus: ManagementAlertReviewStatus;
  reviewedAt: string;
  reviewedBy: string;
  decision: string;
  notes: string;
  followUpStatus: ManagementAlertFollowUp;
  /** Human-readable internal status — not a legal authorization. */
  collectionsStatusLabel: string;
};

export const EVICTION_REVIEW_STATUS_LABEL =
  "90+ days overdue — management and legal review required.";

export type CollectionsStage =
  | "current"
  | "overdue"
  | "days_30"
  | "days_60"
  | "days_90_review"
  | "paused"
  | "payment_plan"
  | "disputed";

export type CollectionsFilter =
  | "all"
  | "any_overdue"
  | "days_30"
  | "days_60"
  | "days_90"
  | "review_required"
  | "notices_due"
  | "paused"
  | "payment_plan"
  | "disputed";

export const COLLECTIONS_FILTERS: {
  value: CollectionsFilter;
  label: string;
}[] = [
  { value: "all", label: "All collections statuses" },
  { value: "any_overdue", label: "Any overdue rent" },
  { value: "days_30", label: "30+ days overdue" },
  { value: "days_60", label: "60+ days overdue" },
  { value: "days_90", label: "90+ days overdue" },
  { value: "review_required", label: "Management review required" },
  { value: "notices_due", label: "Notices currently due" },
  { value: "paused", label: "Paused" },
  { value: "payment_plan", label: "Payment plan" },
  { value: "disputed", label: "Disputed" },
];

export type QualifyingObligation = {
  receivable: RentalReceivable;
  tenantId: string;
  openAmount: number;
  daysOverdue: number;
  overdueWeekIndex: number;
  completedOverdueWeeks: number;
};

export type TenantCollectionsSnapshot = {
  tenantId: string;
  qualifyingObligations: QualifyingObligation[];
  /** Sum of open amounts on qualifying overdue base_rent rows. */
  overdueRentBalance: number;
  oldestUnpaidDueDate: string;
  daysOverdue: number;
  completedOverdueWeeks: number;
  notices: CollectionsNotice[];
  weeklyNotices: CollectionsNotice[];
  day90EscalationNotice: CollectionsNotice | null;
  noticesGenerated: number;
  weeklyNoticesCount: number;
  lastNoticeDate: string;
  notice12Date: string;
  day90EscalationNoticeDate: string;
  nextNoticeDate: string;
  nextNoticeWeekIndex: number | null;
  noticesCurrentlyDue: boolean;
  escalationDate: string;
  stage: CollectionsStage;
  stageLabel: string;
  accountState: CollectionsAccountState | null;
  openAlert: ManagementAlert | null;
  managementReviewRequired: boolean;
  intendedEmail: string;
  intendedMailingAddress: string;
  contactIncomplete: boolean;
};

export function emptyAccountState(tenantId: string): CollectionsAccountState {
  const now = new Date().toISOString();
  return {
    id: accountStateId(tenantId),
    tenantId,
    noticesPaused: false,
    pauseReason: "",
    pausedAt: "",
    pausedBy: "",
    accountDisputed: false,
    disputeNotes: "",
    disputedAt: "",
    disputedBy: "",
    paymentPlanApproved: false,
    paymentPlanNotes: "",
    paymentPlanApprovedAt: "",
    paymentPlanApprovedBy: "",
    updatedAt: now,
  };
}

export function accountStateId(tenantId: string): string {
  return `cas-${normalizeCustomerId(tenantId)}`;
}

export function noticeUniqueKey(
  tenantId: string,
  obligationId: string,
  overdueWeekIndex: number
): string {
  return `${normalizeCustomerId(tenantId)}|${obligationId}|${overdueWeekIndex}`;
}

export function day90EscalationUniqueKey(
  tenantId: string,
  obligationId: string
): string {
  return `${normalizeCustomerId(tenantId)}|${obligationId}|day90-escalation`;
}

export function noticeRecordId(
  tenantId: string,
  obligationId: string,
  overdueWeekIndex: number
): string {
  const safeObl = obligationId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `cn-${normalizeCustomerId(tenantId)}-${safeObl}-w${overdueWeekIndex}`;
}

export function day90EscalationRecordId(
  tenantId: string,
  obligationId: string
): string {
  const safeObl = obligationId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `cn-${normalizeCustomerId(tenantId)}-${safeObl}-day90-escalation`;
}

export function managementAlertId(
  tenantId: string,
  obligationId: string
): string {
  const safeObl = obligationId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `ma-90-${normalizeCustomerId(tenantId)}-${safeObl}`;
}

/** Calendar date when the obligation reaches N completed overdue days. */
export function overdueThresholdDate(
  dueDate: string,
  overdueDays: number
): string {
  return addCalendarDays(dueDate, overdueDays);
}

export function addCalendarDays(isoDay: string, days: number): string {
  const d = new Date(`${isoDay.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatIsoDisplay(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export const GENERAL_90_DAY_ESCALATION_STATEMENT =
  "If the qualifying unpaid rent remains unresolved for 90 days after the due date, the account will be referred to Harborline management for management and legal review, which may include review of available lease-enforcement remedies.";

export function resolveChannelStatuses(contact: {
  email: string;
  mailingAddress: string;
}): {
  emailChannelStatus: NoticeDeliveryStatus;
  postalChannelStatus: NoticeDeliveryStatus;
  deliveryStatus: NoticeDeliveryStatus;
  contactIncomplete: boolean;
  contactWarning: string;
} {
  const emailChannelStatus: NoticeDeliveryStatus = contact.email
    ? "Generated"
    : "Failed — email missing";
  const postalChannelStatus: NoticeDeliveryStatus = contact.mailingAddress
    ? "Generated"
    : "Failed — mailing address missing";
  const contactIncomplete = !contact.email || !contact.mailingAddress;
  let deliveryStatus: NoticeDeliveryStatus = "Generated";
  let contactWarning = "";
  if (!contact.email && !contact.mailingAddress) {
    deliveryStatus = "Failed — contact information incomplete";
    contactWarning =
      "Contact information incomplete — email and postal delivery could not be completed.";
  } else if (!contact.email) {
    deliveryStatus = "Failed — email missing";
    contactWarning =
      "Contact information incomplete — notice could not be fully delivered.";
  } else if (!contact.mailingAddress) {
    deliveryStatus = "Failed — mailing address missing";
    contactWarning =
      "Contact information incomplete — notice could not be fully delivered.";
  }
  return {
    emailChannelStatus,
    postalChannelStatus,
    deliveryStatus,
    contactIncomplete,
    contactWarning,
  };
}

export function isWeeklyNotice(n: CollectionsNotice): boolean {
  return n.noticeType !== "day90_escalation";
}

export function isDay90EscalationNotice(n: CollectionsNotice): boolean {
  return (
    n.noticeType === "day90_escalation" ||
    n.uniqueKey.endsWith("|day90-escalation")
  );
}

export function stageLabel(stage: CollectionsStage): string {
  switch (stage) {
    case "current":
      return "Current";
    case "overdue":
      return "Overdue (< 30 days)";
    case "days_30":
      return "30+ days overdue";
    case "days_60":
      return "60+ days overdue";
    case "days_90_review":
      return EVICTION_REVIEW_STATUS_LABEL;
    case "paused":
      return "Notices paused";
    case "payment_plan":
      return "Approved payment plan";
    case "disputed":
      return "Disputed";
    default:
      return stage;
  }
}

export function listQualifyingObligations(
  receivables: RentalReceivable[],
  now = new Date()
): QualifyingObligation[] {
  const out: QualifyingObligation[] = [];
  for (const r of receivables) {
    if (!isQualifyingOverdueBaseRent(r, now)) continue;
    const days = daysOverdueForReceivable(r, now);
    if (days < 1) continue;
    const weekIndex = Math.floor(days / 7);
    out.push({
      receivable: r,
      tenantId: normalizeCustomerId(r.customerId),
      openAmount: openReceivableAmount(r),
      daysOverdue: days,
      overdueWeekIndex: weekIndex,
      completedOverdueWeeks: weekIndex,
    });
  }
  return out.sort((a, b) =>
    a.receivable.dueDate.localeCompare(b.receivable.dueDate)
  );
}

function noticesForTenant(
  notices: CollectionsNotice[],
  tenantId: string
): CollectionsNotice[] {
  const id = normalizeCustomerId(tenantId);
  return notices
    .filter((n) => normalizeCustomerId(n.tenantId) === id)
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
}

function maxNoticeWeekForObligation(
  notices: CollectionsNotice[],
  tenantId: string,
  obligationId: string
): number {
  let max = 0;
  const tid = normalizeCustomerId(tenantId);
  for (const n of notices) {
    if (normalizeCustomerId(n.tenantId) !== tid) continue;
    if (n.obligationId !== obligationId) continue;
    if (isDay90EscalationNotice(n)) continue;
    max = Math.max(max, n.overdueWeekIndex || n.noticeSequenceNumber || 0);
  }
  return max;
}

export function getTenantContact(tenant: TenantRecord): {
  email: string;
  mailingAddress: string;
  incomplete: boolean;
} {
  // Read-only: only undeclared contact fields on the tenants payload itself.
  // Do not pull owner, vendor, manager, or property_tenants contacts (no stable
  // tenants.id link for roster emails).
  const t = tenant as TenantRecord & {
    email?: string;
    primaryEmail?: string;
    mailingAddress?: string;
    address?: string;
  };
  const email = (t.email || t.primaryEmail || "").trim();
  const mailingAddress = (t.mailingAddress || t.address || "").trim();
  return {
    email,
    mailingAddress,
    incomplete: !email || !mailingAddress,
  };
}

export const MISSING_TENANT_CONTACT_MESSAGE =
  "No connected tenant email or mailing address is available.";

export const AMOUNT_DUE_HELPER =
  "Amount due is the sum of open Accounts Receivable balances. Collections aging uses only qualifying overdue base rent.";

export const CURRENT_RENT_DUE_HELPER =
  "Current rent due is the open balance on the most recent base-rent obligation due on or before today. Rent overdue and Days overdue apply only to qualifying overdue base rent.";

export function buildTenantCollectionsSnapshot(
  tenant: TenantRecord,
  receivables: RentalReceivable[],
  notices: CollectionsNotice[],
  accountStates: CollectionsAccountState[],
  alerts: ManagementAlert[],
  now = new Date()
): TenantCollectionsSnapshot {
  const tenantId = normalizeCustomerId(tenant.id);
  const qualifying = listQualifyingObligations(receivables, now).filter(
    (o) => o.tenantId === tenantId
  );
  const tenantNotices = noticesForTenant(notices, tenantId);
  const weeklyNotices = tenantNotices.filter((n) => isWeeklyNotice(n));
  const day90EscalationNotice =
    tenantNotices.find((n) => isDay90EscalationNotice(n)) ?? null;
  const accountState =
    accountStates.find(
      (s) => normalizeCustomerId(s.tenantId) === tenantId
    ) ?? null;

  const overdueRentBalance = qualifying.reduce((s, o) => s + o.openAmount, 0);
  const oldest = qualifying[0];
  const daysOverdue = oldest ? oldest.daysOverdue : 0;
  const oldestUnpaidDueDate = oldest ? oldest.receivable.dueDate : "";
  const completedOverdueWeeks = oldest ? oldest.completedOverdueWeeks : 0;
  const escalationDate = oldestUnpaidDueDate
    ? overdueThresholdDate(oldestUnpaidDueDate, 90)
    : "";

  const notice12 = weeklyNotices.find(
    (n) => n.noticeSequenceNumber === 12 || n.overdueWeekIndex === 12
  );
  const notice12Date = notice12 ? notice12.generatedAt.slice(0, 10) : "";
  const day90EscalationNoticeDate = day90EscalationNotice
    ? day90EscalationNotice.generatedAt.slice(0, 10)
    : "";

  const lastNoticeDate =
    weeklyNotices.length > 0
      ? weeklyNotices[weeklyNotices.length - 1].generatedAt.slice(0, 10)
      : "";

  let nextNoticeWeekIndex: number | null = null;
  let nextNoticeDate = "";
  let noticesCurrentlyDue = false;

  if (
    oldest &&
    completedOverdueWeeks >= 1 &&
    !(accountState?.noticesPaused) &&
    !(accountState?.accountDisputed) &&
    !(accountState?.paymentPlanApproved)
  ) {
    const maxWeek = maxNoticeWeekForObligation(
      weeklyNotices,
      tenantId,
      obligationDisplayId(oldest.receivable)
    );
    if (completedOverdueWeeks > maxWeek) {
      nextNoticeWeekIndex = maxWeek + 1;
      noticesCurrentlyDue = true;
      nextNoticeDate = addCalendarDays(
        oldest.receivable.dueDate,
        nextNoticeWeekIndex * 7
      );
    } else if (completedOverdueWeeks >= 1) {
      nextNoticeWeekIndex = completedOverdueWeeks + 1;
      nextNoticeDate = addCalendarDays(
        oldest.receivable.dueDate,
        nextNoticeWeekIndex * 7
      );
    }
  }

  const openAlert =
    alerts.find(
      (a) =>
        normalizeCustomerId(a.tenantId) === tenantId &&
        (a.reviewStatus === "open" || a.reviewStatus === "under_review")
    ) ?? null;

  const managementReviewRequired =
    daysOverdue >= 90 ||
    !!openAlert ||
    !!day90EscalationNotice ||
    alerts.some(
      (a) =>
        normalizeCustomerId(a.tenantId) === tenantId &&
        a.reviewStatus !== "closed"
    );

  let stage: CollectionsStage = "current";
  if (accountState?.paymentPlanApproved) stage = "payment_plan";
  else if (accountState?.accountDisputed) stage = "disputed";
  else if (accountState?.noticesPaused) stage = "paused";
  else if (daysOverdue >= 90) stage = "days_90_review";
  else if (daysOverdue >= 60) stage = "days_60";
  else if (daysOverdue >= 30) stage = "days_30";
  else if (daysOverdue >= 1) stage = "overdue";

  const contact = getTenantContact(tenant);

  return {
    tenantId,
    qualifyingObligations: qualifying,
    overdueRentBalance,
    oldestUnpaidDueDate,
    daysOverdue,
    completedOverdueWeeks,
    notices: tenantNotices,
    weeklyNotices,
    day90EscalationNotice,
    noticesGenerated: tenantNotices.length,
    weeklyNoticesCount: weeklyNotices.length,
    lastNoticeDate,
    notice12Date,
    day90EscalationNoticeDate,
    nextNoticeDate,
    nextNoticeWeekIndex,
    noticesCurrentlyDue,
    escalationDate,
    stage,
    stageLabel: stageLabel(stage),
    accountState,
    openAlert,
    managementReviewRequired,
    intendedEmail: contact.email,
    intendedMailingAddress: contact.mailingAddress,
    contactIncomplete: contact.incomplete,
  };
}

export function matchesCollectionsFilter(
  snap: TenantCollectionsSnapshot,
  filter: CollectionsFilter
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "any_overdue":
      return snap.daysOverdue >= 1 && snap.overdueRentBalance > 0;
    case "days_30":
      return snap.daysOverdue >= 30;
    case "days_60":
      return snap.daysOverdue >= 60;
    case "days_90":
      return snap.daysOverdue >= 90;
    case "review_required":
      return snap.managementReviewRequired || snap.stage === "days_90_review";
    case "notices_due":
      return snap.noticesCurrentlyDue;
    case "paused":
      return !!snap.accountState?.noticesPaused;
    case "payment_plan":
      return !!snap.accountState?.paymentPlanApproved;
    case "disputed":
      return !!snap.accountState?.accountDisputed;
    default:
      return true;
  }
}

export function buildNoticeDraft(input: {
  tenant: TenantRecord;
  obligation: QualifyingObligation;
  weekIndex: number;
  createdBy: "system" | "management";
  now?: Date;
  generatedAt?: string;
  priorWeeklyCount?: number;
}): CollectionsNotice {
  const now = input.now ?? new Date();
  const { tenant, obligation, weekIndex, createdBy } = input;
  const r = obligation.receivable;
  const obligationId = obligationDisplayId(r);
  const tenantId = normalizeCustomerId(tenant.id);
  const contact = getTenantContact(tenant);
  const channels = resolveChannelStatuses(contact);
  const daysAtWeekComplete = weekIndex * 7;
  const days = Math.max(obligation.daysOverdue, daysAtWeekComplete);
  const uniqueKey = noticeUniqueKey(tenantId, obligationId, weekIndex);
  const noticeDueDay = addCalendarDays(r.dueDate, weekIndex * 7);
  const generatedAt =
    input.generatedAt ??
    (createdBy === "system"
      ? new Date(`${noticeDueDay}T12:00:00`).toISOString()
      : now.toISOString());
  const escalationDate = overdueThresholdDate(r.dueDate, 90);
  const nextNoticeDate = addCalendarDays(r.dueDate, (weekIndex + 1) * 7);
  const balance = formatMoney(openReceivableAmount(r));
  const property = tenant.propertyLeased || r.property || "";
  const unit = tenant.unit || r.unit || "";
  const isFinalPreEscalation = weekIndex === 12;
  const priorCount = input.priorWeeklyCount ?? Math.max(0, weekIndex - 1);

  const headerFacts = [
    `Tenant: ${tenant.name}`,
    `Property: ${property}`,
    `Unit: ${unit || "—"}`,
    `Related rent obligation: ${obligationId}`,
    `Original due date: ${formatIsoDisplay(r.dueDate)}`,
    `Current overdue balance: ${balance}`,
    `Days overdue (at this notice interval): ${daysAtWeekComplete}`,
    `Notice sequence number: ${weekIndex}`,
    `Notice generated date: ${formatIsoDisplay(generatedAt.slice(0, 10))}`,
    `Next notice date: ${formatIsoDisplay(nextNoticeDate)}`,
    `Intended email address: ${contact.email || "Not on file"}`,
    `Intended mailing address: ${contact.mailingAddress || "Not on file"}`,
  ].join("\n");

  let subject: string;
  let noticeBody: string;

  if (isFinalPreEscalation) {
    subject = `Final pre-escalation notice — 6 days remaining before management review — ${tenant.name}`;
    noticeBody = [
      "Final pre-escalation notice — 6 days remaining before management review",
      "",
      `This is the twelfth weekly notice regarding the unresolved rent obligation identified below. If the qualifying unpaid balance remains unresolved on ${formatIsoDisplay(escalationDate)}, Harborline management will be notified and the account will enter management and legal review. This review may include consideration of available lease-enforcement remedies. This notice does not state that an eviction has already occurred or that eviction is automatic.`,
      "",
      headerFacts,
      `Exact 90-day escalation date: ${formatIsoDisplay(escalationDate)}`,
      `Previous weekly notices generated: ${priorCount}`,
      "Next required action: Pay the qualifying unpaid balance, submit a written dispute, or contact Harborline management immediately.",
      "Instructions: Remit payment for the overdue rent, document any approved dispute, or contact management regarding a payment arrangement before the escalation date.",
      "Warning: Unresolved qualifying rent at day 90 will be referred to Harborline management and legal review.",
      GENERAL_90_DAY_ESCALATION_STATEMENT,
      channels.contactWarning,
      "Simulated notice only — no email or postal delivery was performed.",
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    subject = `Rent overdue notice #${weekIndex} — ${tenant.name}`;
    noticeBody = [
      `Weekly overdue notice #${weekIndex}`,
      "",
      headerFacts,
      "",
      GENERAL_90_DAY_ESCALATION_STATEMENT,
      "This notice does not state that eviction is automatic.",
      channels.contactWarning,
      "Simulated notice only — no email or postal delivery was performed.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const noticeSummary = noticeBody.replace(/\n+/g, " ").trim();

  return {
    id: noticeRecordId(tenantId, obligationId, weekIndex),
    uniqueKey,
    tenantId,
    tenantName: tenant.name,
    property,
    unit,
    obligationId,
    receivableRecordId: r.id,
    unpaidAmount: openReceivableAmount(r),
    originalDueDate: r.dueDate,
    daysOverdue: days,
    noticeSequenceNumber: weekIndex,
    overdueWeekIndex: weekIndex,
    noticeType: "weekly_rent_overdue",
    intendedEmail: contact.email,
    intendedMailingAddress: contact.mailingAddress,
    generatedAt,
    deliveryStatus: channels.deliveryStatus,
    deliveryMethod: "simulated_email_and_mail",
    emailChannelStatus: channels.emailChannelStatus,
    postalChannelStatus: channels.postalChannelStatus,
    subject,
    noticeSummary,
    noticeBody,
    nextNoticeDate,
    escalationDate,
    createdBy,
    contactIncomplete: channels.contactIncomplete,
    isFinalPreEscalation,
  };
}

export function buildDay90EscalationDraft(input: {
  tenant: TenantRecord;
  obligation: QualifyingObligation;
  weeklyNotices: CollectionsNotice[];
  createdBy?: "system" | "management";
  now?: Date;
  reviewStatus?: string;
}): CollectionsNotice {
  const now = input.now ?? new Date();
  const { tenant, obligation } = input;
  const r = obligation.receivable;
  const obligationId = obligationDisplayId(r);
  const tenantId = normalizeCustomerId(tenant.id);
  const contact = getTenantContact(tenant);
  const channels = resolveChannelStatuses(contact);
  const escalationDate = overdueThresholdDate(r.dueDate, 90);
  const generatedAt = new Date(`${escalationDate}T12:00:00`).toISOString();
  const weekly = input.weeklyNotices
    .filter(
      (n) =>
        isWeeklyNotice(n) &&
        n.obligationId === obligationId &&
        normalizeCustomerId(n.tenantId) === tenantId
    )
    .sort((a, b) => a.overdueWeekIndex - b.overdueWeekIndex);
  const priorDates = weekly
    .map(
      (n) =>
        `#${n.noticeSequenceNumber}: ${formatIsoDisplay(n.generatedAt.slice(0, 10))}`
    )
    .join("; ");
  const balance = formatMoney(openReceivableAmount(r));
  const property = tenant.propertyLeased || r.property || "";
  const unit = tenant.unit || r.unit || "";
  const days = Math.max(obligation.daysOverdue, 90);
  const reviewStatus = input.reviewStatus || "open";

  const subject = `Day-90 management and legal review notification — ${tenant.name}`;
  const noticeBody = [
    "Day-90 escalation communication",
    "",
    "The qualifying unpaid rent obligation identified below has reached 90 days overdue. Harborline management has been notified, and the account has entered management and legal review. Management will evaluate the account, lease terms, payment history, notices, disputes, payment-plan status, and any other relevant information before determining the appropriate next steps. This notice does not mean that an eviction has already occurred or that eviction is automatic.",
    "",
    `Tenant: ${tenant.name}`,
    `Property: ${property}`,
    `Unit: ${unit || "—"}`,
    `Related rent obligation: ${obligationId}`,
    `Original due date: ${formatIsoDisplay(r.dueDate)}`,
    `Current overdue balance: ${balance}`,
    `Days overdue: ${days}`,
    `Number of prior weekly notices: ${weekly.length}`,
    `Prior weekly notice dates: ${priorDates || "None on file"}`,
    `Date management was notified: ${formatIsoDisplay(escalationDate)}`,
    `Current review status: ${reviewStatus}`,
    `Intended email address: ${contact.email || "Not on file"}`,
    `Intended mailing address: ${contact.mailingAddress || "Not on file"}`,
    "How to contact management: Reply to Harborline management through the authorized operations channel regarding payment, dispute, or documentation. Do not treat this notice as a court filing or eviction order.",
    channels.contactWarning,
    "Simulated notice only — no email or postal delivery was performed.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: day90EscalationRecordId(tenantId, obligationId),
    uniqueKey: day90EscalationUniqueKey(tenantId, obligationId),
    tenantId,
    tenantName: tenant.name,
    property,
    unit,
    obligationId,
    receivableRecordId: r.id,
    unpaidAmount: openReceivableAmount(r),
    originalDueDate: r.dueDate,
    daysOverdue: days,
    noticeSequenceNumber: 90,
    overdueWeekIndex: 0,
    noticeType: "day90_escalation",
    intendedEmail: contact.email,
    intendedMailingAddress: contact.mailingAddress,
    generatedAt,
    deliveryStatus: channels.deliveryStatus,
    deliveryMethod: "simulated_email_and_mail",
    emailChannelStatus: channels.emailChannelStatus,
    postalChannelStatus: channels.postalChannelStatus,
    subject,
    noticeSummary: noticeBody.replace(/\n+/g, " ").trim(),
    noticeBody,
    nextNoticeDate: "",
    escalationDate,
    createdBy: input.createdBy ?? "system",
    contactIncomplete: channels.contactIncomplete,
    isFinalPreEscalation: false,
  };
}

/**
 * Idempotent catch-up: missing weekly notices + day-90 escalation communications.
 */
export function planMissingNoticeCatchUp(input: {
  tenants: TenantRecord[];
  receivables: RentalReceivable[];
  notices: CollectionsNotice[];
  accountStates: CollectionsAccountState[];
  now?: Date;
}): CollectionsNotice[] {
  const now = input.now ?? new Date();
  const existingKeys = new Set(
    input.notices.flatMap((n) => [n.uniqueKey, n.id])
  );
  const byTenant = new Map(
    input.tenants.map((t) => [normalizeCustomerId(t.id), t])
  );
  const accountByTenant = new Map(
    input.accountStates.map((s) => [normalizeCustomerId(s.tenantId), s])
  );

  const missing: CollectionsNotice[] = [];
  const qualifying = listQualifyingObligations(input.receivables, now);

  for (const obligation of qualifying) {
    const tenant = byTenant.get(obligation.tenantId);
    if (!tenant) continue;

    const account = accountByTenant.get(obligation.tenantId);
    if (
      account?.noticesPaused ||
      account?.accountDisputed ||
      account?.paymentPlanApproved
    ) {
      continue;
    }

    const obligationId = obligationDisplayId(obligation.receivable);
    const weeksCompleted = Math.floor(obligation.daysOverdue / 7);
    const tenantWeeklyExisting = input.notices.filter(
      (n) =>
        normalizeCustomerId(n.tenantId) === obligation.tenantId &&
        n.obligationId === obligationId &&
        isWeeklyNotice(n)
    );

    if (weeksCompleted >= 1) {
      for (let week = 1; week <= weeksCompleted; week++) {
        const key = noticeUniqueKey(obligation.tenantId, obligationId, week);
        const id = noticeRecordId(obligation.tenantId, obligationId, week);
        if (existingKeys.has(key) || existingKeys.has(id)) continue;

        const draft = buildNoticeDraft({
          tenant,
          obligation,
          weekIndex: week,
          createdBy: "system",
          now,
          priorWeeklyCount: week - 1,
        });
        if (existingKeys.has(draft.uniqueKey) || existingKeys.has(draft.id)) {
          continue;
        }
        existingKeys.add(draft.uniqueKey);
        existingKeys.add(draft.id);
        missing.push(draft);
        tenantWeeklyExisting.push(draft);
      }
    }

    if (obligation.daysOverdue >= 90) {
      const d90Key = day90EscalationUniqueKey(
        obligation.tenantId,
        obligationId
      );
      const d90Id = day90EscalationRecordId(obligation.tenantId, obligationId);
      if (!existingKeys.has(d90Key) && !existingKeys.has(d90Id)) {
        const allWeekly = [
          ...tenantWeeklyExisting,
          ...missing.filter(
            (n) =>
              normalizeCustomerId(n.tenantId) === obligation.tenantId &&
              n.obligationId === obligationId &&
              isWeeklyNotice(n)
          ),
        ];
        const draft = buildDay90EscalationDraft({
          tenant,
          obligation,
          weeklyNotices: allWeekly,
          createdBy: "system",
          now,
        });
        if (!existingKeys.has(draft.uniqueKey) && !existingKeys.has(draft.id)) {
          existingKeys.add(draft.uniqueKey);
          existingKeys.add(draft.id);
          missing.push(draft);
        }
      }
    }
  }

  return missing;
}

/**
 * Safely refresh template content on existing system-generated notices.
 * Preserves id, uniqueKey, sequence, generatedAt, obligation, delivery history,
 * and any manager notes / Simulated sent channel statuses.
 */
export function planNoticeTemplateRefresh(input: {
  tenants: TenantRecord[];
  receivables: RentalReceivable[];
  notices: CollectionsNotice[];
  now?: Date;
}): CollectionsNotice[] {
  const now = input.now ?? new Date();
  const byTenant = new Map(
    input.tenants.map((t) => [normalizeCustomerId(t.id), t])
  );
  const qualifying = listQualifyingObligations(input.receivables, now);
  const updates: CollectionsNotice[] = [];

  for (const existing of input.notices) {
    if (existing.managementNotes?.trim()) continue;
    if (existing.createdBy === "management") continue;
    if (existing.deliveryStatus === "Simulated sent") continue;
    if (existing.emailChannelStatus === "Simulated sent") continue;
    if (existing.postalChannelStatus === "Simulated sent") continue;

    const tenant = byTenant.get(normalizeCustomerId(existing.tenantId));
    if (!tenant) continue;

    const obligation = qualifying.find(
      (o) =>
        o.tenantId === normalizeCustomerId(existing.tenantId) &&
        obligationDisplayId(o.receivable) === existing.obligationId
    );
    if (!obligation) continue;

    let refreshed: CollectionsNotice;
    if (isDay90EscalationNotice(existing)) {
      const weekly = input.notices.filter(
        (n) =>
          normalizeCustomerId(n.tenantId) === existing.tenantId &&
          n.obligationId === existing.obligationId &&
          isWeeklyNotice(n)
      );
      refreshed = buildDay90EscalationDraft({
        tenant,
        obligation,
        weeklyNotices: weekly,
        createdBy: "system",
        now,
      });
    } else {
      const week =
        existing.overdueWeekIndex || existing.noticeSequenceNumber || 0;
      if (week < 1) continue;
      refreshed = buildNoticeDraft({
        tenant,
        obligation,
        weekIndex: week,
        createdBy: "system",
        now,
        generatedAt: existing.generatedAt,
        priorWeeklyCount: Math.max(0, week - 1),
      });
    }

    // Preserve identity + chronology + any protected delivery fields.
    const merged: CollectionsNotice = {
      ...refreshed,
      id: existing.id,
      uniqueKey: existing.uniqueKey,
      generatedAt: existing.generatedAt,
      createdBy: existing.createdBy || "system",
      managementNotes: existing.managementNotes,
      noticeSequenceNumber: existing.noticeSequenceNumber,
      overdueWeekIndex: existing.overdueWeekIndex,
      obligationId: existing.obligationId,
      receivableRecordId: existing.receivableRecordId,
    };

    const changed =
      merged.subject !== existing.subject ||
      merged.noticeBody !== (existing.noticeBody || "") ||
      merged.noticeSummary !== existing.noticeSummary ||
      merged.emailChannelStatus !== existing.emailChannelStatus ||
      merged.postalChannelStatus !== existing.postalChannelStatus ||
      merged.deliveryStatus !== existing.deliveryStatus ||
      merged.nextNoticeDate !== (existing.nextNoticeDate || "") ||
      merged.escalationDate !== (existing.escalationDate || "") ||
      !!merged.isFinalPreEscalation !== !!existing.isFinalPreEscalation ||
      merged.noticeType !== existing.noticeType;

    if (changed) updates.push(merged);
  }

  return updates;
}

/** Next week index that should be generated for the oldest obligation, or null. */
export function nextDueNoticeWeek(
  snap: TenantCollectionsSnapshot
): number | null {
  if (
    !snap.qualifyingObligations.length ||
    snap.accountState?.noticesPaused ||
    snap.accountState?.accountDisputed ||
    snap.accountState?.paymentPlanApproved
  ) {
    return null;
  }
  const oldest = snap.qualifyingObligations[0];
  if (oldest.completedOverdueWeeks < 1) return null;
  const obligationId = obligationDisplayId(oldest.receivable);
  const maxWeek = maxNoticeWeekForObligation(
    snap.weeklyNotices,
    snap.tenantId,
    obligationId
  );
  if (oldest.completedOverdueWeeks > maxWeek) {
    return maxWeek + 1;
  }
  return null;
}

export function buildManagementAlertFromSnapshot(
  tenant: TenantRecord,
  snap: TenantCollectionsSnapshot,
  now = new Date()
): ManagementAlert | null {
  if (snap.daysOverdue < 90 || !snap.qualifyingObligations.length) return null;
  const oldest = snap.qualifyingObligations[0];
  const obligationId = obligationDisplayId(oldest.receivable);
  const managementNotifiedAt =
    snap.day90EscalationNoticeDate ||
    overdueThresholdDate(oldest.receivable.dueDate, 90);
  return {
    id: managementAlertId(tenant.id, obligationId),
    alertType: "eviction_review_90_day",
    tenantId: normalizeCustomerId(tenant.id),
    tenantName: tenant.name,
    property: tenant.propertyLeased || oldest.receivable.property || "",
    unit: tenant.unit || oldest.receivable.unit || "",
    obligationId,
    receivableRecordId: oldest.receivable.id,
    oldestUnpaidDueDate: oldest.receivable.dueDate,
    daysOverdue: snap.daysOverdue,
    overdueRentBalance: snap.overdueRentBalance,
    noticesGenerated: snap.noticesGenerated,
    weeklyNoticesCount: snap.weeklyNoticesCount,
    lastNoticeDate: snap.lastNoticeDate,
    notice12Date: snap.notice12Date,
    day90EscalationNoticeDate: snap.day90EscalationNoticeDate,
    managementNotifiedAt,
    createdAt: now.toISOString(),
    reviewStatus: "open",
    reviewedAt: "",
    reviewedBy: "",
    decision: "",
    notes: "",
    followUpStatus: "pending",
    collectionsStatusLabel: EVICTION_REVIEW_STATUS_LABEL,
  };
}

export function portfolioCollectionsInsights(
  snapshots: TenantCollectionsSnapshot[],
  notices: CollectionsNotice[],
  now = new Date()
) {
  const overdue = snapshots.filter((s) => s.daysOverdue >= 1);
  const month = now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
  const noticesThisMonth = notices.filter((n) => {
    const d = n.generatedAt.slice(0, 7);
    const [y, m] = d.split("-").map(Number);
    return y * 100 + m === month;
  });
  const failed = notices.filter(
    (n) =>
      n.deliveryStatus === "Failed" ||
      n.deliveryStatus === "Failed — contact information incomplete" ||
      n.deliveryStatus === "Failed — email missing" ||
      n.deliveryStatus === "Failed — mailing address missing" ||
      n.contactIncomplete
  );
  return {
    tenantsOverdue: overdue.length,
    totalOverdueRent: overdue.reduce((s, x) => s + x.overdueRentBalance, 0),
    noticesDueThisWeek: snapshots.filter((s) => s.noticesCurrentlyDue).length,
    noticesGeneratedThisMonth: noticesThisMonth.length,
    tenants30: snapshots.filter((s) => s.daysOverdue >= 30).length,
    tenants60: snapshots.filter((s) => s.daysOverdue >= 60).length,
    tenants90: snapshots.filter((s) => s.daysOverdue >= 90).length,
    evictionReviewsRequired: snapshots.filter(
      (s) => s.managementReviewRequired || s.daysOverdue >= 90
    ).length,
    failedOrIncompleteNotices: failed.length,
  };
}

export function isoToday(now = new Date()): string {
  const d = startOfDay(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
