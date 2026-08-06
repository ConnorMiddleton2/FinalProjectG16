/**
 * Seeds the Harborline shared_records portfolio (4 owners / 7 properties).
 * Usage:
 *   node scripts/seed-portfolio.mjs <SUPABASE_URL> <ANON_KEY>
 */
import { createClient } from "@supabase/supabase-js";

const url = process.argv[2];
const key = process.argv[3];
if (!url || !key) {
  console.error("Usage: node scripts/seed-portfolio.mjs <URL> <ANON_KEY>");
  process.exit(1);
}

const sb = createClient(url, key);
const now = new Date().toISOString();
const today = now.slice(0, 10);
const year = new Date().getFullYear();
const month = String(new Date().getMonth() + 1).padStart(2, "0");
const period = `${year}-${month}`;

const FIRST = [
  "Ava", "Noah", "Mia", "Liam", "Emma", "Oliver", "Sophia", "Elijah", "Isabella",
  "James", "Charlotte", "Benjamin", "Amelia", "Lucas", "Harper", "Henry", "Evelyn",
  "Alexander", "Abigail", "Michael", "Emily", "Daniel", "Elizabeth", "Mateo", "Sofia",
  "Sebastian", "Avery", "Jack", "Ella", "Owen", "Scarlett", "Theodore", "Grace",
  "Samuel", "Chloe", "Joseph", "Victoria", "John", "Riley", "David", "Aria",
];
const LAST = [
  "Nguyen", "Patel", "Garcia", "Kim", "Johnson", "Williams", "Brown", "Jones",
  "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
  "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis",
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function nameAt(i) {
  return `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
}

function emailAt(slug, i) {
  return `tenant.${slug}.${i + 1}@harborline.example`.toLowerCase();
}

/** Deterministic 0–1 from index (stable across runs). */
function hash01(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function addMonths(isoYYYYMMDD, months) {
  const [y, m, d] = isoYYYYMMDD.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

function yearsBetween(startIso, endIso = today) {
  const a = new Date(`${startIso}T00:00:00`);
  const b = new Date(`${endIso}T00:00:00`);
  const years = (b - a) / (365.25 * 24 * 3600 * 1000);
  return Math.max(0, Math.round(years * 10) / 10);
}

/**
 * Market-style floor plans by asset class (2025–2026 US norms), then scaled
 * so occupied rents sum to each property's given monthly revenue.
 * Multifamily: ~$1.70–$2.40 / sf / mo · Senior IL: higher all-in monthly ·
 * Office: annual $/sf → monthly.
 */
function floorPlansFor(property) {
  if (property.type === "office") {
    if (property.id === "prop-meridian-tower") {
      return [
        { label: "Full floor", sqft: 22000, marketRent: 32000, weight: 1 },
        { label: "Full floor+", sqft: 24000, marketRent: 36000, weight: 1 },
      ];
    }
    return [
      { label: "Small suite", sqft: 900, marketRent: 1350, weight: 3 },
      { label: "Standard suite", sqft: 1600, marketRent: 2100, weight: 4 },
      { label: "Large suite", sqft: 2800, marketRent: 3400, weight: 2 },
      { label: "Corner suite", sqft: 3600, marketRent: 4200, weight: 1 },
    ];
  }
  // Senior living (Horizon) — independent living all-in monthly
  if (property.ownerId === "owner-horizon") {
    return [
      { label: "Studio", sqft: 450, marketRent: 2800, weight: 2 },
      { label: "1 bedroom", sqft: 650, marketRent: 3400, weight: 4 },
      { label: "2 bedroom", sqft: 900, marketRent: 4100, weight: 3 },
    ];
  }
  // Conventional multifamily
  return [
    { label: "Studio", sqft: 480, marketRent: 1325, weight: 2 },
    { label: "1 bedroom", sqft: 700, marketRent: 1625, weight: 4 },
    { label: "2 bedroom", sqft: 980, marketRent: 1985, weight: 4 },
    { label: "3 bedroom", sqft: 1220, marketRent: 2395, weight: 1 },
  ];
}

function pickPlan(plans, i) {
  const total = plans.reduce((s, p) => s + p.weight, 0);
  let slot = Math.floor(hash01(i + 17) * total);
  for (const plan of plans) {
    slot -= plan.weight;
    if (slot < 0) return plan;
  }
  return plans[plans.length - 1];
}

/**
 * Staggered lease starts: residential 12-mo terms across ~4 years;
 * office 3–7 yr terms.
 */
function leaseWindow(property, i) {
  const h = hash01(i * 3 + 9);
  const h2 = hash01(i * 7 + 3);
  if (property.type === "office") {
    const termYears = 3 + Math.floor(h * 5); // 3–7
    const startOffsetMonths = Math.floor(h2 * 60); // up to 5 years ago
    const start = addMonths(`${year}-01-01`, -startOffsetMonths);
    // Snap to 1st of a month
    const startMonth = start.slice(0, 8) + "01";
    const end = addMonths(startMonth, termYears * 12);
    return { start: startMonth, end, termMonths: termYears * 12 };
  }
  // Multifamily / senior: 12-month leases; original move-in spans ~4 years
  const monthsIntoCurrentTerm = Math.floor(h * 12); // 0–11
  const renewals = Math.floor(h2 * 4); // 0–3 prior 12-mo terms
  const start =
    addMonths(`${period}-01`, -monthsIntoCurrentTerm).slice(0, 8) + "01";
  const originalStart = addMonths(start, -(renewals * 12));
  const end = addMonths(start, 12);
  return { start, end, termMonths: 12, originalStart };
}

/**
 * Normal rent billing (due 1st, ~5-day grace). Today is after grace in Aug 2026.
 * ~80% paid current · remainder current unpaid / 1–3 mo arrears / vacating / pending.
 */
function billingStatus(rent, property, i) {
  const roll = hash01(i * 11 + 5);
  const lateFeeFlat = property.type === "office" ? round2(rent * 0.05) : 75;
  if (roll < 0.8) {
    return { category: "active", pendingDue: 0, status: "active" };
  }
  if (roll < 0.88) {
    // Current month unpaid past grace
    return {
      category: "past_due",
      pendingDue: round2(rent + lateFeeFlat),
      status: "active",
    };
  }
  if (roll < 0.93) {
    // One prior month + current
    return {
      category: "past_due",
      pendingDue: round2(rent * 2 + lateFeeFlat * 2),
      status: "active",
    };
  }
  if (roll < 0.96) {
    // 2–3 months arrears
    const months = 3;
    return {
      category: "past_due",
      pendingDue: round2(rent * months + lateFeeFlat * months),
      status: "active",
    };
  }
  if (roll < 0.98) {
    // Notice to vacate — final month / prorated balance
    return {
      category: "vacating",
      pendingDue: round2(rent * (0.35 + hash01(i) * 0.65)),
      status: "notice",
    };
  }
  // Pending move-in: first month (+ typical deposit hold reflected as due)
  return {
    category: "pending",
    pendingDue: round2(rent * (property.type === "office" ? 1 : 2)),
    status: "pending",
  };
}

async function upsert(collection, id, payload) {
  const { error } = await sb.from("shared_records").upsert(
    {
      collection,
      id,
      payload: { ...payload, id },
      updated_at: now,
    },
    { onConflict: "collection,id" }
  );
  if (error) throw new Error(`${collection}/${id}: ${error.message}`);
}

async function upsertMany(collection, rows) {
  const batch = 80;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch).map((r) => ({
      collection,
      id: r.id,
      payload: { ...r, id: r.id },
      updated_at: now,
    }));
    const { error } = await sb.from("shared_records").upsert(chunk, {
      onConflict: "collection,id",
    });
    if (error) throw new Error(`${collection} batch ${i}: ${error.message}`);
  }
}

const OWNERS = [
  {
    id: "owner-summit",
    legal: "Summit Residential Partners LLC",
    contact: "Jordan Hale",
    email: "jordan.hale@summitresidential.example",
    phone: "(615) 555-0142",
    entity: "LLC",
    mailing: "1200 Commerce St, Suite 400, Nashville, TN 37203",
  },
  {
    id: "owner-meridian",
    legal: "Meridian Commercial Holdings",
    contact: "Priya Desai",
    email: "priya.desai@meridianholdings.example",
    phone: "(312) 555-0198",
    entity: "LLC",
    mailing: "233 S Wacker Dr, Floor 28, Chicago, IL 60606",
  },
  {
    id: "owner-horizon",
    legal: "Horizon Senior Living Group",
    contact: "Marcus Webb",
    email: "marcus.webb@horizonsenior.example",
    phone: "(480) 555-0166",
    entity: "LLC",
    mailing: "8800 E Raintree Dr, Scottsdale, AZ 85260",
  },
];

const PROPERTIES = [
  {
    id: "prop-grandview",
    ownerId: "owner-summit",
    name: "Grandview Apartments",
    type: "multifamily",
    units: 300,
    occupancy: 0.82,
    revenue: 478500,
    expenses: 214800,
    feePercent: 4.5,
    address: { street: "900 Grandview Pkwy", city: "Nashville", state: "TN", zip: "37211", county: "Davidson" },
    floors: "4",
    buildings: "6",
    unitLabel: (i) => `${Math.floor(i / 25) + 1}${String((i % 25) + 100).slice(1)}`,
  },
  {
    id: "prop-oakridge",
    ownerId: "owner-summit",
    name: "Oakridge Flats",
    type: "multifamily",
    units: 80,
    occupancy: 0.88,
    revenue: 136400,
    expenses: 58200,
    feePercent: 5.0,
    address: { street: "410 Oakridge Ave", city: "Franklin", state: "TN", zip: "37064", county: "Williamson" },
    floors: "3",
    buildings: "2",
    unitLabel: (i) => `A${i + 101}`,
  },
  {
    id: "prop-meridian-tower",
    ownerId: "owner-meridian",
    name: "Meridian Tower",
    type: "office",
    units: 12,
    occupancy: 0.75,
    revenue: 312000,
    expenses: 187500,
    feePercent: 3.75,
    address: { street: "500 Meridian Plaza", city: "Chicago", state: "IL", zip: "60601", county: "Cook" },
    floors: "12",
    buildings: "1",
    unitLabel: (i) => `Floor ${i + 1}`,
  },
  {
    id: "prop-riverside-office",
    ownerId: "owner-meridian",
    name: "Riverside Office Park",
    type: "office",
    units: 80,
    occupancy: 0.8,
    revenue: 94600,
    expenses: 51800,
    feePercent: 4.25,
    address: { street: "220 Riverside Dr", city: "Evanston", state: "IL", zip: "60201", county: "Cook" },
    floors: "4",
    buildings: "3",
    unitLabel: (i) => `Suite ${200 + i}`,
  },
  {
    id: "prop-willow-creek",
    ownerId: "owner-horizon",
    name: "Willow Creek Senior Residences",
    type: "multifamily",
    units: 100,
    occupancy: 0.85,
    revenue: 187500,
    expenses: 132400,
    feePercent: 5.5,
    address: { street: "1700 Willow Creek Rd", city: "Scottsdale", state: "AZ", zip: "85255", county: "Maricopa" },
    floors: "2",
    buildings: "4",
    unitLabel: (i) => `WC-${i + 1}`,
  },
  {
    id: "prop-lakeside",
    ownerId: "owner-horizon",
    name: "Lakeside Senior Community",
    type: "multifamily",
    units: 200,
    occupancy: 0.78,
    revenue: 362000,
    expenses: 251800,
    feePercent: 5.0,
    address: { street: "88 Lakeside Loop", city: "Tempe", state: "AZ", zip: "85281", county: "Maricopa" },
    floors: "3",
    buildings: "5",
    unitLabel: (i) => `LS-${i + 1}`,
  },
];

const EXPENSE_SPLIT = [
  ["maintenance", 0.22],
  ["utilities", 0.18],
  ["insurance", 0.12],
  ["property_taxes", 0.2],
  ["janitorial", 0.08],
  ["security", 0.06],
  ["repairs", 0.08],
  ["professional_fees", 0.06],
];

async function main() {
  console.log("Seeding Harborline portfolio…");

  // Owner accounts
  for (const o of OWNERS) {
    await upsert("owner_accounts", o.id, {
      id: o.id,
      email: o.email,
      password: "OwnerDemo1!",
      passwordReveal: "OwnerDemo1!",
      fullName: o.contact,
      companyName: o.legal,
      phone: o.phone,
      createdAt: now,
      mustChangePassword: false,
    });
  }

  // Owner applications (approved end-state of intake flow)
  for (const o of OWNERS) {
    const props = PROPERTIES.filter((p) => p.ownerId === o.id);
    await upsert("owner_applications", `app-${o.id}`, {
      id: `app-${o.id}`,
      fullName: o.contact,
      email: o.email,
      phone: o.phone,
      companyName: o.legal,
      entityType: o.entity,
      mailingAddress: o.mailing,
      preferredContactMethod: "email",
      communicationPreference: "monthly_summary",
      ownershipProofAvailable: true,
      rentRollAvailable: true,
      leasesAvailable: true,
      insuranceDocsAvailable: true,
      bankingReady: true,
      properties: props.map((p) => {
        const rentable = p.units * (p.type === "office" ? 2500 : 900);
        const annualGpr = round2(p.revenue * 12);
        const annualOpex = round2(p.expenses * 12);
        return {
          propertyName: p.name,
          category: p.type,
          streetAddress: p.address.street,
          city: p.address.city,
          state: p.address.state,
          zip: p.address.zip,
          county: p.address.county,
          parcelTaxId: `TAX-${p.id.toUpperCase()}`,
          yearBuilt: p.type === "office" ? "1998" : "2012",
          yearRenovated: "2022",
          buildings: p.buildings,
          floors: p.floors,
          unitsSuites: String(p.units),
          grossSf: String(Math.round(rentable * 1.08)),
          rentableSf: String(rentable),
          parkingSpaces: String(Math.round(p.units * 1.2)),
          zoning: p.type === "office" ? "C-2" : "RM-3",
          amenities: "On-site management, laundry, package room",
          elevator: p.type === "office" || p.units >= 100 ? "yes" : "no",
          fireSprinkler: "yes",
          occupancyPercent: String(Math.round(p.occupancy * 100)),
          tenantCount: String(Math.round(p.units * p.occupancy)),
          monthlyRentRoll: String(p.revenue),
          annualGpr: String(annualGpr),
          annualOperatingExpenses: String(annualOpex),
          annualNoi: String(round2(annualGpr - annualOpex)),
          arBalance: String(round2(p.revenue * 0.04)),
          securityDepositsHeld: String(round2((p.revenue / Math.max(1, Math.round(p.units * p.occupancy))) * Math.round(p.units * p.occupancy) * 0.5)),
          reserveBalance: String(round2(p.expenses * 1.5)),
          camOrNnnStructure: p.type === "office" ? "NNN" : "Gross",
          majorLeaseExpirations: `${year + 1}-06-30`,
          currentManagement: "other_firm",
          reasonForChange: "Seeking institutional reporting and leasing support.",
          avgLeaseTermYears: p.type === "office" ? "5" : "1",
          percentLeasesExpiring12mo: "15",
          roofAgeYears: "7",
          hvacNotes: "Preventive maintenance contract in place.",
          knownIssues: "",
          preferredVendors: "Delta Mechanical; ClearPath Janitorial",
          utilityNotes: p.type === "office" ? "Owner common area; tenant suite meters" : "Owner-paid common utilities",
          accessNotes: "Master keys with on-site staff",
          insuranceCarrier: "Harbor First Assurance",
          insuranceCoverageAmount: "Replacement cost + $2M GL",
          insuranceExpiration: `${year + 1}-01-01`,
          claimsHistoryNotes: "No open claims",
          ownerGoals: "Stabilize occupancy and improve NOI.",
          servicesRequested: [
            "leasing",
            "tenant_relations",
            "maintenance",
            "accounting",
            "reporting",
          ],
          capitalPlans: "",
          specialInstructions: `Management fee target ${p.feePercent}% of collections.`,
          location: `${p.address.street}, ${p.address.city}, ${p.address.state} ${p.address.zip}`,
          squareFeet: String(rentable),
        };
      }),
      message: `Requesting Harborline management for ${props.map((p) => p.name).join(" and ")}.`,
      status: "approved",
      createdAt: now,
      mgmtStatus: "account_provisioned",
      communicated: true,
      inspected: true,
      metWithOwner: true,
      proposedFeePercent: String(props[0].feePercent),
      proposedTermYears: "3",
      exclusiveManagement: true,
      contractPropertyIds: props.map((p) => p.id),
      ownerSignedAt: now,
      ownerSignatureName: o.contact,
      reviewedBy: "Harborline Management",
      reviewedAt: now,
      reviewNotes: "Diligence complete; contract signed; account provisioned.",
      credentialsIssuedAt: now,
    });

    await upsert("owner_contracts", `contract-${o.id}`, {
      id: `contract-${o.id}`,
      title: `Property Management Agreement — ${o.legal}`,
      ownerName: o.contact,
      ownerEmail: o.email,
      propertySummary: props.map((p) => p.name).join(", "),
      body: `Harborline Management Agreement with ${o.legal} covering ${props.map((p) => p.name).join(", ")}. Fee per property schedule attached.`,
      status: "signed_by_owner",
      relatedApplicationId: `app-${o.id}`,
      createdAt: now,
      updatedAt: now,
      sentAt: now,
      ownerSignedAt: now,
      ownerSignatureName: o.contact,
      managerSignedAt: now,
      managerSignatureName: "Harborline Management",
    });
  }

  const managed = [];
  const propertyTenants = [];
  const tenants = [];
  const rentalReceivables = [];
  const payableInvoices = [];
  const ownerPayables = [];
  const tenantApps = [];
  const tenantContracts = [];
  const tenantInvoices = [];
  const workOrders = [];
  const deptBudgets = [];
  const budgetPacks = [];
  const smCampaigns = [];
  const smReceipts = [];

  let tenantIdx = 0;

  for (const p of PROPERTIES) {
    const owner = OWNERS.find((o) => o.id === p.ownerId);
    const occupied = Math.round(p.units * p.occupancy);
    const avgRent = round2(p.revenue / occupied);
    const annualGpr = round2(p.revenue * 12);
    const annualOpex = round2(p.expenses * 12);
    const noi = round2(annualGpr - annualOpex);

    managed.push({
      id: p.id,
      createdAt: now,
      propertyName: p.name,
      streetAddress: p.address.street,
      city: p.address.city,
      state: p.address.state,
      zip: p.address.zip,
      county: p.address.county,
      parcelTaxId: `TAX-${p.id.toUpperCase()}`,
      propertyType: p.type,
      yearBuilt: p.type === "office" ? "1998" : "2012",
      yearRenovated: "2022",
      buildings: p.buildings,
      floors: p.floors,
      unitsSuites: String(p.units),
      grossSf: String(p.units * (p.type === "office" ? 2800 : 950)),
      rentableSf: String(p.units * (p.type === "office" ? 2500 : 900)),
      parkingSpaces: String(Math.round(p.units * 1.2)),
      zoning: p.type === "office" ? "C-2" : "RM-3",
      amenities: "On-site management, laundry, package room",
      ownerLegalName: owner.legal,
      ownerEntityType: owner.entity,
      ownerContactName: owner.contact,
      ownerEmail: owner.email,
      ownerAccountId: owner.id,
      ownerPhone: owner.phone,
      ownerMailingAddress: owner.mailing,
      contractStartDate: `${year}-01-01`,
      contractEndDate: `${year + 2}-12-31`,
      renewalOptions: "Two 2-year renewals",
      terminationNoticeDays: "60",
      exclusiveManagement: true,
      ownerApprovalThreshold: "2500",
      feeStructure: "percent_collections",
      feePercent: String(p.feePercent),
      feeFlatAmount: "",
      leasingCommissionPercent: p.type === "office" ? "4" : "50",
      constructionMgmtFeePercent: "5",
      otherFeeNotes: `Harborline fee ${p.feePercent}% of collections`,
      occupancyPercent: String(Math.round(p.occupancy * 100)),
      tenantCount: String(occupied),
      monthlyRentRoll: String(p.revenue),
      annualGpr: String(annualGpr),
      annualOperatingExpenses: String(annualOpex),
      annualNoi: String(noi),
      capRatePercent: "6.5",
      arBalance: String(round2(p.revenue * 0.04)),
      securityDepositsHeld: String(round2(avgRent * occupied * 0.5)),
      reserveBalance: String(round2(p.expenses * 1.5)),
      camOrNnnStructure: p.type === "office" ? "NNN" : "Gross",
      insuranceRequirements: "GL $2M / property replacement cost",
      majorLeaseExpirations: `${year + 1}-06-30`,
      assignedManager: "Harborline Operations",
      preferredVendors: "Delta Mechanical; ClearPath Janitorial",
      knownIssues: "",
      specialTerms: `Management fee ${p.feePercent}% of gross collections.`,
      notes: "Seeded portfolio asset — full intake/approval path completed.",
      sourceApplicationId: `app-${owner.id}`,
      ownerSignedAt: now,
      ownerSignatureName: owner.contact,
    });

    const plans = floorPlansFor(p);
    const draftUnits = [];
    for (let i = 0; i < occupied; i++) {
      const plan = pickPlan(plans, tenantIdx + i);
      draftUnits.push({ i, plan, marketRent: plan.marketRent, sqft: plan.sqft });
    }
    const marketSum = draftUnits.reduce((s, u) => s + u.marketRent, 0) || 1;
    const scale = p.revenue / marketSum;

    // Occupied tenants — market floor plans scaled to property rent roll
    for (const draft of draftUnits) {
      const { i, plan } = draft;
      const nm = nameAt(tenantIdx);
      const unit = p.unitLabel(i);
      const rent = round2(draft.marketRent * scale);
      const lease = leaseWindow(p, tenantIdx);
      const bill = billingStatus(rent, p, tenantIdx);
      const startForTenure = lease.originalStart || lease.start;
      const ptId = `pt-${p.id}-${i + 1}`;
      propertyTenants.push({
        id: ptId,
        propertyId: p.id,
        propertyName: p.name,
        unit,
        name: nm,
        email: emailAt(p.id.replace("prop-", ""), i),
        phone: `(615) 555-${String(1000 + (tenantIdx % 9000)).padStart(4, "0")}`,
        leaseStart: lease.start,
        leaseEnd: lease.end,
        monthlyRent: String(rent),
        sqft: String(plan.sqft),
        floorPlan: plan.label,
        status: bill.status,
      });
      tenants.push({
        id: `ten-${p.id}-${i + 1}`,
        name: nm,
        unit,
        propertyLeased: p.name,
        category: bill.category,
        pendingDue: bill.pendingDue,
        monthlyRent: rent,
        sqft: plan.sqft,
        ageYears: yearsBetween(startForTenure),
        dateLeased: startForTenure,
        leaseEnd: lease.end,
      });
      const tenantEmail = emailAt(p.id.replace("prop-", ""), i);
      tenantContracts.push({
        id: `tcon-${ptId}`,
        property: p.name,
        term: `${lease.termMonths || 12} months`,
        rent: String(rent),
        status: "Active",
        propertyId: p.id,
        unit,
        tenantName: nm,
        tenantEmail,
      });
      const invStatus =
        bill.pendingDue <= 0
          ? "Paid"
          : bill.category === "past_due"
            ? "Overdue"
            : "Due";
      tenantInvoices.push({
        id: `inv-${ptId}-${period}`,
        label: `${p.name} · ${unit} rent — ${period}`,
        amount: String(rent),
        due: `${period}-05`,
        status: invStatus,
        propertyId: p.id,
        propertyName: p.name,
        unit,
        tenantName: nm,
        tenantEmail,
        dueDate: `${period}-05`,
        paidAt: invStatus === "Paid" ? `${period}-03` : "",
      });
      tenantIdx++;
    }

    // Vacant units with asking rent / size (same scaled market plans)
    for (let v = 0; v < Math.min(8, p.units - occupied); v++) {
      const i = occupied + v;
      const plan = pickPlan(plans, tenantIdx + v + 50);
      const asking = round2(plan.marketRent * scale);
      propertyTenants.push({
        id: `pt-${p.id}-vacant-${v + 1}`,
        propertyId: p.id,
        propertyName: p.name,
        unit: p.unitLabel(i),
        name: "",
        email: "",
        phone: "",
        leaseStart: "",
        leaseEnd: "",
        monthlyRent: String(asking),
        sqft: String(plan.sqft),
        floorPlan: plan.label,
        status: "vacant",
      });
    }

    // AR: monthly rent roll as paid receivable + a few open balances
    rentalReceivables.push({
      id: `ar-${p.id}-${period}`,
      receivableId: `RR-${p.id.toUpperCase()}-${month}`,
      kind: "rental",
      customerName: `${p.name} rent roll`,
      customerId: p.id,
      property: p.name,
      unit: "ALL",
      period,
      category: "base_rent",
      amount: p.revenue,
      amountReceived: round2(p.revenue * 0.96),
      disputed: false,
      invoiceDate: `${period}-01`,
      dueDate: `${period}-05`,
      paymentMethod: "ach",
      paymentReference: `ACH-${p.id}-${month}`,
      fileName: "",
      description: `Monthly rent collections — ${p.name}`,
      notes: "Seeded from approved lease portfolio",
      createdAt: now,
    });

    // AP expense split totaling property expenses
    let allocated = 0;
    EXPENSE_SPLIT.forEach(([cat, share], idx) => {
      const amount =
        idx === EXPENSE_SPLIT.length - 1
          ? round2(p.expenses - allocated)
          : round2(p.expenses * share);
      allocated = round2(allocated + amount);
      payableInvoices.push({
        id: `ap-${p.id}-${cat}`,
        invoiceNumber: `AP-${year}${month}-${p.id.slice(-4).toUpperCase()}-${idx + 1}`,
        vendorName:
          cat === "utilities"
            ? "City Utilities"
            : cat === "insurance"
              ? "Harbor Mutual"
              : cat === "property_taxes"
                ? `${p.address.county} Tax Assessor`
                : cat === "janitorial"
                  ? "ClearPath Janitorial"
                  : cat === "security"
                    ? "NightWatch Security"
                    : cat === "maintenance" || cat === "repairs"
                      ? "Delta Mechanical"
                      : "Harborline Preferred Vendors",
        vendorId: "",
        category: cat,
        property: p.name,
        amount,
        amountPaid: round2(amount * 0.7),
        disputed: false,
        invoiceDate: `${period}-02`,
        dueDate: `${period}-20`,
        fileName: "",
        notes: `Operating expense — ${cat}`,
        createdAt: now,
      });
    });

    // Owner remittance with property-specific fee %
    const feeAmt = round2((p.revenue * p.feePercent) / 100);
    const reimbursables = round2(p.expenses * 0.15);
    const reserves = round2(p.revenue * 0.02);
    const net = round2(p.revenue - feeAmt - reimbursables - reserves);
    ownerPayables.push({
      id: `opay-${p.id}-${period}`,
      paymentId: `OP-${year}${month}-${p.id.slice(-6).toUpperCase()}`,
      ownerName: owner.legal,
      ownerId: owner.id,
      property: p.name,
      period,
      paymentType: "monthly_distribution",
      grossRentCollected: p.revenue,
      managementFeePercent: p.feePercent,
      managementFeeAmount: feeAmt,
      reimbursableExpenses: reimbursables,
      reservesWithheld: reserves,
      amount: net,
      amountPaid: 0,
      onHold: false,
      statementApproved: true,
      invoiceDate: `${period}-08`,
      dueDate: `${period}-15`,
      paymentMethod: "ach",
      paymentReference: "",
      fileName: "",
      notes: `Fee ${p.feePercent}% per management agreement`,
      createdAt: now,
    });

    // Tenant applications (S&M flow) — approved + reviewing mix
    for (let a = 0; a < 4; a++) {
      const approved = a < 2;
      tenantApps.push({
        id: `tapp-${p.id}-${a + 1}`,
        property: p.name,
        building: p.name,
        roomSize: p.unitLabel(occupied + a),
        name: nameAt(9000 + tenantIdx + a),
        email: emailAt(`app-${p.id}`, a),
        notes: approved
          ? "Tour completed; application approved by Sales & Marketing."
          : "Application in review with leasing.",
        status: approved ? "In review" : "Submitted",
        createdAt: now,
        smStatus: approved ? "approved" : a === 2 ? "tour_offered" : "reviewing",
        communicated: true,
        lastContactAt: now,
        lastContactMethod: "email",
      });
    }

    // Sample work orders
    workOrders.push({
      id: `wo-${p.id}-1`,
      title: `${p.name} — HVAC service call`,
      category: "hvac",
      property: p.name,
      unit: p.unitLabel(0),
      description: "Routine HVAC check reported by on-site staff.",
      status: "in_progress",
      priority: "normal",
      source: "management_submitted",
      labor: "third_party",
      vendorName: "Delta Mechanical",
      createdAt: today,
      completedAt: "",
      estimatedCost: "450",
      actualCost: "",
      budgetAppliedAmount: "",
      budgetAppliedLineId: "",
    });
    workOrders.push({
      id: `wo-${p.id}-2`,
      title: `${p.name} — Unit turn make-ready`,
      category: "general",
      property: p.name,
      unit: p.unitLabel(Math.min(3, occupied - 1)),
      description: "Paint, clean, and punch-list for upcoming move-in.",
      status: "pending",
      priority: "high",
      source: "management_submitted",
      labor: "in_house",
      vendorName: "",
      createdAt: today,
      completedAt: "",
      estimatedCost: "900",
      actualCost: "",
      budgetAppliedAmount: "",
      budgetAppliedLineId: "",
    });

    // Department budget pack + maintenance lines for current year
    budgetPacks.push({
      id: `budget-pack-${p.id}-${year}`,
      propertyId: p.id,
      propertyName: p.name,
      fiscalYear: year,
      enabledBuiltIns: ["maintenance", "sales_marketing", "executive"],
      customDepartments: [],
      createdAt: now,
      updatedAt: now,
    });

    const maintCats = [
      ["hvac", "HVAC", 0.18],
      ["plumbing", "Plumbing", 0.12],
      ["electrical", "Electrical", 0.1],
      ["structural", "Structural", 0.12],
      ["janitorial", "Janitorial", 0.1],
      ["landscaping", "Landscaping", 0.08],
      ["security", "Security", 0.06],
      ["appliance", "Appliance", 0.08],
      ["general", "General repair", 0.12],
      ["other", "Other", 0.04],
    ];
    const maintPool = round2(p.expenses * 0.35 * 12);
    let mAlloc = 0;
    maintCats.forEach(([key, label, share], idx) => {
      const annual =
        idx === maintCats.length - 1
          ? round2(maintPool - mAlloc)
          : round2(maintPool * share);
      mAlloc = round2(mAlloc + annual);
      const monthly = Math.floor(annual / 12);
      const months = Array(12).fill(monthly);
      months[11] = annual - monthly * 11;
      deptBudgets.push({
        id: `mgmt-budget-${p.id}-${year}-maintenance-${key}`,
        propertyId: p.id,
        propertyName: p.name,
        fiscalYear: year,
        department: "maintenance",
        categoryKey: key,
        label,
        months,
        notes: "",
        updatedAt: now,
      });
    });

    smCampaigns.push({
      id: `sm-camp-${p.id}`,
      name: `${p.name} leasing drive`,
      channel: "google",
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-28`,
      cost: round2(p.revenue * 0.01),
      revenueAttributed: round2(p.revenue * 0.04),
      leads: 12 + (occupied % 20),
      status: "active",
      notes: "Seeded leasing campaign for portfolio property",
    });
  }

  smReceipts.push({
    id: "sm-rcp-1",
    code: "SM005",
    vendor: "Google Ads",
    amount: 2400,
    fileName: "google-ads.pdf",
    submittedAt: now,
    status: "approved",
  });
  smReceipts.push({
    id: "sm-rcp-2",
    code: "SM002",
    vendor: "Open House Catering",
    amount: 680,
    fileName: "catering.pdf",
    submittedAt: now,
    status: "pending",
  });

  await upsert("sm_budget_config", "sm-budget-1", {
    id: "sm-budget-1",
    label: `${year} Sales & Marketing`,
    categories: [
      { code: "SM001", label: "Supplies", budgeted: 4000 },
      { code: "SM002", label: "Events", budgeted: 10000 },
      { code: "SM003", label: "Decoration", budgeted: 5000 },
      { code: "SM004", label: "Meals & entertainment", budgeted: 6000 },
      { code: "SM005", label: "Online Advertising", budgeted: 15000 },
    ],
  });

  await upsertMany("managed_properties", managed);
  await upsertMany("property_tenants", propertyTenants);
  await upsertMany("tenants", tenants);
  await upsertMany("rental_receivables", rentalReceivables);
  await upsertMany("payable_invoices", payableInvoices);
  await upsertMany("owner_payables", ownerPayables);
  await upsertMany("tenant_applications", tenantApps);
  await upsertMany("tenant_contracts", tenantContracts);
  await upsertMany("tenant_invoices", tenantInvoices);
  await upsertMany("work_orders", workOrders);
  await upsertMany("property_budget_packs", budgetPacks);
  await upsertMany("department_budgets", deptBudgets);
  await upsertMany("sm_campaigns", smCampaigns);
  await upsertMany("sm_receipts", smReceipts);

  await upsertMany("vendors", [
    {
      id: "v-delta",
      name: "Delta Mechanical",
      specialty: "HVAC",
      phone: "(615) 555-0101",
      email: "dispatch@deltamech.example",
      notes: "Preferred HVAC",
    },
    {
      id: "v-clearpath",
      name: "ClearPath Janitorial",
      specialty: "Janitorial",
      phone: "(615) 555-0102",
      email: "ops@clearpath.example",
      notes: "",
    },
  ]);

  console.log(
    JSON.stringify(
      {
        owners: OWNERS.length,
        properties: managed.length,
        propertyTenants: propertyTenants.length,
        tenantsRoster: tenants.length,
        ar: rentalReceivables.length,
        ap: payableInvoices.length,
        ownerPayables: ownerPayables.length,
        tenantApps: tenantApps.length,
        workOrders: workOrders.length,
        deptBudgets: deptBudgets.length,
      },
      null,
      2
    )
  );
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
