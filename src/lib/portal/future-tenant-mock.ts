import {
  FUTURE_DOC_LABELS,
  FUTURE_TENANT_STAGES,
  type FutureTenantOnboarding,
  type FutureTenantStage,
} from "@/lib/portal/future-tenant-types";

function computeReadiness(data: Omit<FutureTenantOnboarding, "readiness" | "readinessPercent" | "outstandingRequirements" | "nextAction" | "currentStage" | "completedStages">) {
  const readiness = [
    {
      id: "account",
      label: "Account verified",
      complete: data.accountVerified,
      blocking: true,
    },
    {
      id: "id",
      label: "Identification approved",
      complete:
        data.documents.find((d) => d.kind === "government_id")?.status ===
        "approved",
      blocking: true,
    },
    {
      id: "lease",
      label: "Lease signed",
      complete: data.lease.tenantSigned,
      blocking: true,
    },
    {
      id: "deposits",
      label: "Required deposits paid",
      complete: data.charges
        .filter((c) =>
          ["security_deposit", "pet_deposit", "holding_fee"].includes(c.kind)
        )
        .every((c) => c.status === "paid" || c.status === "waived"),
      blocking: true,
    },
    {
      id: "rent",
      label: "First month’s rent paid",
      complete: data.charges
        .filter((c) => c.kind === "first_month_rent")
        .every((c) => c.status === "paid" || c.status === "waived"),
      blocking: true,
    },
    {
      id: "insurance",
      label: "Renter’s insurance verified",
      complete: data.insurance.status === "approved",
      blocking: true,
    },
    {
      id: "utilities",
      label: "Utilities activated",
      complete: data.utilities.every((u) => u.confirmed),
      blocking: true,
    },
    {
      id: "pets",
      label: "Pet documentation approved",
      complete:
        data.documents.find((d) => d.kind === "pet_documentation")?.status ===
          "approved" ||
        data.household.pets.length === 0,
      blocking: data.household.pets.length > 0,
    },
    {
      id: "household",
      label: "Household information confirmed",
      complete: data.household.confirmed,
      blocking: true,
    },
    {
      id: "vehicles",
      label: "Vehicle information confirmed",
      complete:
        data.household.confirmed && data.household.vehicles.length >= 0,
      blocking: false,
    },
    {
      id: "appointment",
      label: "Move-in appointment confirmed",
      complete: Boolean(
        data.appointment.confirmedDate && data.appointment.confirmedTime
      ),
      blocking: true,
    },
  ];

  const completeCount = readiness.filter((r) => r.complete).length;
  const readinessPercent = Math.round(
    (completeCount / readiness.length) * 100
  );

  const outstandingRequirements = readiness
    .filter((r) => !r.complete && r.blocking)
    .map((r) => r.label);

  const stageFlags: Array<{ stage: FutureTenantStage; done: boolean }> = [
    { stage: "approved", done: true },
    { stage: "account_verified", done: data.accountVerified },
    {
      stage: "documents_submitted",
      done: data.documents.every(
        (d) =>
          d.status === "approved" ||
          d.status === "under_review" ||
          (d.kind === "pet_documentation" && data.household.pets.length === 0)
      ),
    },
    { stage: "lease_ready", done: data.lease.ready },
    { stage: "lease_signed", done: data.lease.tenantSigned },
    {
      stage: "payments_completed",
      done: data.charges.every(
        (c) => c.status === "paid" || c.status === "waived"
      ),
    },
    {
      stage: "insurance_utilities_verified",
      done:
        data.insurance.status === "approved" &&
        data.utilities.every((u) => u.confirmed),
    },
    {
      stage: "move_in_confirmed",
      done: Boolean(
        data.appointment.confirmedDate && data.appointment.confirmedTime
      ),
    },
    {
      stage: "ready_for_move_in",
      done: outstandingRequirements.length === 0,
    },
  ];

  const completedStages = stageFlags
    .filter((s) => s.done)
    .map((s) => s.stage);
  let currentStage: FutureTenantStage = "approved";
  for (const stage of FUTURE_TENANT_STAGES) {
    currentStage = stage;
    if (!completedStages.includes(stage)) break;
  }

  const nextAction =
    outstandingRequirements[0] != null
      ? `Complete: ${outstandingRequirements[0]}`
      : "All required move-in items are complete. Waiting for management to confirm lease start.";

  return {
    readiness,
    readinessPercent,
    outstandingRequirements,
    completedStages,
    currentStage,
    nextAction,
  };
}

/** Seeded onboarding for an approved future tenant (demo / first visit). */
export function buildDefaultFutureOnboarding(input: {
  ownerUserId: string;
  ownerEmail: string;
  displayName: string;
  propertyLabel: string;
  unit: string;
  invitationCode: string;
}): FutureTenantOnboarding {
  const base = {
    id: `ft-onboarding-${input.ownerUserId}`,
    ownerUserId: input.ownerUserId,
    ownerEmail: input.ownerEmail,
    lifecycle: "future" as const,
    propertyLabel: input.propertyLabel,
    unit: input.unit,
    applicationId: null,
    invitationCode: input.invitationCode,
    leaseStartDate: "2026-09-01",
    importantDeadlines: [
      { label: "Document submission deadline", date: "2026-08-15" },
      { label: "Lease signature deadline", date: "2026-08-20" },
      { label: "Move-in deposits due", date: "2026-08-25" },
      { label: "Lease start", date: "2026-09-01" },
    ],
    documents: (
      Object.keys(FUTURE_DOC_LABELS) as Array<keyof typeof FUTURE_DOC_LABELS>
    ).map((kind) => ({
      id: `ftdoc-${kind}`,
      kind,
      label: FUTURE_DOC_LABELS[kind],
      status:
        kind === "government_id"
          ? ("approved" as const)
          : kind === "proof_of_income"
            ? ("under_review" as const)
            : kind === "rental_history"
              ? ("rejected" as const)
              : ("not_submitted" as const),
      rejectionReason:
        kind === "rental_history"
          ? "Document unreadable — upload a clearer PDF or photo."
          : null,
      fileName:
        kind === "government_id"
          ? "id-preview.pdf"
          : kind === "rental_history"
            ? "rental-history-blurry.pdf"
            : null,
      uploadedAt:
        kind === "government_id" || kind === "rental_history"
          ? "2026-08-01"
          : null,
    })),
    charges: [
      {
        id: "ft-charge-app",
        kind: "application_fee" as const,
        label: "Application fee",
        description: "Nonrefundable application processing fee.",
        amount: "$75.00",
        dueDate: "2026-08-10",
        status: "paid" as const,
        refundable: false,
        receiptId: "rcpt-app-1",
      },
      {
        id: "ft-charge-hold",
        kind: "holding_fee" as const,
        label: "Holding fee",
        description: "Holds the unit through lease start.",
        amount: "$500.00",
        dueDate: "2026-08-18",
        status: "due" as const,
        refundable: true,
        receiptId: null,
      },
      {
        id: "ft-charge-sec",
        kind: "security_deposit" as const,
        label: "Security deposit",
        description: "Refundable security deposit per lease.",
        amount: "$2,400.00",
        dueDate: "2026-08-25",
        status: "due" as const,
        refundable: true,
        receiptId: null,
      },
      {
        id: "ft-charge-pet",
        kind: "pet_deposit" as const,
        label: "Pet deposit",
        description: "Refundable pet deposit if pets are approved.",
        amount: "$300.00",
        dueDate: "2026-08-25",
        status: "due" as const,
        refundable: true,
        receiptId: null,
      },
      {
        id: "ft-charge-rent",
        kind: "first_month_rent" as const,
        label: "First month’s rent",
        description: "Rent for the first full month of the lease.",
        amount: "$2,400.00",
        dueDate: "2026-08-28",
        status: "due" as const,
        refundable: false,
        receiptId: null,
      },
      {
        id: "ft-charge-admin",
        kind: "admin_fee" as const,
        label: "Administrative / move-in fee",
        description: "One-time move-in administrative fee.",
        amount: "$150.00",
        dueDate: "2026-08-25",
        status: "due" as const,
        refundable: false,
        receiptId: null,
      },
    ],
    lease: {
      id: "ft-lease-1",
      propertyLabel: input.propertyLabel,
      unit: input.unit,
      monthlyRent: "$2,400.00",
      securityDeposit: "$2,400.00",
      feesSummary: "Application $75 · Admin $150 · Pet deposit $300",
      leaseStart: "2026-09-01",
      leaseEnd: "2027-08-31",
      addendums: [
        "Parking addendum",
        "Pet addendum",
        "Utilities responsibility addendum",
      ],
      ready: true,
      tenantInitialed: false,
      tenantSigned: false,
      signedAt: null,
      parties: [
        {
          id: "party-tenant",
          name: input.displayName,
          role: "tenant" as const,
          signed: false,
        },
        {
          id: "party-mgmt",
          name: "Harborline Management",
          role: "management" as const,
          signed: false,
        },
      ],
      downloadAvailable: false,
    },
    appointment: {
      leaseStartDate: "2026-09-01",
      requestedDate: null,
      requestedTime: null,
      confirmedDate: null,
      confirmedTime: null,
      keyPickupConfirmed: false,
      changeRequested: false,
      changeReason: null,
      changeStatus: "none" as const,
      officeHours: "Mon–Fri 9:00 a.m.–5:00 p.m. · Sat 10:00 a.m.–1:00 p.m.",
      parkingInstructions:
        "Visitor Lot C for arrival. Loading dock reservation required for large moves.",
      loadingInstructions:
        "Use south loading bay. Max 2-hour dock window; reserve 48 hours ahead.",
      elevatorInstructions:
        "Freight elevator reserved for move appointments; pads required.",
      buildingAccess:
        "Temporary access code issued after deposits clear. Fobs at key pickup.",
    },
    utilities: [
      {
        id: "util-electric",
        name: "Harbor Power Co.",
        utility: "Electric",
        setupUrl: "https://example.com/electric",
        instructions: "Open an account in your name by the activation date.",
        activationBy: "2026-08-28",
        confirmed: false,
      },
      {
        id: "util-gas",
        name: "Metro Gas",
        utility: "Gas",
        instructions: "Transfer or open service before lease start.",
        activationBy: "2026-08-28",
        confirmed: false,
      },
      {
        id: "util-water",
        name: "City Water",
        utility: "Water / sewer",
        instructions: "Usually billed through Harborline; confirm account.",
        activationBy: "2026-09-01",
        confirmed: false,
      },
      {
        id: "util-internet",
        name: "PierNet Fiber",
        utility: "Internet",
        instructions: "Schedule install after key pickup if needed.",
        activationBy: "2026-09-03",
        confirmed: false,
      },
    ],
    insurance: {
      requiredCoverage: "Renters liability + personal property",
      minLiability: "$100,000",
      additionalInterest: "Harborline Property Management",
      status: "not_submitted" as const,
      rejectionReason: null,
      fileName: null,
    },
    household: {
      occupants: [input.displayName],
      emergencyContacts: [],
      pets: [],
      assistanceAnimals: [],
      vehicles: [],
      parkingNeeds: "One assigned stall preferred",
      storageNeeds: "None",
      confirmed: false,
      changeRequest: null,
      changeStatus: "none" as const,
    },
    moveInInfo: {
      propertyAddress: input.propertyLabel.includes("Pier")
        ? "12 Harborline Pier, Suite lobby"
        : "Harborline Demo Residences",
      unit: input.unit,
      keyPickup:
        "Pick up keys at the management office with photo identification after appointment confirmation.",
      parking:
        "Assigned stall listed on parking addendum. Guests use Lot C.",
      buildingAccess:
        "Lobby hours 6 a.m.–10 p.m. After-hours entry via fob.",
      mailPackages:
        "Package room weekdays 8–6; bring identification. Oversized items need dock booking.",
      trash: "Trash chute floors 2–8; recycling in south court.",
      internetUtilities:
        "See Utilities & Insurance for provider setup deadlines.",
      communityRules:
        "Quiet hours 10 p.m.–7 a.m. No hallway storage. Full rules in welcome packet.",
      managementContact:
        "leasing@harborline.example · Office (555) 010-2200",
      emergencyGuidance:
        "Call 911 for life-threatening emergencies. After-hours building line is on your welcome packet.",
    },
    accountVerified: true,
    updatedAt: new Date().toISOString(),
  };

  const derived = computeReadiness(base);
  return {
    ...base,
    ...derived,
  };
}

export function recomputeFutureOnboarding(
  data: FutureTenantOnboarding
): FutureTenantOnboarding {
  const { readiness, readinessPercent, outstandingRequirements, completedStages, currentStage, nextAction } =
    computeReadiness(data);
  return {
    ...data,
    readiness,
    readinessPercent,
    outstandingRequirements,
    completedStages,
    currentStage,
    nextAction,
    updatedAt: new Date().toISOString(),
  };
}
