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
  capitalExpenditures: "capital_expenditures",
} as const;

export type SharedCollection =
  (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

type SharedRow = {
  id: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** List all records in a shared collection (newest first). */
export async function listSharedRecords<T extends { id: string }>(
  client: SupabaseClient,
  collection: SharedCollection
): Promise<T[]> {
  const { data, error } = await client
    .from("shared_records")
    .select("id, payload, created_at, updated_at")
    .eq("collection", collection)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load ${collection}: ${error.message}`);
  }

  return ((data ?? []) as SharedRow[]).map((row) => {
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
