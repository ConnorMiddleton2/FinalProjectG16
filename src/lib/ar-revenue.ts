import type { Receivable } from "@/lib/accounts-receivable";
import type { TenantInvoice } from "@/lib/portal-records";

/** Parse "$4,800.00" / "4800" → number. */
export function parseInvoiceAmount(amount: string | number | undefined): number {
  if (typeof amount === "number") return Number.isFinite(amount) ? amount : 0;
  if (!amount) return 0;
  const n = Number(String(amount).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Prefer paidAt, then dueDate / due, for fiscal-year attribution. */
export function invoiceRevenueDate(inv: TenantInvoice): Date | null {
  const raw = inv.paidAt || inv.dueDate || inv.due || "";
  if (!raw) return null;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function propertyNameMatches(
  haystack: string,
  propertyName: string
): boolean {
  const want = propertyName.trim().toLowerCase();
  const hay = haystack.trim().toLowerCase();
  if (!want || !hay) return false;
  return hay.includes(want) || want.includes(hay);
}

function receivableInYear(row: Receivable, fiscalYear: number): boolean {
  const raw = row.dueDate || row.invoiceDate || row.createdAt || "";
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) && d.getFullYear() === fiscalYear;
}

/**
 * Primary AR revenue: cash collected (`amountReceived`) from the ops
 * Accounts Receivable ledgers for a property + year.
 */
export function paidReceivableRevenueForProperty(
  rows: Receivable[],
  opts: { propertyName: string; fiscalYear: number }
): number {
  let total = 0;
  for (const row of rows) {
    if ((row.amountReceived || 0) <= 0) continue;
    if (!propertyNameMatches(row.property || "", opts.propertyName)) continue;
    if (!receivableInYear(row, opts.fiscalYear)) continue;
    total += Number(row.amountReceived) || 0;
  }
  return Math.round(total);
}

export function paidReceivableRevenueCompany(
  rows: Receivable[],
  properties: { name: string }[],
  fiscalYear: number
): number {
  const seen = new Set<string>();
  let total = 0;
  for (const p of properties) {
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      if ((row.amountReceived || 0) <= 0) continue;
      if (!propertyNameMatches(row.property || "", p.name)) continue;
      if (!receivableInYear(row, fiscalYear)) continue;
      seen.add(row.id);
      total += Number(row.amountReceived) || 0;
    }
  }
  return Math.round(total);
}

function propertyMatchesInvoice(
  inv: TenantInvoice,
  opts: { propertyId?: string | null; propertyName?: string | null }
): boolean {
  if (opts.propertyId && inv.propertyId && inv.propertyId === opts.propertyId) {
    return true;
  }
  const want = (opts.propertyName || "").trim().toLowerCase();
  if (!want) return false;
  const candidates = [inv.propertyName || "", inv.label || ""]
    .map((s) => s.toLowerCase())
    .filter(Boolean);
  return candidates.some((hay) => hay.includes(want) || want.includes(hay));
}

/** Legacy portal tenant_invoices fallback (Paid status only). */
export function paidArRevenueForProperty(
  invoices: TenantInvoice[],
  opts: {
    propertyId?: string | null;
    propertyName: string;
    fiscalYear: number;
  }
): number {
  let total = 0;
  for (const inv of invoices) {
    if (inv.status !== "Paid") continue;
    if (!propertyMatchesInvoice(inv, opts)) continue;
    const d = invoiceRevenueDate(inv);
    if (!d || d.getFullYear() !== opts.fiscalYear) continue;
    total += parseInvoiceAmount(inv.amount);
  }
  return Math.round(total);
}

export function paidArRevenueCompany(
  invoices: TenantInvoice[],
  properties: { id: string; name: string }[],
  fiscalYear: number
): number {
  const seen = new Set<string>();
  let total = 0;
  for (const p of properties) {
    for (const inv of invoices) {
      if (inv.status !== "Paid") continue;
      if (seen.has(inv.id)) continue;
      if (
        !propertyMatchesInvoice(inv, {
          propertyId: p.id,
          propertyName: p.name,
        })
      ) {
        continue;
      }
      const d = invoiceRevenueDate(inv);
      if (!d || d.getFullYear() !== fiscalYear) continue;
      seen.add(inv.id);
      total += parseInvoiceAmount(inv.amount);
    }
  }
  return Math.round(total);
}

/** Prefer ops AR ledgers; fall back to portal Paid invoices. */
export function propertyRevenueFromAr(input: {
  receivables: Receivable[];
  invoices: TenantInvoice[];
  propertyId?: string | null;
  propertyName: string;
  fiscalYear: number;
}): number {
  const fromLedger = paidReceivableRevenueForProperty(input.receivables, {
    propertyName: input.propertyName,
    fiscalYear: input.fiscalYear,
  });
  if (fromLedger > 0) return fromLedger;
  return paidArRevenueForProperty(input.invoices, {
    propertyId: input.propertyId,
    propertyName: input.propertyName,
    fiscalYear: input.fiscalYear,
  });
}

export function companyRevenueFromAr(input: {
  receivables: Receivable[];
  invoices: TenantInvoice[];
  properties: { id: string; name: string }[];
  fiscalYear: number;
}): number {
  const fromLedger = paidReceivableRevenueCompany(
    input.receivables,
    input.properties,
    input.fiscalYear
  );
  if (fromLedger > 0) return fromLedger;
  return paidArRevenueCompany(
    input.invoices,
    input.properties,
    input.fiscalYear
  );
}
