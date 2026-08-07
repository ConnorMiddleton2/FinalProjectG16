/**
 * Educational / demo jurisdiction notes for nonpayment eviction planning.
 * Not legal advice — always confirm with local counsel and current statutes.
 */

export type EvictionChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type JurisdictionProfile = {
  stateCode: string;
  stateName: string;
  noticeToQuitDays: number;
  summary: string;
  restrictions: string[];
};

const PROFILES: Record<string, Omit<JurisdictionProfile, "stateCode">> = {
  MS: {
    stateName: "Mississippi",
    noticeToQuitDays: 3,
    summary:
      "Nonpayment typically starts with a written notice to quit (often 3 days). Eviction requires a court judgment — self-help lockouts are not allowed.",
    restrictions: [
      "Do not change locks, shut off utilities, or remove belongings without a writ.",
      "Serve notice properly (method must comply with lease and local practice).",
      "File in the correct justice / county court after the notice period expires.",
      "Coordinate physical possession only through the sheriff after judgment.",
    ],
  },
  AL: {
    stateName: "Alabama",
    noticeToQuitDays: 7,
    summary:
      "Alabama generally requires written notice before filing for nonpayment. Court process is required for possession.",
    restrictions: [
      "No self-help eviction or utility shutoff to force move-out.",
      "Confirm notice period in the lease and Ala. statutes before filing.",
      "Obtain judgment and writ before any lockout.",
    ],
  },
  TN: {
    stateName: "Tennessee",
    noticeToQuitDays: 14,
    summary:
      "Tennessee nonpayment notice periods vary; many cases use a 14-day cure/quit style notice. Judicial eviction is required.",
    restrictions: [
      "No lockout or property seizure without court order.",
      "Verify notice wording and delivery method for your county.",
      "After judgment, use the lawful writ / officer process only.",
    ],
  },
  LA: {
    stateName: "Louisiana",
    noticeToQuitDays: 5,
    summary:
      "Louisiana eviction for nonpayment typically uses a short notice to vacate, then a rule for possession in parish court.",
    restrictions: [
      "Self-help eviction is prohibited.",
      "Follow parish-specific filing and service rules.",
      "Possession only after judgment / writ.",
    ],
  },
  TX: {
    stateName: "Texas",
    noticeToQuitDays: 3,
    summary:
      "Texas nonpayment often begins with a 3-day notice to vacate, then a forcible detainer (eviction) suit in JP court.",
    restrictions: [
      "No self-help lockouts or utility cutoffs.",
      "File in the correct precinct justice court.",
      "Writ of possession required before lock change.",
    ],
  },
  CA: {
    stateName: "California",
    noticeToQuitDays: 3,
    summary:
      "California nonpayment usually starts with a 3-day notice to pay or quit. Strict notice formalities and local rent ordinances may apply.",
    restrictions: [
      "Notice must meet statutory form; defects can dismiss the case.",
      "Check city/county just-cause and COVID-era residual rules.",
      "No self-help; sheriff executes lockout after judgment.",
    ],
  },
  NY: {
    stateName: "New York",
    noticeToQuitDays: 14,
    summary:
      "New York nonpayment often requires a 14-day rent demand before a holdover/nonpayment proceeding. Housing Court formalities are strict.",
    restrictions: [
      "Use proper rent demand / notice language.",
      "No self-help; marshal or sheriff executes warrant.",
      "Local regs (NYC HSTPA) may add tenant defenses.",
    ],
  },
  FL: {
    stateName: "Florida",
    noticeToQuitDays: 3,
    summary:
      "Florida nonpayment commonly uses a 3-day notice (excluding weekends/holidays in many cases), then a county court eviction.",
    restrictions: [
      "Count notice days carefully (weekend/holiday rules).",
      "No self-help lockouts.",
      "Writ of possession after judgment for physical removal.",
    ],
  },
};

const DEFAULT: Omit<JurisdictionProfile, "stateCode"> = {
  stateName: "General (confirm locally)",
  noticeToQuitDays: 7,
  summary:
    "Most U.S. jurisdictions require written notice and a court judgment before possession. Self-help eviction is almost always unlawful.",
  restrictions: [
    "Do not lock out, remove belongings, or shut off utilities without a writ.",
    "Serve a written nonpayment notice that meets state and lease requirements.",
    "File for eviction only after the notice period expires without cure.",
    "Coordinate physical possession through the local officer after judgment.",
  ],
};

export function normalizeStateCode(raw: string | undefined | null): string {
  const s = (raw || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(s)) return s;
  const names: Record<string, string> = {
    MISSISSIPPI: "MS",
    ALABAMA: "AL",
    TENNESSEE: "TN",
    LOUISIANA: "LA",
    TEXAS: "TX",
    CALIFORNIA: "CA",
    "NEW YORK": "NY",
    FLORIDA: "FL",
  };
  return names[s] || s.slice(0, 2) || "XX";
}

export function getJurisdictionProfile(
  stateRaw: string | undefined | null
): JurisdictionProfile {
  const stateCode = normalizeStateCode(stateRaw);
  const base = PROFILES[stateCode] ?? {
    ...DEFAULT,
    stateName:
      stateCode && stateCode !== "XX"
        ? `${stateCode} (confirm locally)`
        : DEFAULT.stateName,
  };
  return { stateCode: stateCode || "XX", ...base };
}

/** Build a fresh actionable checklist for management (all unchecked). */
export function buildEvictionChecklist(input: {
  stateRaw: string | undefined | null;
  tenantName: string;
  property: string;
  unit: string;
  daysOverdue: number;
  amountDue: number;
  noticeCount: number;
}): { profile: JurisdictionProfile; items: EvictionChecklistItem[] } {
  const profile = getJurisdictionProfile(input.stateRaw);
  const money = input.amountDue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const items: EvictionChecklistItem[] = [
    {
      id: "verify-ledger",
      label: `Verify open balance (${money}) and days overdue (${input.daysOverdue}) against A/R for ${input.tenantName}`,
      done: false,
    },
    {
      id: "confirm-jurisdiction",
      label: `Confirm property is in ${profile.stateName} and apply local notice rules (${profile.noticeToQuitDays}-day notice baseline)`,
      done: false,
    },
    {
      id: "review-outreach",
      label: `Review outreach history (${input.noticeCount} notice${input.noticeCount === 1 ? "" : "s"} on file) before escalating`,
      done: false,
    },
    {
      id: "serve-notice",
      label: `Serve written nonpayment / notice to quit per ${profile.stateName} requirements (≈${profile.noticeToQuitDays} days)`,
      done: false,
    },
    {
      id: "wait-cure",
      label: `Wait full notice period; document any partial payments or cure attempts from the tenant portal`,
      done: false,
    },
    {
      id: "counsel-review",
      label: "Have counsel (or approved template) review notice & filing packet for defects",
      done: false,
    },
    {
      id: "file-court",
      label: `File eviction / possession action in the correct ${profile.stateName} court after notice expires unpaid`,
      done: false,
    },
    {
      id: "hearing-judgment",
      label: "Attend hearing; obtain judgment for possession (and rent if awarded)",
      done: false,
    },
    {
      id: "writ-officer",
      label: "Request writ / warrant; schedule lockout only with sheriff, constable, or marshal",
      done: false,
    },
    {
      id: "possession-turnover",
      label: `Complete unit turnover for ${input.property}${input.unit ? ` · ${input.unit}` : ""} and mark tenant evicted in CPMC`,
      done: false,
    },
  ];

  return { profile, items };
}
