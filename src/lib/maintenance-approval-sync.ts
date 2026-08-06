import {
  isDocumentApproved,
  maintenanceDocumentAppliesToBudget,
  normalizeMaintenanceDocument,
  normalizePriority,
  type BudgetLine,
  type MaintenanceDocument,
  type WorkOrder,
} from "@/lib/maintenance";
import { round2, todayIso } from "@/lib/money";

export function actualCostFromApprovedDocuments(
  workOrderId: string,
  docList: MaintenanceDocument[]
): string {
  const total = docList
    .filter((d) => d.workOrderId === workOrderId && isDocumentApproved(d))
    .reduce((sum, d) => {
      const n = typeof d.amount === "number" ? d.amount : Number(d.amount);
      return sum + (Number.isNaN(n) ? 0 : n);
    }, 0);
  return total > 0 ? String(round2(total)) : "";
}

export function computeWorkOrderAfterDocumentApproval(
  order: WorkOrder,
  docs: MaintenanceDocument[]
): WorkOrder {
  const actualCost = actualCostFromApprovedDocuments(order.id, docs);
  const hasApprovedLinked = docs.some(
    (d) => d.workOrderId === order.id && isDocumentApproved(d)
  );

  return {
    ...order,
    priority: normalizePriority(order.priority),
    actualCost,
    estimatedCost: "",
    budgetAppliedAmount: "",
    budgetAppliedLineId: "",
    status: hasApprovedLinked ? "completed" : order.status,
    completedAt: hasApprovedLinked
      ? order.completedAt || todayIso()
      : order.completedAt,
  };
}

/** Recompute budget line spent amounts from approved maintenance documents. */
export function computeBudgetLinesFromDocuments(
  docs: MaintenanceDocument[],
  budgetLines: BudgetLine[]
): BudgetLine[] {
  const spendByLine = new Map<string, number>();

  for (const doc of docs) {
    const n = normalizeMaintenanceDocument(doc);
    if (!isDocumentApproved(n) || !maintenanceDocumentAppliesToBudget(n)) continue;
    const lineId = n.budgetLineId?.trim();
    const amount =
      typeof n.amount === "number" ? n.amount : Number(n.amount || 0);
    if (!lineId || Number.isNaN(amount) || amount <= 0) continue;
    spendByLine.set(lineId, round2((spendByLine.get(lineId) ?? 0) + amount));
  }

  const next = budgetLines.map((line) => {
    if (line.category === "all") return line;
    return { ...line, spentAmount: spendByLine.get(line.id) ?? 0 };
  });

  const lineSpent = next
    .filter((l) => l.category !== "all")
    .reduce((sum, l) => sum + l.spentAmount, 0);

  return next.map((line) =>
    line.category === "all" ? { ...line, spentAmount: lineSpent } : line
  );
}

export function budgetLinesChanged(
  before: BudgetLine[],
  after: BudgetLine[]
): boolean {
  if (before.length !== after.length) return true;
  return after.some((line, i) => line.spentAmount !== before[i]?.spentAmount);
}

/** Update work orders linked to documents that changed approval state. */
export function syncWorkOrdersForDocuments(
  orders: WorkOrder[],
  docs: MaintenanceDocument[]
): WorkOrder[] {
  const workOrderIds = new Set(
    docs.map((d) => d.workOrderId).filter((id) => id.trim())
  );
  if (workOrderIds.size === 0) return orders;

  return orders.map((order) =>
    workOrderIds.has(order.id)
      ? computeWorkOrderAfterDocumentApproval(order, docs)
      : order
  );
}
