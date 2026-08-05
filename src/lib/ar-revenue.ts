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

function propertyMatches(
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
  return candidates.some(
    (hay) => hay.includes(want) || want.includes(hay)
  );
}

/**
 * Accounts Receivable revenue algorithm:
 * sum of Paid invoice amounts for the property in the fiscal year.
 */
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
    if (!propertyMatches(inv, opts)) continue;
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
        !propertyMatches(inv, {
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
