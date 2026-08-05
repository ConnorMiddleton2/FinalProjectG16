/**
 * Future Tenant Portal move-in onboarding checklist.
 *
 * Does not modify the Current Tenant Portal. Completion only surfaces a
 * coordinated handoff link when the system already supports a tenant role route.
 */

import { ROLE_META } from "@/lib/types";

export const MOVE_IN_ONBOARDING_STORAGE_KEY =
  "harborline_portal_move_in_onboarding";

export type MoveInTaskId =
  | "sign-lease"
  | "pay-deposit"
  | "pay-first-month"
  | "renters-insurance"
  | "set-up-utilities"
  | "confirm-occupants"
  | "register-vehicles"
  | "register-pets"
  | "schedule-key-pickup"
  | "review-instructions"
  | "move-in-inspection";

export type MoveInTaskStatus = "remaining" | "completed";

export type MoveInRequiredDocument = {
  id: string;
  label: string;
  note: string;
};

export type MoveInTask = {
  id: MoveInTaskId;
  title: string;
  description: string;
  deadline: string;
  requiredDocuments: MoveInRequiredDocument[];
  status: MoveInTaskStatus;
  completedAt: string;
  helpHref?: string;
  helpLabel?: string;
};

export type MoveInOnboarding = {
  id: string;
  property: string;
  unit: string;
  applicantName: string;
  moveInDate: string;
  leaseOfferId: string;
  createdAt: string;
  updatedAt: string;
  tasks: MoveInTask[];
};

/** Existing Current Tenant Portal entry — do not change that portal from here. */
export const CURRENT_TENANT_PORTAL_HREF = ROLE_META.tenant.href;

export const MOVE_IN_TASK_DEFINITIONS: Array<
  Omit<MoveInTask, "status" | "completedAt" | "deadline"> & {
    daysBeforeMoveIn: number;
  }
> = [
  {
    id: "sign-lease",
    title: "Sign Lease",
    description:
      "Complete all required electronic signatures on the lease package sent by leasing.",
    daysBeforeMoveIn: 14,
    requiredDocuments: [
      {
        id: "lease-package",
        label: "Signed lease package",
        note: "Return through the signing link leasing provides.",
      },
    ],
    helpHref: "/portal/offers",
    helpLabel: "View lease offer",
  },
  {
    id: "pay-deposit",
    title: "Pay Deposit",
    description: "Pay the security deposit according to your approved offer.",
    daysBeforeMoveIn: 10,
    requiredDocuments: [
      {
        id: "deposit-receipt",
        label: "Deposit payment confirmation",
        note: "Keep your receipt or confirmation number.",
      },
    ],
  },
  {
    id: "pay-first-month",
    title: "Pay First Month’s Rent",
    description: "Pay first month’s rent before keys are released.",
    daysBeforeMoveIn: 7,
    requiredDocuments: [
      {
        id: "rent-receipt",
        label: "First-month rent confirmation",
        note: "Provide the payment confirmation when leasing requests it.",
      },
    ],
  },
  {
    id: "renters-insurance",
    title: "Provide Renter’s Insurance",
    description:
      "Submit proof of renter’s insurance that meets community requirements.",
    daysBeforeMoveIn: 7,
    requiredDocuments: [
      {
        id: "insurance-certificate",
        label: "Certificate of insurance",
        note: "Must list required coverage and effective dates.",
      },
    ],
  },
  {
    id: "set-up-utilities",
    title: "Set Up Utilities",
    description:
      "Arrange resident-responsible utilities to start on or before move-in day.",
    daysBeforeMoveIn: 5,
    requiredDocuments: [
      {
        id: "utility-confirmations",
        label: "Utility account confirmations",
        note: "Electricity and internet confirmations are commonly required.",
      },
    ],
  },
  {
    id: "confirm-occupants",
    title: "Confirm Occupants",
    description:
      "Confirm every adult and minor occupant who will live in the unit.",
    daysBeforeMoveIn: 5,
    requiredDocuments: [],
    helpHref: "/portal/messages?intent=move-in",
    helpLabel: "Message leasing",
  },
  {
    id: "register-vehicles",
    title: "Register Vehicles",
    description: "Register vehicles that will use community parking.",
    daysBeforeMoveIn: 3,
    requiredDocuments: [
      {
        id: "vehicle-registration",
        label: "Vehicle registration details",
        note: "Make, model, color, and plate state only as requested.",
      },
    ],
  },
  {
    id: "register-pets",
    title: "Register Pets",
    description:
      "Register approved pets and provide vaccination or licensing records.",
    daysBeforeMoveIn: 3,
    requiredDocuments: [
      {
        id: "pet-records",
        label: "Pet vaccination / licensing records",
        note: "Required when pets are listed on the household.",
      },
    ],
  },
  {
    id: "schedule-key-pickup",
    title: "Schedule Key Pickup",
    description: "Book a key or fob pickup time with the leasing office.",
    daysBeforeMoveIn: 2,
    requiredDocuments: [],
    helpHref: "/portal/messages?intent=move-in",
    helpLabel: "Contact leasing",
  },
  {
    id: "review-instructions",
    title: "Review Instructions",
    description:
      "Read move-in day instructions, loading rules, and community policies.",
    daysBeforeMoveIn: 1,
    requiredDocuments: [
      {
        id: "move-in-guide",
        label: "Move-in instructions packet",
        note: "Provided by leasing after deposit and insurance are cleared.",
      },
    ],
  },
  {
    id: "move-in-inspection",
    title: "Complete Move-In Inspection",
    description:
      "Complete the move-in condition inspection and note any existing issues.",
    daysBeforeMoveIn: 0,
    requiredDocuments: [
      {
        id: "inspection-form",
        label: "Signed move-in inspection form",
        note: "Submit on or shortly after move-in day.",
      },
    ],
  },
];

function deadlineFromMoveIn(moveInDate: string, daysBefore: number): string {
  const base = new Date(`${moveInDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + Math.max(daysBefore, 1));
    return fallback.toISOString().slice(0, 10);
  }
  base.setDate(base.getDate() - daysBefore);
  return base.toISOString().slice(0, 10);
}

export function createMoveInOnboarding(input?: {
  property?: string;
  unit?: string;
  applicantName?: string;
  moveInDate?: string;
  leaseOfferId?: string;
}): MoveInOnboarding {
  const moveIn = new Date();
  moveIn.setDate(moveIn.getDate() + 18);
  const moveInDate =
    input?.moveInDate || moveIn.toISOString().slice(0, 10);
  const now = new Date().toISOString();

  return {
    id: "move-in-default",
    property: input?.property || "Pier 12 Residences",
    unit: input?.unit || "A205 · 1 bed / 1 bath",
    applicantName: input?.applicantName || "Alex Tenant",
    moveInDate,
    leaseOfferId: input?.leaseOfferId || "offer-pier12-a205",
    createdAt: now,
    updatedAt: now,
    tasks: MOVE_IN_TASK_DEFINITIONS.map((definition) => ({
      id: definition.id,
      title: definition.title,
      description: definition.description,
      deadline: deadlineFromMoveIn(moveInDate, definition.daysBeforeMoveIn),
      requiredDocuments: definition.requiredDocuments,
      helpHref: definition.helpHref,
      helpLabel: definition.helpLabel,
      status: "remaining",
      completedAt: "",
    })),
  };
}

export function readMoveInOnboarding(): MoveInOnboarding {
  if (typeof window === "undefined") {
    return createMoveInOnboarding();
  }
  const raw = window.localStorage.getItem(MOVE_IN_ONBOARDING_STORAGE_KEY);
  if (!raw) {
    const seeded = createMoveInOnboarding();
    writeMoveInOnboarding(seeded);
    return seeded;
  }
  const parsed = JSON.parse(raw) as MoveInOnboarding;
  if (!parsed?.id || !Array.isArray(parsed.tasks)) {
    const seeded = createMoveInOnboarding();
    writeMoveInOnboarding(seeded);
    return seeded;
  }
  return parsed;
}

export function writeMoveInOnboarding(onboarding: MoveInOnboarding) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MOVE_IN_ONBOARDING_STORAGE_KEY,
    JSON.stringify({ ...onboarding, updatedAt: new Date().toISOString() })
  );
}

export function toggleMoveInTask(
  onboarding: MoveInOnboarding,
  taskId: MoveInTaskId,
  completed: boolean
): MoveInOnboarding {
  const now = new Date().toISOString();
  return {
    ...onboarding,
    updatedAt: now,
    tasks: onboarding.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: completed ? "completed" : "remaining",
            completedAt: completed ? now : "",
          }
        : task
    ),
  };
}

export function completedMoveInTasks(onboarding: MoveInOnboarding) {
  return onboarding.tasks.filter((task) => task.status === "completed");
}

export function remainingMoveInTasks(onboarding: MoveInOnboarding) {
  return onboarding.tasks.filter((task) => task.status === "remaining");
}

export function isMoveInOnboardingComplete(onboarding: MoveInOnboarding) {
  return (
    onboarding.tasks.length > 0 &&
    onboarding.tasks.every((task) => task.status === "completed")
  );
}

export function formatMoveInDate(value: string): string {
  if (!value) return "—";
  const date = new Date(
    value.includes("T") ? value : `${value}T12:00:00`
  );
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isMoveInDeadlineSoon(deadline: string, withinDays = 3): boolean {
  const due = new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return diff >= 0 && diff <= withinDays * 24 * 60 * 60 * 1000;
}

export function isMoveInDeadlinePast(deadline: string): boolean {
  const due = new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
}
