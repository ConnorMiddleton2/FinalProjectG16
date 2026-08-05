/** Temporary browser profile for signed-out / demo applicants. */

export const APPLICANT_PROFILE_STORAGE_KEY = "harborline_applicant_profile";

export type PreferredContactMethod = "Email" | "Phone" | "Text";

export type PreferredUnitType =
  | ""
  | "Studio"
  | "1 bedroom"
  | "2 bedrooms"
  | "3+ bedrooms"
  | "Any";

export type ApplicantProfile = {
  fullName: string;
  email: string;
  phone: string;
  preferredContact: PreferredContactMethod;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  desiredMoveInDate: string;
  preferredProperty: string;
  preferredUnitType: PreferredUnitType;
  updatedAt: string;
};

export type ApplicantApplicationSummary = {
  id: string;
  property: string;
  floorPlan: string;
  status: "Draft" | "In review" | "Approved" | "Declined" | "Withdrawn";
  submittedAt: string;
  isActive: boolean;
};

export const APPLICANT_APPLICATIONS_STORAGE_KEY =
  "harborline_applicant_applications";

export function emptyApplicantProfile(): ApplicantProfile {
  return {
    fullName: "",
    email: "",
    phone: "",
    preferredContact: "Email",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    desiredMoveInDate: "",
    preferredProperty: "",
    preferredUnitType: "",
    updatedAt: "",
  };
}

export function readApplicantProfile(): ApplicantProfile {
  if (typeof window === "undefined") return emptyApplicantProfile();
  const raw = window.localStorage.getItem(APPLICANT_PROFILE_STORAGE_KEY);
  if (!raw) return emptyApplicantProfile();

  const parsed = JSON.parse(raw) as Partial<ApplicantProfile>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Applicant profile data is invalid.");
  }

  return {
    ...emptyApplicantProfile(),
    ...parsed,
    preferredContact:
      parsed.preferredContact === "Phone" ||
      parsed.preferredContact === "Text" ||
      parsed.preferredContact === "Email"
        ? parsed.preferredContact
        : "Email",
  };
}

export function writeApplicantProfile(profile: ApplicantProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    APPLICANT_PROFILE_STORAGE_KEY,
    JSON.stringify(profile)
  );
}

/** Demo application summaries — never includes SSN, bank, or ID numbers. */
export function seedApplicantApplications(): ApplicantApplicationSummary[] {
  return [
    {
      id: "app-active-harbor-court",
      property: "Harbor Court",
      floorPlan: "Suite 3B · The Mariner",
      status: "In review",
      submittedAt: "2026-08-02",
      isActive: true,
    },
    {
      id: "app-prev-pier-12",
      property: "Pier 12 Residences",
      floorPlan: "Residence 305 · Harbor One",
      status: "Withdrawn",
      submittedAt: "2026-06-18",
      isActive: false,
    },
    {
      id: "app-prev-canal",
      property: "Canal Yard Lofts",
      floorPlan: "Loft A · Open Studio",
      status: "Declined",
      submittedAt: "2026-05-04",
      isActive: false,
    },
  ];
}

export function readApplicantApplications(): ApplicantApplicationSummary[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(APPLICANT_APPLICATIONS_STORAGE_KEY);
  if (!raw) {
    const seeded = seedApplicantApplications();
    window.localStorage.setItem(
      APPLICANT_APPLICATIONS_STORAGE_KEY,
      JSON.stringify(seeded)
    );
    return seeded;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Applicant applications data is invalid.");
  }

  return parsed.filter(
    (item): item is ApplicantApplicationSummary =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as ApplicantApplicationSummary).id === "string" &&
      typeof (item as ApplicantApplicationSummary).property === "string"
  );
}

/**
 * Previous applications are shown when the applicant has any non-active
 * history. Sensitive verification documents stay off this page entirely.
 */
export function canShowPreviousApplications(
  applications: ApplicantApplicationSummary[]
) {
  return applications.some((application) => !application.isActive);
}
