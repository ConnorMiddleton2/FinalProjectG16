import type { SupabaseClient } from "@supabase/supabase-js";

export const COLLECTIONS = {
  managedProperties: "managed_properties",
  ownerApplications: "owner_applications",
  ownerAccounts: "owner_accounts",
  ownerApprovals: "owner_approvals",
  workOrders: "work_orders",
  vendors: "vendors",
  budgetLines: "budget_lines",
  maintenanceDocuments: "maintenance_documents",
  tenantApplications: "tenant_applications",
  tenants: "tenants",
  propertyTenants: "property_tenants",
  tenantContracts: "tenant_contracts",
  tenantInvoices: "tenant_invoices",
  payableInvoices: "payable_invoices",
  ownerPayables: "owner_payables",
  /**
   * AR teammate rent ledger — Collections may READ only.
   * Never write or mutate this collection from Collections UI.
   */
  rentalReceivables: "rental_receivables",
  miscellaneousReceivables: "miscellaneous_receivables",
  /** Collections weekly notices (simulated delivery only). */
  collectionsNotices: "collections_notices",
  /** Per-tenant pause / dispute / payment-plan / review controls. */
  collectionsAccountState: "collections_account_state",
  /** 90-day management-review alerts (internal only). */
  managementAlerts: "management_alerts",
  smCampaigns: "sm_campaigns",
  smCalendarEvents: "sm_calendar_events",
  smBudgetConfig: "sm_budget_config",
  smReceipts: "sm_receipts",
  ownerContracts: "owner_contracts",
  departmentExpenses: "department_expenses",
  departmentBudgets: "department_budgets",
  propertyBudgetPlans: "property_budget_plans",
  propertyBudgetPacks: "property_budget_packs",
  apPayables: "ap_payables",
  missedPayments: "missed_payments",
  /** Management overdue-tenant escalation cases (checklists, eviction, cure flags). */
  overdueTenantCases: "overdue_tenant_cases",
  capitalExpenditures: "capital_expenditures",
  hrEmployees: "hr_employees",
  hrPayStubs: "hr_pay_stubs",
  hrTimePunches: "hr_time_punches",
  /** Operating bank accounts — one per property + corporate HQ. */
  bankAccounts: "bank_accounts",
  /** Ledger lines for bank accounts (rent in, fees, expenses, owner remits). */
  bankTransactions: "bank_transactions",
  /** Management requests for additional owner cash when a property is short. */
  ownerCashCalls: "owner_cash_calls",
  /** Biweekly (or other) payroll runs with liability buckets. */
  payrollRuns: "payroll_runs",
  /** Aggregated payroll liabilities for a run (net pay, taxes, benefits). */
  payrollLiabilities: "payroll_liabilities",
  /** Prospect / tenant portal login accounts. */
  tenantAccounts: "tenant_accounts",
  /** S&M ↔ prospect messages in the tenant portal. */
  tenantPortalMessages: "tenant_portal_messages",
  /** Tenant-reported check payments awaiting A/R approval before bank deposit. */
  pendingCheckPayments: "pending_check_payments",
  /** One active claim per tenant/period so debit/check cannot double-pay. */
  portalBalanceClaims: "portal_balance_claims",
  /** Fixed assets / PP&E by property (depreciation feeds financial statements). */
  propertyAssets: "property_assets",
} as const;

export type SharedCollection =
  (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

type SharedRow = {
  id: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** List all records in a shared collection (newest first). Paginates past PostgREST defaults. */
export async function listSharedRecords<T extends { id: string }>(
  client: SupabaseClient,
  collection: SharedCollection
): Promise<T[]> {
  const pageSize = 1000;
  const rows: SharedRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from("shared_records")
      .select("id, payload, created_at, updated_at")
      .eq("collection", collection)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to load ${collection}: ${error.message}`);
    }
    const batch = (data ?? []) as SharedRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows.map((row) => {
    const payload = row.payload ?? {};
    return {
      ...payload,
      id: row.id,
      createdAt:
        (payload.createdAt as string | undefined) ??
        (payload.created_at as string | undefined) ??
        row.created_at,
    } as unknown as T;
  });
}

/** Insert or update one shared record by id. */
export async function upsertSharedRecord(
  client: SupabaseClient,
  collection: SharedCollection,
  id: string,
  payload: Record<string, unknown>
) {
  const { error } = await client.from("shared_records").upsert(
    {
      collection,
      id,
      payload: { ...payload, id },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "collection,id" }
  );

  if (error) {
    throw new Error(`Failed to save ${collection}: ${error.message}`);
  }
}

/** Delete one shared record. */
export async function deleteSharedRecord(
  client: SupabaseClient,
  collection: SharedCollection,
  id: string
) {
  const { error } = await client
    .from("shared_records")
    .delete()
    .eq("collection", collection)
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete ${collection}: ${error.message}`);
  }
}

/** Replace an entire collection (used for budget sheet bulk edits). */
export async function replaceSharedCollection(
  client: SupabaseClient,
  collection: SharedCollection,
  records: Array<{ id: string } & Record<string, unknown>>
) {
  const existing = await listSharedRecords<{ id: string }>(client, collection);
  const nextIds = new Set(records.map((r) => r.id));

  for (const row of existing) {
    if (!nextIds.has(row.id)) {
      await deleteSharedRecord(client, collection, row.id);
    }
  }

  for (const record of records) {
    await upsertSharedRecord(client, collection, record.id, record);
  }
}
