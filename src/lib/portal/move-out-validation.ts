import type {
  MoveOutContext,
  MoveOutFormErrors,
  MoveOutFormValues,
  MoveOutStatus,
} from "@/lib/portal/move-out-types";

export function formatMoveOutDate(isoDate: string | null | undefined) {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatMoveOutDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function moveOutStatusClass(status: MoveOutStatus) {
  switch (status) {
    case "Not Started":
      return "badge-ghost";
    case "Submitted":
      return "badge-info";
    case "Under Review":
      return "badge-warning";
    case "Acknowledged":
      return "badge-success";
    case "Inspection Scheduled":
      return "badge-primary";
    case "Completed":
      return "badge-success";
    case "Cancelled":
      return "badge-ghost";
    default:
      return "badge-ghost";
  }
}

export function isMoveOutAcknowledgedOrLater(status: MoveOutStatus) {
  return (
    status === "Acknowledged" ||
    status === "Inspection Scheduled" ||
    status === "Completed"
  );
}

export function canStartNewMoveOutNotice(status: MoveOutStatus | null) {
  if (!status || status === "Not Started") return true;
  return status === "Cancelled";
}

function parseIsoParts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y: y!, m: m!, d: d! };
}

function parseIso(iso: string) {
  const { y, m, d } = parseIsoParts(iso);
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(iso: string, days: number) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function daysBetween(fromIso: string, toIso: string) {
  const from = parseIso(fromIso).getTime();
  const to = parseIso(toIso).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Warn when the requested move-out date may violate the lease notice period.
 * Does not block submission — tenant can still proceed after acknowledging risk.
 */
export function getNoticePeriodWarning(
  context: MoveOutContext,
  requestedMoveOutDate: string
): string | null {
  if (!requestedMoveOutDate) return null;
  const requested = parseIso(requestedMoveOutDate);
  if (Number.isNaN(requested.getTime())) return null;

  const earliestCompliant = addDays(
    context.todayIso,
    context.requiredNoticeDays
  );
  const daysFromToday = daysBetween(context.todayIso, requestedMoveOutDate);

  if (daysFromToday < context.requiredNoticeDays) {
    return `Your requested move-out date (${formatMoveOutDate(requestedMoveOutDate)}) is only ${daysFromToday} day${daysFromToday === 1 ? "" : "s"} from today. The lease requires about ${context.requiredNoticeDays} days’ notice. The earliest date that typically satisfies that window from today is ${formatMoveOutDate(earliestCompliant)}. Management may still review a shorter notice, but it may violate the lease requirement.`;
  }

  const daysBeforeLeaseEnd = daysBetween(
    requestedMoveOutDate,
    context.leaseEndDate
  );
  if (
    requestedMoveOutDate === context.leaseEndDate ||
    (daysBeforeLeaseEnd >= 0 && daysBeforeLeaseEnd < context.requiredNoticeDays)
  ) {
    // Ending near lease end is fine if notice was given early enough from today —
    // already covered. Extra check: if requesting lease end but submitting late
    // relative to the 60-days-before-lease-end deadline.
  }

  const noticeDeadlineForTermEnd = addDays(
    context.leaseEndDate,
    -context.requiredNoticeDays
  );
  if (
    requestedMoveOutDate >= context.leaseEndDate &&
    context.todayIso > noticeDeadlineForTermEnd
  ) {
    return `To end at the lease end date (${formatMoveOutDate(context.leaseEndDate)}), written notice is typically due by ${formatMoveOutDate(noticeDeadlineForTermEnd)}. Today’s date may fall after that notice deadline. Management must still acknowledge this notice before it is treated as approved.`;
  }

  return null;
}

import {
  enforceMaxLength,
  isPlausibleEmail,
  isPlausiblePhone,
  PORTAL_MAX_ADDRESS_LENGTH,
  PORTAL_MAX_MEDIUM_TEXT,
  PORTAL_MAX_NAME_LENGTH,
} from "@/lib/portal/validation-utils";

export function validateMoveOutForm(
  values: MoveOutFormValues,
  context: MoveOutContext
): MoveOutFormErrors {
  const errors: MoveOutFormErrors = {};

  if (!values.requestedMoveOutDate) {
    errors.requestedMoveOutDate = "Select a requested move-out date.";
  } else {
    const requested = parseIso(values.requestedMoveOutDate);
    const today = parseIso(context.todayIso);
    if (Number.isNaN(requested.getTime())) {
      errors.requestedMoveOutDate = "Enter a valid move-out date.";
    } else if (requested < today) {
      errors.requestedMoveOutDate = "Move-out date cannot be in the past.";
    }
  }

  if (!values.reason) {
    errors.reason = "Select a reason for moving.";
  } else if (values.reason === "Other") {
    if (!values.reasonOther.trim()) {
      errors.reasonOther = "Describe the reason for moving.";
    } else {
      const max = enforceMaxLength(
        values.reasonOther,
        PORTAL_MAX_MEDIUM_TEXT,
        "Other reason"
      );
      if (max) errors.reasonOther = max;
    }
  }

  if (
    !values.forwardingAddress.trim() ||
    values.forwardingAddress.trim().length < 10
  ) {
    errors.forwardingAddress = "Enter a complete forwarding address.";
  } else {
    const max = enforceMaxLength(
      values.forwardingAddress,
      PORTAL_MAX_ADDRESS_LENGTH,
      "Forwarding address"
    );
    if (max) errors.forwardingAddress = max;
  }

  if (!values.preferredInspectionDate) {
    errors.preferredInspectionDate = "Select a preferred inspection date.";
  } else if (
    values.requestedMoveOutDate &&
    values.preferredInspectionDate > values.requestedMoveOutDate
  ) {
    errors.preferredInspectionDate =
      "Preferred inspection should be on or before the move-out date.";
  } else if (values.preferredInspectionDate < context.todayIso) {
    errors.preferredInspectionDate = "Inspection date cannot be in the past.";
  }

  if (!values.contactName.trim()) {
    errors.contactName = "Contact name is required.";
  } else {
    const max = enforceMaxLength(
      values.contactName,
      PORTAL_MAX_NAME_LENGTH,
      "Contact name"
    );
    if (max) errors.contactName = max;
  }
  if (!values.contactPhone.trim()) {
    errors.contactPhone = "Contact phone is required.";
  } else if (!isPlausiblePhone(values.contactPhone)) {
    errors.contactPhone = "Enter a valid phone number.";
  }
  if (!values.contactEmail.trim()) {
    errors.contactEmail = "Contact email is required.";
  } else if (!isPlausibleEmail(values.contactEmail)) {
    errors.contactEmail = "Enter a valid email address.";
  }

  if (values.notes.trim()) {
    const max = enforceMaxLength(
      values.notes,
      PORTAL_MAX_MEDIUM_TEXT,
      "Notes"
    );
    if (max) errors.notes = max;
  }

  if (!values.acknowledgment) {
    errors.acknowledgment =
      "Confirm that you understand this notice is not approved until management acknowledges it.";
  }

  return errors;
}

export function emptyMoveOutForm(context: MoveOutContext): MoveOutFormValues {
  return {
    requestedMoveOutDate: "",
    reason: "",
    reasonOther: "",
    forwardingAddress: "",
    preferredInspectionDate: "",
    contactName: context.tenantContactName,
    contactPhone: context.tenantContactPhone,
    contactEmail: context.tenantContactEmail,
    notes: "",
    acknowledgment: false,
  };
}
