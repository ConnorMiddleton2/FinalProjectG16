export type CampaignChannel =
  | "facebook"
  | "instagram"
  | "google"
  | "event_sponsor"
  | "event_attend"
  | "other";

export type SmCampaign = {
  id: string;
  name: string;
  channel: CampaignChannel;
  startDate: string;
  endDate: string;
  cost: number;
  revenueAttributed: number;
  leads: number;
  status: "planned" | "active" | "completed";
  notes: string;
};

export type SmApplicationStatus =
  | "new"
  | "reviewing"
  | "contacted"
  | "tour_offered"
  | "approved"
  | "declined";

export type ContactMethod = "call" | "text" | "email";

/** Extends portal tenant applications with S&M review fields. */
export type SmTenantApplication = {
  id: string;
  property: string;
  name: string;
  email: string;
  notes: string;
  status: "Submitted" | "In review";
  createdAt: string;
  /** Building / property of interest */
  building?: string;
  /** Desired room / suite size (e.g. "1,200 SF" or "Suite 305") */
  roomSize?: string;
  /** Managed property id when linked to inventory. */
  propertyId?: string;
  /** Vacant unit roster id selected for lease. */
  unitId?: string;
  unitLabel?: string;
  proposedRent?: number;
  movedInAt?: string;
  smStatus?: SmApplicationStatus;
  communicated?: boolean;
  lastContactAt?: string;
  lastContactMethod?: ContactMethod;
  tourPromptSentAt?: string;
  tourEventId?: string;
  tourHoldEventIds?: string[];
  tenantAccountId?: string;
  leasePacketStatus?: "not_sent" | "sent" | "signed" | "approved";
  leaseOfferedAt?: string;
  leaseSignedAt?: string;
  leaseSignedName?: string;
};

export type SmCode =
  | "SM001"
  | "SM002"
  | "SM003"
  | "SM004"
  | "SM005";

export type SmReceipt = {
  id: string;
  code: SmCode;
  vendor: string;
  amount: number;
  description: string;
  fileName: string;
  status: "pending" | "approved" | "declined";
  submittedAt: string;
  approvedAt?: string;
};

export type SmBudgetCategory = {
  code: SmCode;
  label: string;
  budgeted: number;
};

export type SmBudgetConfig = {
  id: string;
  label: string;
  categories: SmBudgetCategory[];
  /** Legacy field from earlier single-total budget. */
  totalBudget?: number;
};

export type CalendarEventType = "tour" | "media_event" | "meeting" | "other";

export type SmCalendarEvent = {
  id: string;
  title: string;
  type: CalendarEventType;
  start: string;
  end: string;
  notes: string;
  relatedApplicationId?: string;
  source?: "harborline" | "google";
  googleEventId?: string;
  location?: string;
  /** Soft hold for offered tour options — show translucent on calendar */
  isHold?: boolean;
};

export const CAMPAIGN_CHANNELS: {
  value: CampaignChannel;
  label: string;
}[] = [
  { value: "facebook", label: "Facebook ads" },
  { value: "instagram", label: "Instagram ads" },
  { value: "google", label: "Google ads" },
  { value: "event_sponsor", label: "Sponsoring event" },
  { value: "event_attend", label: "Attending event" },
  { value: "other", label: "Other" },
];

export const EVENT_TYPES: { value: CalendarEventType; label: string }[] = [
  { value: "tour", label: "Tour" },
  { value: "media_event", label: "Media event" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

export const SM_CODES: { value: SmCode; label: string }[] = [
  { value: "SM001", label: "SM001 · Supplies" },
  { value: "SM002", label: "SM002 · Events" },
  { value: "SM003", label: "SM003 · Decoration" },
  { value: "SM004", label: "SM004 · Meals & entertainment" },
  { value: "SM005", label: "SM005 · Online Advertising" },
];

export const DEFAULT_BUDGET_CATEGORIES: SmBudgetCategory[] = [
  { code: "SM001", label: "Supplies", budgeted: 4000 },
  { code: "SM002", label: "Events", budgeted: 10000 },
  { code: "SM003", label: "Decoration", budgeted: 5000 },
  { code: "SM004", label: "Meals & entertainment", budgeted: 6000 },
  { code: "SM005", label: "Online Advertising", budgeted: 15000 },
];

/** Map Management S&M category keys ↔ receipt codes. */
export const SM_CATEGORY_TO_CODE: Record<string, SmCode> = {
  supplies: "SM001",
  events: "SM002",
  decoration: "SM003",
  meals_entertainment: "SM004",
  online_advertising: "SM005",
};

export function netBudget(categories: SmBudgetCategory[]) {
  return categories.reduce((sum, c) => sum + c.budgeted, 0);
}

/** Map legacy codes to current SM00x codes when loading old rows. */
export function normalizeSmCode(code: string): SmCode {
  const legacy: Record<string, SmCode> = {
    "SM-ADS": "SM005",
    "SM-LIST": "SM005",
    "SM-PRINT": "SM001",
    "SM-SIGN": "SM003",
    "SM-EVENTS": "SM002",
    "SM-SPONSOR": "SM002",
    "SM-BROKER": "SM004",
    "SM-TRAVEL": "SM004",
    "SM-OTHER": "SM001",
    SM006: "SM002",
    SM007: "SM004",
    SM008: "SM004",
    SM009: "SM001",
  };
  if (legacy[code]) return legacy[code];
  if (SM_CODES.some((c) => c.value === code)) return code as SmCode;
  return "SM001";
}

export function normalizeBudgetConfig(
  raw: SmBudgetConfig | null | undefined
): SmBudgetConfig {
  const byCode = new Map(
    (raw?.categories ?? []).map((c) => [normalizeSmCode(c.code), c] as const)
  );
  return {
    id: raw?.id ?? "sm-budget-main",
    label: raw?.label ?? "FY2026 Sales & Marketing",
    categories: DEFAULT_BUDGET_CATEGORIES.map((d) => ({
      code: d.code,
      label: d.label,
      budgeted: byCode.get(d.code)?.budgeted ?? d.budgeted,
    })),
  };
}

export const SM_APP_STATUSES: {
  value: SmApplicationStatus;
  label: string;
}[] = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "contacted", label: "Contacted" },
  { value: "tour_offered", label: "Tour offered" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export function channelLabel(value: CampaignChannel) {
  return CAMPAIGN_CHANNELS.find((c) => c.value === value)?.label ?? value;
}

export function eventTypeLabel(value: CalendarEventType) {
  return EVENT_TYPES.find((e) => e.value === value)?.label ?? value;
}

export function money(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function campaignRoi(c: SmCampaign) {
  if (c.cost <= 0) return null;
  return ((c.revenueAttributed - c.cost) / c.cost) * 100;
}

export function emptyCampaign(): Omit<SmCampaign, "id"> {
  return {
    name: "",
    channel: "facebook",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    cost: 0,
    revenueAttributed: 0,
    leads: 0,
    status: "planned",
    notes: "",
  };
}

export function emptyCalendarEvent(): Omit<SmCalendarEvent, "id"> {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    title: "",
    type: "tour",
    start: toLocalInput(start),
    end: toLocalInput(end),
    notes: "",
    source: "harborline",
    location: "",
  };
}

export function emptyReceipt(): Omit<SmReceipt, "id" | "submittedAt"> {
  return {
    code: "SM001",
    vendor: "",
    amount: 0,
    description: "",
    fileName: "",
    status: "pending",
  };
}

export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const SILLY_TENANT_APP_ID = "demo-silly-tenant-app";

export function sillyTenantApplication(): SmTenantApplication {
  return {
    id: SILLY_TENANT_APP_ID,
    property: "Pier 12 · Penthouse with optional water slide",
    building: "Pier 12",
    roomSize: "2,400 SF · Suite 305",
    name: "Captain Waffles McLeasealot",
    email: "waffles@absolutely-not-a-real-company.biz",
    notes:
      "Needs room for 47 rubber ducks, a espresso machine the size of a Fiat, and asks if the lobby can host karaoke Tuesdays. Also inquired about rooftop llama parking.",
    status: "Submitted",
    createdAt: new Date().toLocaleDateString(),
    smStatus: "new",
  };
}

export function seedCampaigns(): SmCampaign[] {
  // Portfolio data lives in shared_records (scripts/seed-portfolio.mjs).
  return [];
}

export function seedBudgetConfig(): SmBudgetConfig[] {
  // Portfolio data lives in shared_records (scripts/seed-portfolio.mjs).
  return [];
}

export function seedCalendarEvents(): SmCalendarEvent[] {
  // Portfolio data lives in shared_records (scripts/seed-portfolio.mjs).
  return [];
}

/** Demo Google Calendar pull — overlaps the seed Harborline tour on purpose. */
export function mockGoogleCalendarEvents(
  harborEvents: SmCalendarEvent[]
): SmCalendarEvent[] {
  const anchor =
    harborEvents.find((e) => e.id === "sm-evt-1") ?? harborEvents[0];
  const start = anchor
    ? new Date(anchor.start)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        d.setHours(10, 0, 0, 0);
        return d;
      })();
  const end = new Date(start);
  end.setHours(start.getHours() + 1);

  const later = new Date(start);
  later.setDate(later.getDate() + 1);
  later.setHours(14, 0, 0, 0);
  const laterEnd = new Date(later);
  laterEnd.setHours(15, 0, 0, 0);

  return [
    {
      id: "google-evt-conflict-1",
      googleEventId: "gcal-dentist-llama",
      title: "Google: Dentist (and emotional support llama checkup)",
      type: "other",
      start: toLocalInput(start),
      end: toLocalInput(end),
      notes: "Imported from Google Calendar — conflicts with a Harborline event.",
      source: "google",
      location: "Downtown Dental",
    },
    {
      id: "google-evt-2",
      googleEventId: "gcal-team-standup",
      title: "Google: Weekly leasing stand-up",
      type: "meeting",
      start: toLocalInput(later),
      end: toLocalInput(laterEnd),
      notes: "Imported from Google Calendar — no conflict.",
      source: "google",
      location: "Harborline HQ",
    },
  ];
}

export type CalendarConflict = {
  id: string;
  harbor: SmCalendarEvent;
  google: SmCalendarEvent;
};

export function findCalendarConflicts(
  events: SmCalendarEvent[]
): CalendarConflict[] {
  const harbor = events.filter((e) => e.source !== "google");
  const google = events.filter((e) => e.source === "google");
  const conflicts: CalendarConflict[] = [];

  for (const g of google) {
    const gs = new Date(g.start).getTime();
    const ge = new Date(g.end).getTime();
    for (const h of harbor) {
      const hs = new Date(h.start).getTime();
      const he = new Date(h.end).getTime();
      if (gs < he && ge > hs) {
        conflicts.push({
          id: `${h.id}__${g.id}`,
          harbor: h,
          google: g,
        });
      }
    }
  }
  return conflicts;
}

/** Propose open tour slots from the shared calendar (next 10 business days). */
export function proposeTourSlots(
  events: SmCalendarEvent[],
  count = 3
): { start: string; end: string; label: string }[] {
  const slots: { start: string; end: string; label: string }[] = [];
  const hours = [10, 14, 16];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);

  for (let day = 0; day < 14 && slots.length < count; day++) {
    const dayDate = new Date(cursor);
    dayDate.setDate(cursor.getDate() + day);
    const dow = dayDate.getDay();
    if (dow === 0 || dow === 6) continue;

    for (const hour of hours) {
      if (slots.length >= count) break;
      const start = new Date(dayDate);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1, 0, 0, 0);
      const conflicts = events.some((e) => {
        const es = new Date(e.start).getTime();
        const ee = new Date(e.end).getTime();
        return start.getTime() < ee && end.getTime() > es;
      });
      if (conflicts) continue;
      slots.push({
        start: toLocalInput(start),
        end: toLocalInput(end),
        label: start.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      });
    }
  }
  return slots;
}

export function buildTourPrompt(
  applicantName: string,
  slots: { label: string }[]
) {
  const times = slots.map((s, i) => `${i + 1}) ${s.label}`).join("\n");
  return `Hi ${applicantName}, we'd love for you to take a tour and see what you think. Does one of these appointment times work for you?\n\n${times}\n\nReply with the number that works best, or suggest another time. — Harborline Sales & Marketing`;
}

export function slotConflicts(
  start: string,
  end: string,
  events: SmCalendarEvent[],
  ignoreHold = true
) {
  if (!start || !end) return [] as SmCalendarEvent[];
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!(e > s)) return [] as SmCalendarEvent[];
  return events.filter((ev) => {
    if (ignoreHold && ev.isHold) return false;
    const es = new Date(ev.start).getTime();
    const ee = new Date(ev.end).getTime();
    return s < ee && e > es;
  });
}

export function labelSlot(start: string) {
  return new Date(start).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
