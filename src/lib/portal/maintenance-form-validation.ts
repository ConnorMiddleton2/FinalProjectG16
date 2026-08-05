import type {
  MaintenanceAttachmentMeta,
  MaintenanceFormErrors,
  MaintenanceFormValues,
} from "@/lib/portal/maintenance-types";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB each
export const MAX_ATTACHMENTS = 5;

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
] as const;

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
  const lower = file.name.toLowerCase();
  const extOk = ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) =>
    lower.endsWith(ext)
  );
  const typeOk =
    !file.type ||
    (ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(file.type);

  if (!extOk && !typeOk) {
    return "Attachments must be JPG, PNG, WEBP, or PDF.";
  }
  if (file.size <= 0) {
    return "One of the selected files is empty.";
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "Each attachment must be 5 MB or smaller.";
  }
  return null;
}

function isPlausiblePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isPlausibleEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
  }
  if (!values.description.trim()) {
    errors.description = "Describe the issue in detail.";
  } else if (values.description.trim().length < 20) {
    errors.description = "Please add more detail (at least 20 characters).";
  }
  if (!values.locationInUnit.trim()) {
    errors.locationInUnit = "Say where the issue is inside the unit.";
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
  }
  if (!values.petsInUnit) {
    errors.petsInUnit = "Indicate whether pets are in the unit.";
  }
  if (!values.recurringIssue) {
    errors.recurringIssue = "Tell us if this issue has happened before.";
  }
  if (values.noticedOn) {
    const noticed = new Date(`${values.noticedOn}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(noticed.getTime())) {
      errors.noticedOn = "Enter a valid date.";
    } else if (noticed > today) {
      errors.noticedOn = "Date noticed cannot be in the future.";
    }
  }
  if (values.preferredServiceDate) {
    const preferred = new Date(`${values.preferredServiceDate}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(preferred.getTime())) {
      errors.preferredServiceDate = "Enter a valid preferred service date.";
    } else if (preferred < today) {
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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
