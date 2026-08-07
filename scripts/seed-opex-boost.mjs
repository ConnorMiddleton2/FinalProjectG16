/**
 * Boost property OpEx so Expenses & payroll ≥ 50% of Rent in on Banks.
 * Creates maintenance invoices + S&M receipts → paid payable_invoices → bank debits.
 *
 * Usage (optional CLI; prefer running SQL via MCP / apply):
 *   node scripts/seed-opex-boost.mjs <SUPABASE_URL> <ANON_OR_SERVICE_KEY>
 */
import { createClient } from "@supabase/supabase-js";

const url = process.argv[2];
const key = process.argv[3];
if (!url || !key) {
  console.error("Usage: node scripts/seed-opex-boost.mjs <URL> <KEY>");
  process.exit(1);
}

const sb = createClient(url, key);
const now = new Date().toISOString();
const today = now.slice(0, 10);
const period = today.slice(0, 7);

function round2(n) {
  return Math.round(n * 100) / 100;
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

/**
 * Target: expenses ≥ 50% of rent (from live Banks snapshot).
 * Gaps: Grandview ~105k, Meridian ~70k, Riverbend ~13k.
 */
const BOOSTS = [
  {
    property: "Grandview Apartments",
    propertyId: "prop-grandview",
    maint: [
      {
        id: "opex-boost-gv-hvac",
        vendor: "ClimatePro HVAC Services",
        amount: 38500,
        category: "maintenance",
        invoiceNumber: "CP-HVAC-2026-081",
        notes: "Chiller overhaul + common-area HVAC filters (Q3)",
        woCategory: "hvac",
      },
      {
        id: "opex-boost-gv-elev",
        vendor: "Summit Elevator Co",
        amount: 27200,
        category: "repairs",
        invoiceNumber: "SE-ELV-4412",
        notes: "Elevator modernization progress billing",
        woCategory: "structural",
      },
      {
        id: "opex-boost-gv-unit",
        vendor: "ReadyUnit Turnovers LLC",
        amount: 14800,
        category: "maintenance",
        invoiceNumber: "RU-MR-9021",
        notes: "Make-ready turnovers · 14 units",
        woCategory: "make_ready",
      },
    ],
    sm: [
      {
        id: "opex-boost-gv-ads",
        vendor: "Metro Digital Ads",
        amount: 16500,
        code: "SM005",
        description: "Grandview leasing campaign · Google + Meta",
      },
      {
        id: "opex-boost-gv-events",
        vendor: "Neighborhood Open House Co",
        amount: 8000,
        code: "SM002",
        description: "Resident + prospect open-house series",
      },
    ],
  },
  {
    property: "Meridian Tower",
    propertyId: "prop-meridian-tower",
    maint: [
      {
        id: "opex-boost-mt-hvac",
        vendor: "Loop Mechanical Systems",
        amount: 24800,
        category: "maintenance",
        invoiceNumber: "LMS-MT-778",
        notes: "Floor HVAC retrofit · floors 4–6",
        woCategory: "hvac",
      },
      {
        id: "opex-boost-mt-elec",
        vendor: "Lakeshore Electrical",
        amount: 19200,
        category: "repairs",
        invoiceNumber: "LE-MT-3301",
        notes: "Emergency panel upgrade + LED common areas",
        woCategory: "electrical",
      },
    ],
    sm: [
      {
        id: "opex-boost-mt-ads",
        vendor: "Chicago Office Leasing Media",
        amount: 15500,
        code: "SM005",
        description: "Meridian suite availability advertising",
      },
      {
        id: "opex-boost-mt-broker",
        vendor: "Harbor Brokerage Partners",
        amount: 10500,
        code: "SM004",
        description: "Broker entertainment + tour program",
      },
    ],
  },
  {
    property: "Riverbend Commerce Center",
    propertyId: null,
    maint: [
      {
        id: "opex-boost-rb-dock",
        vendor: "Delta Dock & Door",
        amount: 5200,
        category: "repairs",
        invoiceNumber: "DDD-RB-118",
        notes: "Dock leveler repair · bays 3–5",
        woCategory: "structural",
      },
      {
        id: "opex-boost-rb-lawn",
        vendor: "Oxford Groundskeeping",
        amount: 3100,
        category: "lawncare",
        invoiceNumber: "OG-RB-552",
        notes: "Seasonal landscaping + parking lot litter service",
        woCategory: "landscaping",
      },
    ],
    sm: [
      {
        id: "opex-boost-rb-ads",
        vendor: "Industrial Space Listings",
        amount: 4700,
        code: "SM005",
        description: "Riverbend flex-bay marketing push",
      },
    ],
  },
];

async function main() {
  // Raise S&M category caps so approved receipts fit the budget.
  await upsert("sm_budget_config", "sm-budget-1", {
    id: "sm-budget-1",
    label: "2026 Sales & Marketing",
    categories: [
      { code: "SM001", label: "Supplies", budgeted: 8000 },
      { code: "SM002", label: "Events", budgeted: 22000 },
      { code: "SM003", label: "Decoration", budgeted: 8000 },
      { code: "SM004", label: "Meals & entertainment", budgeted: 18000 },
      { code: "SM005", label: "Online Advertising", budgeted: 55000 },
    ],
    totalBudget: 111000,
  });

  const { data: accounts, error: accErr } = await sb
    .from("shared_records")
    .select("id, payload")
    .eq("collection", "bank_accounts");
  if (accErr) throw accErr;

  const accountByProperty = new Map();
  for (const row of accounts || []) {
    const name = (row.payload?.propertyName || "").trim();
    if (name) accountByProperty.set(name, { id: row.id, payload: row.payload });
  }

  let invoices = 0;
  let receipts = 0;
  let docs = 0;
  let bankDebits = 0;

  for (const prop of BOOSTS) {
    const account = accountByProperty.get(prop.property);
    if (!account) {
      console.warn(`No bank account for ${prop.property} — skipping bank posts`);
    }

    for (const m of prop.maint) {
      const apId = `apq:${m.id}`;
      const invId = m.id;
      const docId = `mdoc:${m.id}`;

      await upsert("maintenance_documents", docId, {
        id: docId,
        kind: "invoice",
        vendorName: m.vendor,
        property: prop.property,
        amount: m.amount,
        amountPaid: m.amount,
        documentDate: today,
        invoiceDate: today,
        dueDate: today,
        invoiceNumber: m.invoiceNumber,
        vendorId: "",
        disputed: false,
        payableCategory: m.category,
        workOrderId: "",
        category: m.woCategory,
        fileName: `${m.invoiceNumber}.pdf`,
        notes: m.notes,
        submittedAt: now,
        applyToBudget: true,
        budgetLineId: "",
        approvalStatus: "approved",
        submittedForApprovalAt: now,
        approvedAt: now,
        approvedBy: "Management (opex boost)",
      });
      docs += 1;

      await upsert("ap_payables", apId, {
        id: apId,
        sourceExpenseId: `maint:${docId}`,
        source: "maintenance",
        department: "maintenance",
        departmentLabel: "Maintenance",
        code: m.woCategory.toUpperCase(),
        vendor: m.vendor,
        amount: m.amount,
        description: m.notes,
        fileName: `${m.invoiceNumber}.pdf`,
        status: "paid",
        receivedAt: now,
        approvedByManagementAt: now,
        notes: `Paid · ${prop.property}`,
      });

      await upsert("payable_invoices", invId, {
        id: invId,
        invoiceNumber: m.invoiceNumber,
        vendorName: m.vendor,
        vendorId: "",
        category: m.category,
        property: prop.property,
        amount: m.amount,
        amountPaid: m.amount,
        disputed: false,
        invoiceDate: today,
        dueDate: today,
        fileName: `${m.invoiceNumber}.pdf`,
        notes: m.notes,
        createdAt: now,
      });
      invoices += 1;

      if (account) {
        const txnId = `btxn-ap:${invId}`;
        await upsert("bank_transactions", txnId, {
          id: txnId,
          accountId: account.id,
          kind: "property_expense",
          amount: m.amount,
          direction: "debit",
          memo: `${m.category} · ${m.vendor}`,
          counterparty: m.vendor,
          propertyId: account.payload.propertyId || prop.propertyId || "",
          propertyName: prop.property,
          relatedId: invId,
          period,
          createdAt: now,
        });
        bankDebits += 1;
        account.payload.balance = round2(
          Number(account.payload.balance || 0) - m.amount
        );
      }
    }

    for (const s of prop.sm) {
      const receiptId = s.id;
      const invId = `mgmt-inv:sm:${receiptId}`;
      const apId = `apq:sm:${receiptId}`;

      await upsert("sm_receipts", receiptId, {
        id: receiptId,
        code: s.code,
        vendor: s.vendor,
        amount: s.amount,
        description: `${s.description} · ${prop.property}`,
        fileName: `${receiptId}.pdf`,
        status: "approved",
        submittedAt: now,
        approvedAt: now,
      });
      receipts += 1;

      await upsert("ap_payables", apId, {
        id: apId,
        sourceExpenseId: `sm:${receiptId}`,
        source: "sales_marketing",
        department: "sales_marketing",
        departmentLabel: "Sales & Marketing",
        code: s.code,
        vendor: s.vendor,
        amount: s.amount,
        description: `${s.description} · ${prop.property}`,
        fileName: `${receiptId}.pdf`,
        status: "paid",
        receivedAt: now,
        approvedByManagementAt: now,
        notes: `Paid · ${prop.property}`,
      });

      await upsert("payable_invoices", invId, {
        id: invId,
        invoiceNumber: `SM-${s.code}-${prop.property.slice(0, 3).toUpperCase()}`,
        vendorName: s.vendor,
        vendorId: "",
        category: "professional_fees",
        property: prop.property,
        amount: s.amount,
        amountPaid: s.amount,
        disputed: false,
        invoiceDate: today,
        dueDate: today,
        fileName: `${receiptId}.pdf`,
        notes: `${s.description} · ${prop.property}`,
        createdAt: now,
      });
      invoices += 1;

      if (account) {
        const txnId = `btxn-ap:${invId}`;
        await upsert("bank_transactions", txnId, {
          id: txnId,
          accountId: account.id,
          kind: "property_expense",
          amount: s.amount,
          direction: "debit",
          memo: `professional_fees · ${s.vendor}`,
          counterparty: s.vendor,
          propertyId: account.payload.propertyId || prop.propertyId || "",
          propertyName: prop.property,
          relatedId: invId,
          period,
          createdAt: now,
        });
        bankDebits += 1;
        account.payload.balance = round2(
          Number(account.payload.balance || 0) - s.amount
        );
      }
    }

    if (account) {
      await upsert("bank_accounts", account.id, {
        ...account.payload,
        balance: round2(Number(account.payload.balance || 0)),
        updatedAt: now,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        docs,
        invoices,
        receipts,
        bankDebits,
        note: "Refresh Banks → Rebuild rent & expense cash if balances look off after other ledger edits.",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
