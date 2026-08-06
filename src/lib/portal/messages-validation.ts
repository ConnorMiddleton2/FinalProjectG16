import type {
  MessageAttachment,
  NewMessageFormValues,
  ReplyFormValues,
} from "@/lib/portal/messages-types";
import {
  enforceMaxLength,
  isAllowedPortalAttachment,
  PORTAL_MAX_LONG_TEXT,
  PORTAL_MAX_SHORT_TEXT,
} from "@/lib/portal/validation-utils";

export const MESSAGE_SUBJECT_MAX = PORTAL_MAX_SHORT_TEXT;
export const MESSAGE_BODY_MAX = PORTAL_MAX_LONG_TEXT;
export const MESSAGE_BODY_MIN = 3;
export const MAX_MESSAGE_ATTACHMENTS = 3;

export type MessageFormErrors = Partial<{
  category: string;
  subject: string;
  body: string;
  attachments: string;
  form: string;
}>;

export function isAllowedMessageAttachment(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  return isAllowedPortalAttachment(file);
}

export function validateNewMessageForm(
  values: NewMessageFormValues
): MessageFormErrors {
  const errors: MessageFormErrors = {};

  if (!values.category) {
    errors.category = "Select a category.";
  }
  if (!values.subject.trim()) {
    errors.subject = "Enter a subject.";
  } else {
    const max = enforceMaxLength(
      values.subject,
      MESSAGE_SUBJECT_MAX,
      "Subject"
    );
    if (max) errors.subject = max;
  }
  if (!values.body.trim()) {
    errors.body = "Enter a message.";
  } else if (values.body.trim().length < MESSAGE_BODY_MIN) {
    errors.body = `Message must be at least ${MESSAGE_BODY_MIN} characters.`;
  } else {
    const max = enforceMaxLength(values.body, MESSAGE_BODY_MAX, "Message");
    if (max) errors.body = max;
  }
  if (values.attachments.length > MAX_MESSAGE_ATTACHMENTS) {
    errors.attachments = `You can attach up to ${MAX_MESSAGE_ATTACHMENTS} files.`;
  }

  return errors;
}

export function validateReplyForm(
  values: ReplyFormValues
): MessageFormErrors {
  const errors: MessageFormErrors = {};

  if (!values.body.trim()) {
    errors.body = "Enter a reply.";
  } else if (values.body.trim().length < MESSAGE_BODY_MIN) {
    errors.body = `Reply must be at least ${MESSAGE_BODY_MIN} characters.`;
  } else {
    const max = enforceMaxLength(values.body, MESSAGE_BODY_MAX, "Reply");
    if (max) errors.body = max;
  }
  if (values.attachments.length > MAX_MESSAGE_ATTACHMENTS) {
    errors.attachments = `You can attach up to ${MAX_MESSAGE_ATTACHMENTS} files.`;
  }

  return errors;
}

export function attachmentMetaFromFile(file: File): MessageAttachment {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()?.toUpperCase() ?? "FILE"
    : "FILE";
  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    fileType: ext.slice(0, 8),
    fileSizeBytes: file.size,
  };
}
