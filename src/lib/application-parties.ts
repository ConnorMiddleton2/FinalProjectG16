/**
 * Multi-party rental application roles, invitations, and privacy boundaries.
 *
 * Sensitive fields completed by an invitee are stored only on the invite record.
 * The primary applicant UI never reads or displays those private sections.
 */

/** Aligns with Mississippi residential lease capacity (Miss. Code § 93-19-13). */
export const PARTY_ADULT_AGE = 18;

export const APPLICATION_PARTY_INVITES_KEY =
  "harborline_application_party_invites";

function createPartyId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `party-${Date.now()}`;
}

export type ApplicationPartyRole =
  | "co-applicant"
  | "guarantor"
  | "adult-occupant"
  | "minor-occupant";

export type InvitationStatus =
  | "not-sent"
  | "pending"
  | "completed"
  | "declined";

export type ApplicationPartyRoleMeta = {
  id: ApplicationPartyRole;
  label: string;
  shortLabel: string;
  description: string;
  responsibilities: string[];
  /** Primary may send an invite for this person to complete their own section. */
  invitesSupported: boolean;
  /** Person must be at least PARTY_ADULT_AGE. */
  requiresAdultAge: boolean;
  /** Person must be under PARTY_ADULT_AGE; primary enters all basics. */
  isMinor: boolean;
  /** Fields the primary is allowed to enter for this role. */
  primaryPermittedFields: string[];
};

export const APPLICATION_PARTY_ROLES: ApplicationPartyRoleMeta[] = [
  {
    id: "co-applicant",
    label: "Co-applicant",
    shortLabel: "Co-applicant",
    description:
      "Adult who will be a party to the lease and shares screening and financial review.",
    responsibilities: [
      "Complete their own identity, contact, income, and screening section",
      "Authorize credit and background screening in their own name",
      "Share lease liability with the primary applicant",
    ],
    invitesSupported: true,
    requiresAdultAge: true,
    isMinor: false,
    primaryPermittedFields: [
      "Full name",
      "Email",
      "Phone",
      "Relationship to you",
    ],
  },
  {
    id: "guarantor",
    label: "Guarantor",
    shortLabel: "Guarantor",
    description:
      "Adult who guarantees lease obligations but typically will not occupy the unit.",
    responsibilities: [
      "Complete their own identity, contact, and income section",
      "Acknowledge guarantee of rent and lease obligations",
      "Authorize screening needed for guarantee review",
    ],
    invitesSupported: true,
    requiresAdultAge: true,
    isMinor: false,
    primaryPermittedFields: [
      "Full name",
      "Email",
      "Phone",
      "Relationship to you",
    ],
  },
  {
    id: "adult-occupant",
    label: "Adult occupant",
    shortLabel: "Adult occ.",
    description:
      "Adult who will live in the unit but is not signing as a lease applicant.",
    responsibilities: [
      "Be listed on the household roster",
      "Optionally complete their own contact confirmation via invitation",
      "Do not share lease liability unless also added as a co-applicant",
    ],
    invitesSupported: true,
    requiresAdultAge: true,
    isMinor: false,
    primaryPermittedFields: [
      "Full name",
      "Email",
      "Phone",
      "Relationship to you",
      "Date of birth",
    ],
  },
  {
    id: "minor-occupant",
    label: "Minor occupant",
    shortLabel: "Minor",
    description:
      "Occupant under the legal renting age. The primary enters basic details; no invitation is sent.",
    responsibilities: [
      "Be listed with name, relationship, and date of birth",
      "Cannot sign a lease or complete an applicant section",
    ],
    invitesSupported: false,
    requiresAdultAge: false,
    isMinor: true,
    primaryPermittedFields: ["Full name", "Relationship to you", "Date of birth"],
  },
];

export function getPartyRoleMeta(
  role: ApplicationPartyRole
): ApplicationPartyRoleMeta {
  const found = APPLICATION_PARTY_ROLES.find((item) => item.id === role);
  if (!found) {
    throw new Error(`Unknown application party role: ${role}`);
  }
  return found;
}

/**
 * Shared party fields visible to the primary applicant.
 * Never include income, screening answers, ID confirmation, or invitee signatures.
 */
export type ApplicationParty = {
  id: string;
  role: ApplicationPartyRole;
  fullName: string;
  email: string;
  phone: string;
  relationshipToPrimary: string;
  /** Used for occupants (adult/minor). Not shown from invitee private DOB. */
  dateOfBirth: string;
  invitationStatus: InvitationStatus;
  inviteToken: string;
  invitedAt: string;
  completedAt: string;
};

/** Non-sensitive application snapshot shared with an invitee. */
export type PartyInviteSharedContext = {
  property: string;
  floorPlan: string;
  desiredMoveInDate: string;
  leaseTerm: string;
  /** First name only — never full primary profile or sensitive fields. */
  primaryApplicantFirstName: string;
};

/**
 * Private section completed only by the invited party.
 * Stored on the invite record; primary UI must not display these values.
 */
export type PartyPrivateSection = {
  dateOfBirth: string;
  governmentIdType: string;
  governmentIdProvidedOffline: boolean;
  email: string;
  phone: string;
  preferredContact: "Email" | "Phone" | "Text";
  employmentStatus: string;
  employerName: string;
  jobTitle: string;
  monthlyIncome: string;
  authorizeScreening: boolean;
  guaranteeAcknowledgment: boolean;
  certifyAccuracy: boolean;
  signatureName: string;
  completedAt: string;
};

export type PartyInviteRecord = {
  token: string;
  applicationId: string;
  partyId: string;
  role: ApplicationPartyRole;
  status: InvitationStatus;
  sharedContext: PartyInviteSharedContext;
  /** Basics the primary provided — invitee may refine contact fields. */
  partyBasics: {
    fullName: string;
    email: string;
    phone: string;
    relationshipToPrimary: string;
  };
  /** Opaque to primary applicant views. */
  privateSection: PartyPrivateSection | null;
  createdAt: string;
  updatedAt: string;
};

export function emptyParty(
  role: ApplicationPartyRole = "adult-occupant"
): ApplicationParty {
  return {
    id: createPartyId(),
    role,
    fullName: "",
    email: "",
    phone: "",
    relationshipToPrimary: "",
    dateOfBirth: "",
    invitationStatus: "not-sent",
    inviteToken: "",
    invitedAt: "",
    completedAt: "",
  };
}

export function emptyPrivateSection(
  basics?: PartyInviteRecord["partyBasics"]
): PartyPrivateSection {
  return {
    dateOfBirth: "",
    governmentIdType: "",
    governmentIdProvidedOffline: false,
    email: basics?.email ?? "",
    phone: basics?.phone ?? "",
    preferredContact: "Email",
    employmentStatus: "",
    employerName: "",
    jobTitle: "",
    monthlyIncome: "",
    authorizeScreening: false,
    guaranteeAcknowledgment: false,
    certifyAccuracy: false,
    signatureName: "",
    completedAt: "",
  };
}

export function primaryApplicantFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first || "the primary applicant";
}

export function createInviteToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `inv-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
}

function readAllInvites(): PartyInviteRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(APPLICATION_PARTY_INVITES_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as PartyInviteRecord[];
}

function writeAllInvites(invites: PartyInviteRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    APPLICATION_PARTY_INVITES_KEY,
    JSON.stringify(invites)
  );
}

export function readPartyInvite(token: string): PartyInviteRecord | null {
  const normalized = token.trim();
  if (!normalized) return null;
  return readAllInvites().find((item) => item.token === normalized) ?? null;
}

export function upsertPartyInvite(invite: PartyInviteRecord) {
  const existing = readAllInvites();
  const index = existing.findIndex((item) => item.token === invite.token);
  if (index >= 0) {
    existing[index] = invite;
  } else {
    existing.unshift(invite);
  }
  writeAllInvites(existing);
}

export function buildInvitePath(token: string) {
  return `/portal/invite/${encodeURIComponent(token)}`;
}

export function invitationStatusLabel(status: InvitationStatus): string {
  switch (status) {
    case "not-sent":
      return "Not invited";
    case "pending":
      return "Invitation pending";
    case "completed":
      return "Section completed privately";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

/** Public status only — never private field values. */
export type PartyCompletionSummary = {
  partyId: string;
  role: ApplicationPartyRole;
  fullName: string;
  invitationStatus: InvitationStatus;
  hasPrivateSection: boolean;
};

export function getPartyCompletionSummaries(
  applicationId: string,
  parties: ApplicationParty[]
): PartyCompletionSummary[] {
  const invites = readAllInvites().filter(
    (item) => item.applicationId === applicationId
  );
  return parties.map((party) => {
    const invite = invites.find(
      (item) => item.partyId === party.id || item.token === party.inviteToken
    );
    return {
      partyId: party.id,
      role: party.role,
      fullName: party.fullName,
      invitationStatus: party.invitationStatus,
      hasPrivateSection: Boolean(invite?.privateSection),
    };
  });
}

/**
 * Sync invitation status onto shared party rows without copying private fields.
 */
export function syncPartyInvitationStatuses(
  applicationId: string,
  parties: ApplicationParty[]
): ApplicationParty[] {
  const invites = readAllInvites().filter(
    (item) => item.applicationId === applicationId
  );
  return parties.map((party) => {
    const invite = invites.find(
      (item) => item.partyId === party.id || item.token === party.inviteToken
    );
    if (!invite) return party;
    return {
      ...party,
      invitationStatus: invite.status,
      inviteToken: invite.token || party.inviteToken,
      completedAt:
        invite.status === "completed"
          ? invite.privateSection?.completedAt || party.completedAt
          : party.completedAt,
      // Only non-sensitive basics from invitee refinements.
      email: invite.partyBasics.email || party.email,
      phone: invite.partyBasics.phone || party.phone,
      fullName: invite.partyBasics.fullName || party.fullName,
    };
  });
}

export function validatePartyBasics(party: ApplicationParty): string | null {
  const meta = getPartyRoleMeta(party.role);
  if (!party.fullName.trim()) {
    return `${meta.label}: full name is required.`;
  }
  if (!party.relationshipToPrimary.trim()) {
    return `${meta.label}: relationship to you is required.`;
  }

  if (meta.invitesSupported || party.role === "co-applicant" || party.role === "guarantor") {
    if (
      (party.role === "co-applicant" || party.role === "guarantor") &&
      !party.email.trim()
    ) {
      return `${meta.label}: email is required so you can send an invitation.`;
    }
    if (party.email.trim() && !party.email.includes("@")) {
      return `${meta.label}: enter a valid email.`;
    }
  }

  if (meta.isMinor) {
    if (!party.dateOfBirth.trim()) {
      return `${meta.label}: date of birth is required.`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(party.dateOfBirth)) {
      return `${meta.label}: enter a valid date of birth.`;
    }
      // Must be under renting age: DOB after the adult cutoff date
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - PARTY_ADULT_AGE);
    const birth = new Date(party.dateOfBirth + "T12:00:00");
    if (Number.isNaN(birth.getTime())) {
      return `${meta.label}: enter a valid date of birth.`;
    }
    if (birth <= cutoff) {
      return `${meta.label}: minor occupants must be under ${PARTY_ADULT_AGE}. Use adult occupant or co-applicant instead.`;
    }
  }

  if (party.role === "adult-occupant" && party.dateOfBirth.trim()) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - PARTY_ADULT_AGE);
    const birth = new Date(party.dateOfBirth + "T12:00:00");
    if (Number.isNaN(birth.getTime())) {
      return `${meta.label}: enter a valid date of birth.`;
    }
    if (birth > cutoff) {
      return `${meta.label}: adult occupants must be at least ${PARTY_ADULT_AGE}. Use minor occupant instead.`;
    }
  }

  if (party.role === "adult-occupant" && !party.dateOfBirth.trim()) {
    return `${meta.label}: date of birth is required.`;
  }

  return null;
}

export function validatePrivateSection(
  role: ApplicationPartyRole,
  section: PartyPrivateSection
): string | null {
  const meta = getPartyRoleMeta(role);
  if (!section.dateOfBirth.trim()) return "Date of birth is required.";
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - PARTY_ADULT_AGE);
  const birth = new Date(section.dateOfBirth + "T12:00:00");
  if (Number.isNaN(birth.getTime())) return "Enter a valid date of birth.";
  if (birth > cutoff) {
    return `You must be at least ${PARTY_ADULT_AGE} years old for the ${meta.label.toLowerCase()} role.`;
  }
  if (!section.governmentIdType.trim()) return "Government ID type is required.";
  if (!section.governmentIdProvidedOffline) {
    return "Confirm that photo ID will be provided for screening.";
  }
  if (!section.email.trim() || !section.email.includes("@")) {
    return "Enter a valid email.";
  }
  if (!section.phone.trim()) return "Phone is required.";
  if (!section.employmentStatus.trim()) return "Employment status is required.";
  if (!section.monthlyIncome.trim()) return "Monthly income is required.";
  if (
    section.employmentStatus === "Employed" &&
    !section.employerName.trim()
  ) {
    return "Employer name is required.";
  }
  if (!section.authorizeScreening) {
    return "Screening authorization is required.";
  }
  if (role === "guarantor" && !section.guaranteeAcknowledgment) {
    return "Acknowledge guarantor responsibilities to continue.";
  }
  if (!section.certifyAccuracy || !section.signatureName.trim()) {
    return "Certify accuracy and type your full name to finish.";
  }
  return null;
}

/** Migrate legacy occupant rows into party records. */
export function migrateLegacyOccupants(
  occupants: Array<{
    id: string;
    fullName: string;
    relationship: string;
    age: string;
  }>
): ApplicationParty[] {
  return occupants.map((occupant) => {
    const ageNum = Number.parseInt(occupant.age, 10);
    const isMinor =
      Number.isFinite(ageNum) && ageNum >= 0 && ageNum < PARTY_ADULT_AGE;
    return {
      ...emptyParty(isMinor ? "minor-occupant" : "adult-occupant"),
      id: occupant.id || createPartyId(),
      fullName: occupant.fullName,
      relationshipToPrimary: occupant.relationship,
      dateOfBirth: "",
    };
  });
}
