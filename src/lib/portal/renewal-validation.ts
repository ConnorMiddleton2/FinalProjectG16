import type { RenewalDraft } from "@/lib/portal/renewal-types";
import {
  enforceMaxLength,
  PORTAL_MAX_MEDIUM_TEXT,
} from "@/lib/portal/validation-utils";

export const RENEWAL_MESSAGE_MAX = PORTAL_MAX_MEDIUM_TEXT;

export type RenewalFormErrors = Partial<{
  preferredTermId: string;
  message: string;
  form: string;
}>;

export function validateRenewalTerm(preferredTermId: string): RenewalFormErrors {
  const errors: RenewalFormErrors = {};
  if (!preferredTermId) {
    errors.preferredTermId = "Select a preferred renewal term to continue.";
  }
  return errors;
}

export function validateRenewalDraft(draft: RenewalDraft): RenewalFormErrors {
  const errors = validateRenewalTerm(draft.preferredTermId);
  if (draft.message.trim()) {
    const max = enforceMaxLength(
      draft.message,
      RENEWAL_MESSAGE_MAX,
      "Message"
    );
    if (max) errors.message = max;
  }
  return errors;
}
