import type {
  MaintenanceAttachmentMeta,
  MaintenanceFormErrors,
  MaintenanceFormValues,
} from "@/lib/portal/maintenance-types";
import {
  enforceMaxLength,
  isAllowedPortalAttachment,
  isIsoDateNotFuture,
  isIsoDateNotPast,
  isPlausibleEmail,
  isPlausiblePhone,
  parseIsoDateLocal,
  PORTAL_MAX_LONG_TEXT,
  PORTAL_MAX_MEDIUM_TEXT,
  PORTAL_MAX_NAME_LENGTH,
  PORTAL_MAX_SHORT_TEXT,
  PORTAL_MAX_ATTACHMENT_BYTES,
  formatPortalFileSize,
} from "@/lib/portal/validation-utils";

export const MAX_ATTACHMENT_BYTES = PORTAL_MAX_ATTACHMENT_BYTES;
export const MAX_ATTACHMENTS = 5;
export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = PORTAL_MAX_LONG_TEXT;
export const NOTES_MAX = PORTAL_MAX_MEDIUM_TEXT;

export {
  PORTAL_ALLOWED_ATTACHMENT_TYPES as ALLOWED_ATTACHMENT_TYPES,
  PORTAL_ALLOWED_ATTACHMENT_EXTENSIONS as ALLOWED_ATTACHMENT_EXTENSIONS,
} from "@/lib/portal/validation-utils";

export const EMPTY_MAINTENANCE_FORM: MaintenanceFormValues = {
  propertyOrUnit: "",
  category: "",
  title: "",
  description: "",
  locationInUnit: "",
  priority: "",
  permissionToEnter: "",
  preferredContactMethod: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  bestContactTime: "",
  petsInUnit: "",
  safetyConcerns: "",
  noticedOn: "",
  recurringIssue: "",
  preferredServiceDate: "",
  preferredServiceWindow: "",
  accessNotes: "",
  attachments: [],
};

export function isAllowedAttachment(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  return isAllowedPortalAttachment(file);
}

export function validateMaintenanceForm(
  values: MaintenanceFormValues
): MaintenanceFormErrors {
  const errors: MaintenanceFormErrors = {};

  if (!values.propertyOrUnit.trim()) {
    errors.propertyOrUnit = "Select the unit or property.";
  }
  if (!values.category) {
    errors.category = "Select a category.";
  }
  if (!values.title.trim()) {
    errors.title = "Enter a short title.";
  } else if (values.title.trim().length < 4) {
    errors.title = "Title must be at least 4 characters.";
  } else {
    const max = enforceMaxLength(values.title, TITLE_MAX, "Title");
    if (max) errors.title = max;
  }
  if (!values.description.trim()) {
    errors.description = "Describe the issue in detail.";
  } else if (values.description.trim().length < 20) {
    errors.description = "Please add more detail (at least 20 characters).";
  } else {
    const max = enforceMaxLength(
      values.description,
      DESCRIPTION_MAX,
      "Description"
    );
    if (max) errors.description = max;
  }
  if (!values.locationInUnit.trim()) {
    errors.locationInUnit = "Say where the issue is inside the unit.";
  } else {
    const max = enforceMaxLength(
      values.locationInUnit,
      PORTAL_MAX_SHORT_TEXT,
      "Location"
    );
    if (max) errors.locationInUnit = max;
  }
  if (!values.priority) {
    errors.priority = "Select a priority.";
  }
  if (!values.permissionToEnter) {
    errors.permissionToEnter = "Tell us if we may enter.";
  }
  if (!values.preferredContactMethod) {
    errors.preferredContactMethod = "Select a preferred contact method.";
  }
  if (!values.contactName.trim()) {
    errors.contactName = "Enter your name.";
  } else {
    const max = enforceMaxLength(
      values.contactName,
      PORTAL_MAX_NAME_LENGTH,
      "Name"
    );
    if (max) errors.contactName = max;
  }
  if (
    values.preferredContactMethod === "phone" ||
    values.preferredContactMethod === "text"
  ) {
    if (!values.contactPhone.trim()) {
      errors.contactPhone = "Enter a phone number for this contact method.";
    } else if (!isPlausiblePhone(values.contactPhone)) {
      errors.contactPhone = "Enter a valid phone number (at least 10 digits).";
    }
  } else if (
    values.contactPhone.trim() &&
    !isPlausiblePhone(values.contactPhone)
  ) {
    errors.contactPhone = "Enter a valid phone number (at least 10 digits).";
  }
  if (values.preferredContactMethod === "email") {
    if (!values.contactEmail.trim()) {
      errors.contactEmail = "Enter an email address for this contact method.";
    } else if (!isPlausibleEmail(values.contactEmail)) {
      errors.contactEmail = "Enter a valid email address.";
    }
  } else if (
    values.contactEmail.trim() &&
    !isPlausibleEmail(values.contactEmail)
  ) {
    errors.contactEmail = "Enter a valid email address.";
  }
  if (!values.bestContactTime.trim()) {
    errors.bestContactTime = "Share the best time to contact you.";
  } else {
    const max = enforceMaxLength(
      values.bestContactTime,
      PORTAL_MAX_SHORT_TEXT,
      "Best contact time"
    );
    if (max) errors.bestContactTime = max;
  }
  if (!values.petsInUnit) {
    errors.petsInUnit = "Indicate whether pets are in the unit.";
  }
  if (!values.recurringIssue) {
    errors.recurringIssue = "Tell us if this issue has happened before.";
  }

  const safetyMax = enforceMaxLength(
    values.safetyConcerns,
    NOTES_MAX,
    "Safety concerns"
  );
  if (safetyMax) errors.safetyConcerns = safetyMax;

  const accessMax = enforceMaxLength(
    values.accessNotes,
    NOTES_MAX,
    "Access notes"
  );
  if (accessMax) errors.accessNotes = accessMax;

  if (values.noticedOn) {
    if (!parseIsoDateLocal(values.noticedOn)) {
      errors.noticedOn = "Enter a valid date.";
    } else if (!isIsoDateNotFuture(values.noticedOn)) {
      errors.noticedOn = "Date noticed cannot be in the future.";
    }
  }
  if (values.preferredServiceDate) {
    if (!parseIsoDateLocal(values.preferredServiceDate)) {
      errors.preferredServiceDate = "Enter a valid preferred service date.";
    } else if (!isIsoDateNotPast(values.preferredServiceDate)) {
      errors.preferredServiceDate =
        "Preferred service date cannot be in the past.";
    }
  }

  if (values.attachments.length > MAX_ATTACHMENTS) {
    errors.attachments = `You can upload up to ${MAX_ATTACHMENTS} files.`;
  }

  return errors;
}

export function attachmentMetaFromFile(file: File): MaintenanceAttachmentMeta {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
  };
}

export function formatFileSize(bytes: number) {
  return formatPortalFileSize(bytes);
}
