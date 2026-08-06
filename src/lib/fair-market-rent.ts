import type { PropertyType } from "@/lib/management-contract";
import type { OwnerApplicationProperty } from "@/lib/owner-application-intake";

export type MarketCompSet = {
  label: string;
  /** Multifamily monthly rent per SF by floor plan. */
  multifamilyPsfMo: {
    studio: number;
    oneBed: number;
    twoBed: number;
    threeBed: number;
  };
  /** Typical floor-plan sizes (SF). */
  multifamilySf: {
    studio: number;
    oneBed: number;
    twoBed: number;
    threeBed: number;
  };
  /** Office / retail / industrial annual rent per SF (then /12 for monthly). */
  commercialAnnualPsf: {
    office: number;
    retail: number;
    industrial: number;
    mixedUse: number;
  };
  sourceNotes: string[];
};

/** Simulated fair-market comp database by metro (city,state). */
const MARKET_DB: Record<string, MarketCompSet> = {
  "nashville,tn": {
    label: "Nashville / Davidson MSA",
    multifamilyPsfMo: { studio: 2.35, oneBed: 2.15, twoBed: 1.95, threeBed: 1.8 },
    multifamilySf: { studio: 480, oneBed: 720, twoBed: 980, threeBed: 1220 },
    commercialAnnualPsf: { office: 32, retail: 28, industrial: 12, mixedUse: 30 },
    sourceNotes: [
      "Submarket asking rents (Q1 2026 comps)",
      "Class B multifamily effective rent band",
    ],
  },
  "franklin,tn": {
    label: "Franklin / Williamson",
    multifamilyPsfMo: { studio: 2.45, oneBed: 2.25, twoBed: 2.05, threeBed: 1.9 },
    multifamilySf: { studio: 500, oneBed: 740, twoBed: 1000, threeBed: 1250 },
    commercialAnnualPsf: { office: 30, retail: 34, industrial: 11, mixedUse: 31 },
    sourceNotes: [
      "Suburban premium vs Nashville core",
      "Recent lease comps within 5 miles",
    ],
  },
  "chicago,il": {
    label: "Chicago CBD / Cook",
    multifamilyPsfMo: { studio: 2.9, oneBed: 2.55, twoBed: 2.25, threeBed: 2.05 },
    multifamilySf: { studio: 450, oneBed: 700, twoBed: 950, threeBed: 1200 },
    commercialAnnualPsf: { office: 38, retail: 42, industrial: 14, mixedUse: 35 },
    sourceNotes: [
      "CBD Class B office asking rents",
      "Loop / River North multifamily comps",
    ],
  },
  "evanston,il": {
    label: "Evanston / North Shore",
    multifamilyPsfMo: { studio: 2.6, oneBed: 2.35, twoBed: 2.1, threeBed: 1.95 },
    multifamilySf: { studio: 470, oneBed: 710, twoBed: 960, threeBed: 1180 },
    commercialAnnualPsf: { office: 26, retail: 30, industrial: 11, mixedUse: 27 },
    sourceNotes: ["Suburban office park comps", "University-adjacent residential"],
  },
  "scottsdale,az": {
    label: "Scottsdale / Maricopa",
    multifamilyPsfMo: { studio: 2.5, oneBed: 2.3, twoBed: 2.05, threeBed: 1.85 },
    multifamilySf: { studio: 460, oneBed: 680, twoBed: 920, threeBed: 1150 },
    commercialAnnualPsf: { office: 29, retail: 33, industrial: 13, mixedUse: 30 },
    sourceNotes: ["Senior / active-adult residential premiums", "North Scottsdale comps"],
  },
  "tempe,az": {
    label: "Tempe / East Valley",
    multifamilyPsfMo: { studio: 2.35, oneBed: 2.15, twoBed: 1.95, threeBed: 1.8 },
    multifamilySf: { studio: 450, oneBed: 670, twoBed: 900, threeBed: 1120 },
    commercialAnnualPsf: { office: 27, retail: 31, industrial: 12, mixedUse: 28 },
    sourceNotes: ["East Valley multifamily effective rents", "Campus-adjacent demand"],
  },
};

const DEFAULT_MARKET: MarketCompSet = {
  label: "National mid-market default",
  multifamilyPsfMo: { studio: 2.2, oneBed: 2.0, twoBed: 1.85, threeBed: 1.7 },
  multifamilySf: { studio: 480, oneBed: 700, twoBed: 980, threeBed: 1220 },
  commercialAnnualPsf: { office: 30, retail: 28, industrial: 11, mixedUse: 29 },
  sourceNotes: [
    "National blended asking rents (fallback metro)",
    "Adjust after local inspection comps",
  ],
};

export type FloorPlanKey = "studio" | "oneBed" | "twoBed" | "threeBed";

export type UnitRentLine = {
  id: string;
  unit: string;
  floorPlan: string;
  bedrooms: number;
  sqft: number;
  fairMarketRent: number;
  askingRent: number;
  rentPerSfMo: number;
  status: "vacant";
};

export type PropertyUnitRentSchedule = {
  propertyIndex: number;
  propertyName: string;
  managedPropertyId?: string;
  marketLabel: string;
  propertyType: PropertyType | "";
  method: string;
  compsUsed: string[];
  unitCount: number;
  gprAtAsking: number;
  ownerReportedRentRoll: number;
  variancePct: number;
  inspectionConfirmed: boolean;
  units: UnitRentLine[];
  publishedAt?: string;
};

function marketKey(city: string, state: string) {
  return `${city.trim().toLowerCase()},${state.trim().toLowerCase()}`;
}

export function lookupMarketComps(city: string, state: string): MarketCompSet {
  return MARKET_DB[marketKey(city, state)] ?? DEFAULT_MARKET;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function num(v: string | undefined, fallback = 0) {
  const n = Number(String(v ?? "").replace(/[,$]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

/** Condition / quality factor from vintage + occupancy (inspection-informed). */
export function conditionFactor(input: {
  yearBuilt?: string;
  occupancyPercent?: string;
  inspected?: boolean;
}): number {
  const year = num(input.yearBuilt, 2000);
  const age = Math.max(0, new Date().getFullYear() - year);
  let factor = 1;
  if (age <= 10) factor += 0.04;
  else if (age >= 40) factor -= 0.06;
  const occ = num(input.occupancyPercent, 85);
  if (occ >= 90) factor += 0.02;
  if (occ < 75) factor -= 0.03;
  if (input.inspected) factor += 0.01;
  return Math.min(1.12, Math.max(0.88, factor));
}

function multifamilyMix(unitCount: number): FloorPlanKey[] {
  const weights: { key: FloorPlanKey; w: number }[] = [
    { key: "studio", w: 2 },
    { key: "oneBed", w: 4 },
    { key: "twoBed", w: 3 },
    { key: "threeBed", w: 1 },
  ];
  const total = weights.reduce((s, x) => s + x.w, 0);
  const plans: FloorPlanKey[] = [];
  for (let i = 0; i < unitCount; i++) {
    let slot = i % total;
    for (const w of weights) {
      slot -= w.w;
      if (slot < 0) {
        plans.push(w.key);
        break;
      }
    }
  }
  return plans;
}

const PLAN_LABEL: Record<FloorPlanKey, string> = {
  studio: "Studio",
  oneBed: "1 bedroom",
  twoBed: "2 bedroom",
  threeBed: "3 bedroom",
};

const PLAN_BEDS: Record<FloorPlanKey, number> = {
  studio: 0,
  oneBed: 1,
  twoBed: 2,
  threeBed: 3,
};

function unitLabel(
  type: PropertyType | "",
  index: number,
  floors: number
): string {
  if (type === "office") {
    if (floors > 0 && floors <= 20 && index < floors) return `Floor ${index + 1}`;
    return `Suite ${200 + index}`;
  }
  if (type === "retail" || type === "industrial") return `Bay ${index + 1}`;
  const floor = Math.floor(index / 20) + 1;
  const unit = (index % 20) + 1;
  return `${floor}${String(100 + unit).slice(1)}`;
}

/**
 * Build a per-unit fair-market rent schedule from owner application property
 * metrics + market comps. Asking rent defaults to FMR and can be edited.
 */
export function buildUnitRentSchedule(input: {
  property: OwnerApplicationProperty;
  propertyIndex: number;
  inspected?: boolean;
  maxUnits?: number;
}): PropertyUnitRentSchedule {
  const prop = input.property;
  const type = (prop.category || "multifamily") as PropertyType;
  const comps = lookupMarketComps(prop.city, prop.state);
  const factor = conditionFactor({
    yearBuilt: prop.yearBuilt,
    occupancyPercent: prop.occupancyPercent,
    inspected: input.inspected,
  });

  const reportedUnits = Math.max(
    1,
    Math.round(num(prop.unitsSuites, type === "office" ? 12 : 40))
  );
  const unitCount = Math.min(reportedUnits, input.maxUnits ?? 400);
  const floors = Math.max(1, Math.round(num(prop.floors, 1)));
  const rentableTotal = num(prop.rentableSf || prop.squareFeet, 0);
  const ownerRoll = num(prop.monthlyRentRoll, 0);

  const units: UnitRentLine[] = [];

  if (type === "multifamily" || type === "other") {
    const plans = multifamilyMix(unitCount);
    for (let i = 0; i < unitCount; i++) {
      const plan = plans[i];
      const sqft = comps.multifamilySf[plan];
      const psf = comps.multifamilyPsfMo[plan] * factor;
      const fmr = round2(sqft * psf);
      units.push({
        id: `unit-${input.propertyIndex}-${i + 1}`,
        unit: unitLabel(type, i, floors),
        floorPlan: PLAN_LABEL[plan],
        bedrooms: PLAN_BEDS[plan],
        sqft,
        fairMarketRent: fmr,
        askingRent: fmr,
        rentPerSfMo: round2(psf),
        status: "vacant",
      });
    }
  } else {
    const annualPsf =
      type === "retail"
        ? comps.commercialAnnualPsf.retail
        : type === "industrial"
          ? comps.commercialAnnualPsf.industrial
          : type === "mixed-use"
            ? comps.commercialAnnualPsf.mixedUse
            : comps.commercialAnnualPsf.office;
    const avgSf =
      rentableTotal > 0
        ? Math.round(rentableTotal / unitCount)
        : type === "office"
          ? 2200
          : 1800;
    const monthlyPsf = (annualPsf * factor) / 12;
    for (let i = 0; i < unitCount; i++) {
      const sqft = avgSf + ((i % 5) - 2) * 50;
      const fmr = round2(Math.max(400, sqft * monthlyPsf));
      units.push({
        id: `unit-${input.propertyIndex}-${i + 1}`,
        unit: unitLabel(type, i, floors),
        floorPlan: type === "office" ? "Office suite" : "Commercial bay",
        bedrooms: 0,
        sqft,
        fairMarketRent: fmr,
        askingRent: fmr,
        rentPerSfMo: round2(monthlyPsf),
        status: "vacant",
      });
    }
  }

  const gprAtAsking = round2(units.reduce((s, u) => s + u.askingRent, 0));
  const variancePct =
    ownerRoll > 0 ? round2(((gprAtAsking - ownerRoll) / ownerRoll) * 100) : 0;

  return {
    propertyIndex: input.propertyIndex,
    propertyName:
      prop.propertyName ||
      [prop.streetAddress, prop.city].filter(Boolean).join(", ") ||
      `Property ${input.propertyIndex + 1}`,
    marketLabel: comps.label,
    propertyType: type,
    method:
      type === "multifamily" || type === "other"
        ? "Unit-mix × market $/SF/mo comps × inspection condition factor"
        : "Suite SF × market annual $/SF ÷ 12 × inspection condition factor",
    compsUsed: comps.sourceNotes,
    unitCount,
    gprAtAsking,
    ownerReportedRentRoll: ownerRoll,
    variancePct,
    inspectionConfirmed: Boolean(input.inspected),
    units,
  };
}

export function summarizeSchedule(schedule: PropertyUnitRentSchedule) {
  const byPlan = new Map<string, { count: number; avgAsk: number; avgFmr: number }>();
  for (const u of schedule.units) {
    const cur = byPlan.get(u.floorPlan) ?? { count: 0, avgAsk: 0, avgFmr: 0 };
    cur.count += 1;
    cur.avgAsk += u.askingRent;
    cur.avgFmr += u.fairMarketRent;
    byPlan.set(u.floorPlan, cur);
  }
  return [...byPlan.entries()].map(([plan, v]) => ({
    plan,
    count: v.count,
    avgAsk: round2(v.avgAsk / v.count),
    avgFmr: round2(v.avgFmr / v.count),
  }));
}

export function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
