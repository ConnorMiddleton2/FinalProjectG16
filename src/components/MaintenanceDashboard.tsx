"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  LogOut,
  Pencil,
  PlusCircle,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  categoryLabel,
  documentToForm,
  emptyDocument,
  emptyWorkOrder,
  generateMaintenanceInvoiceNumber,
  isDocumentApproved,
  laborLabel,
  maintenanceDocumentAppliesToBudget,
  maintenanceDocumentForwardsToAp,
  normalizeDocumentApproval,
  normalizeMaintenanceDocument,
  approvalStatusLabel,
  normalizePriority,
  priorityLabel,
  sourceLabel,
  statusLabel,
  workOrderCategoryToPayableCategory,
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type BudgetLine,
  type DocumentKind,
  type MaintenanceDocument,
  type MaintenanceDocumentForm,
  type VendorRecord,
  type WorkOrder,
  type WorkOrderCategory,
  type WorkOrderLabor,
  type WorkOrderPriority,
  type WorkOrderSource,
  type WorkOrderStatus,
} from "@/lib/maintenance";
import { submitDocumentForApproval } from "@/lib/document-approval";
import { maintenanceDocPayableStatusLabel } from "@/lib/maintenance-finance-bridge";
import {
  addDaysIso,
  money,
  parsePaidAmount,
  parsePositiveAmount,
  round2,
  todayIso,
} from "@/lib/money";
import type { ManagementContractDraft } from "@/lib/management-contract";

type Panel = "new" | "ledger" | "vendors" | "budget" | "documents";
type BudgetView = "budget" | "expenses" | "ytd";

type EditingDocument = MaintenanceDocumentForm & {
  id: string;
  submittedAt: string;
};

type Filters = {
  status: WorkOrderStatus | "all";
  source: WorkOrderSource | "all";
  labor: WorkOrderLabor | "all";
  category: WorkOrderCategory | "all";
  property: string;
  dateFrom: string;
  dateTo: string;
};

const defaultFilters: Filters = {
  status: "all",
  source: "all",
  labor: "all",
  category: "all",
  property: "",
  dateFrom: "",
  dateTo: "",
};

const PROPERTY_OTHER = "__other__";

function priorityBadgeClass(priority: WorkOrderPriority) {
  switch (priority) {
    case "emergency":
      return "badge-error";
    case "high":
      return "badge-warning";
    case "low":
      return "badge-ghost";
    default:
      return "badge-outline";
  }
}

export function MaintenanceDashboard() {
  const [panel, setPanel] = useState<Panel>("new");
  const {
    items: orders,
    saveOne: saveOrder,
    loading: ordersLoading,
    error: ordersError,
  } = useSharedCollection<WorkOrder>(COLLECTIONS.workOrders);
  const {
    items: vendors,
    saveOne: saveVendor,
  } = useSharedCollection<VendorRecord>(COLLECTIONS.vendors);
  const {
    items: budget,
    setItems: setBudget,
    saveOne: saveBudgetLine,
    saveAll: saveBudgetAll,
  } = useSharedCollection<BudgetLine>(COLLECTIONS.budgetLines);
  const {
    items: rawDocuments,
    saveOne: saveDocumentRaw,
  } = useSharedCollection<MaintenanceDocument>(COLLECTIONS.maintenanceDocuments);
  const documents = useMemo(
    () => rawDocuments.map((d) => normalizeMaintenanceDocument(d)),
    [rawDocuments]
  );
  async function saveDocument(doc: MaintenanceDocument) {
    await saveDocumentRaw(normalizeMaintenanceDocument(doc));
  }
  const { items: managedProperties } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [form, setForm] = useState(emptyWorkOrder);
  // Default to Other so the controlled <select> always matches an enabled option
  // (empty + disabled placeholder causes SSR/client hydration mismatches).
  const [propertyChoice, setPropertyChoice] = useState(PROPERTY_OTHER);
  const [docForm, setDocForm] = useState(emptyDocument);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    lineId: "",
    amount: "",
    note: "",
  });
  const [budgetView, setBudgetView] = useState<BudgetView>("budget");
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<EditingDocument | null>(null);
  const [editDocSaving, setEditDocSaving] = useState(false);

  const managedPropertyNames = useMemo(() => {
    return Array.from(
      new Set(
        managedProperties.map((p) => p.propertyName?.trim()).filter(Boolean)
      )
    ).sort();
  }, [managedProperties]);

  const propertySelectValue =
    propertyChoice ||
    (managedPropertyNames.includes(form.property)
      ? form.property
      : PROPERTY_OTHER);

  const showPropertyNameInput =
    propertySelectValue === PROPERTY_OTHER ||
    (!!form.property && !managedPropertyNames.includes(form.property));

  const properties = useMemo(() => {
    const fromOrders = orders.map((o) => o.property).filter(Boolean);
    return Array.from(
      new Set([...managedPropertyNames, ...fromOrders])
    ).sort();
  }, [orders, managedPropertyNames]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filters.status !== "all" && o.status !== filters.status) return false;
      if (filters.source !== "all" && o.source !== filters.source) return false;
      if (filters.labor !== "all" && o.labor !== filters.labor) return false;
      if (filters.category !== "all" && o.category !== filters.category)
        return false;
      if (
        filters.property &&
        !o.property.toLowerCase().includes(filters.property.toLowerCase())
      ) {
        return false;
      }
      if (filters.dateFrom && o.createdAt < filters.dateFrom) return false;
      if (filters.dateTo && o.createdAt > filters.dateTo) return false;
      return true;
    });
  }, [orders, filters]);

  const thirdPartyOpen = useMemo(
    () =>
      orders.filter(
        (o) => o.labor === "third_party" && o.status !== "completed"
      ),
    [orders]
  );

  const budgetSheetRows = useMemo(() => {
    const lines = budget.filter((b) => b.category !== "all");
    const totalBudget = lines.reduce((sum, b) => sum + b.budgetAmount, 0);
    const totalSpent = lines.reduce((sum, b) => sum + b.spentAmount, 0);
    const existingTotal = budget.find((b) => b.category === "all");
    return [
      ...lines,
      {
        id: existingTotal?.id ?? "total",
        category: "all" as const,
        label: existingTotal?.label ?? "Total maintenance budget",
        budgetAmount: totalBudget,
        spentAmount: totalSpent,
        notes: existingTotal?.notes ?? "",
      },
    ];
  }, [budget]);

  const budgetLinesOnly = useMemo(
    () => budgetSheetRows.filter((b) => b.category !== "all"),
    [budgetSheetRows]
  );

  const budgetTotals = useMemo(() => {
    const total = budgetSheetRows.find((b) => b.category === "all");
    const totalBudget = total?.budgetAmount ?? 0;
    const totalSpent = total?.spentAmount ?? 0;
    const remaining = totalBudget - totalSpent;
    const pct = totalBudget
      ? Math.round((totalSpent / totalBudget) * 100)
      : 0;
    return { totalBudget, totalSpent, remaining, pct };
  }, [budgetSheetRows]);

  const budgetSyncKeyRef = useRef("");
  useEffect(() => {
    if (ordersLoading) return;
    const key = JSON.stringify({
      docs: documents.map((d) => [
        d.id,
        d.applyToBudget,
        d.budgetLineId,
        d.amount,
        d.workOrderId,
        d.approvalStatus ?? "approved",
      ]),
      lineIds: budget.map((b) => b.id),
    });
    if (key === budgetSyncKeyRef.current) return;
    budgetSyncKeyRef.current = key;
    void syncBudgetSpendFromLedger(orders, documents, budget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, documents, budget, ordersLoading]);

  const docsByWorkOrderId = useMemo(() => {
    const map = new Map<string, MaintenanceDocument[]>();
    for (const doc of documents) {
      if (!doc.workOrderId) continue;
      const list = map.get(doc.workOrderId) ?? [];
      list.push(doc);
      map.set(doc.workOrderId, list);
    }
    return map;
  }, [documents]);

  function linkedDocsForWorkOrder(workOrderId: string) {
    return docsByWorkOrderId.get(workOrderId) ?? [];
  }

  function linkedDocsSummary(workOrderId: string) {
    const linked = linkedDocsForWorkOrder(workOrderId);
    if (linked.length === 0) return null;
    const approvedTotal = linked.reduce((sum, d) => {
      if (!isDocumentApproved(d)) return sum;
      return sum + (Number.isFinite(d.amount) ? d.amount : 0);
    }, 0);
    const label =
      linked.length === 1
        ? `1 ${linked[0].kind}`
        : `${linked.length} invoices/receipts`;
    return `${label} · ${money(round2(approvedTotal))}`;
  }

  function actualCostFromDocuments(
    workOrderId: string,
    docList: MaintenanceDocument[]
  ) {
    const total = docList
      .filter(
        (d) => d.workOrderId === workOrderId && isDocumentApproved(d)
      )
      .reduce((sum, d) => {
        const n = typeof d.amount === "number" ? d.amount : Number(d.amount);
        return sum + (Number.isNaN(n) ? 0 : n);
      }, 0);
    return total > 0 ? String(round2(total)) : "";
  }

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onPropertyChoiceChange(value: string) {
    setPropertyChoice(value);
    if (value === PROPERTY_OTHER) {
      updateForm("property", "");
    } else {
      updateForm("property", value);
    }
  }

  async function handleCreateWorkOrder(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.property.trim() || !form.description.trim()) {
      setSavedMsg("Title, property, and description are required.");
      return;
    }

    const next: WorkOrder = {
      ...form,
      status: "pending",
      priority: normalizePriority(form.priority),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString().slice(0, 10),
      completedAt: "",
      estimatedCost: "",
      actualCost: "",
      budgetAppliedAmount: "",
      budgetAppliedLineId: "",
    };

    setSaving(true);
    try {
      await saveOrder(next);
      setForm(emptyWorkOrder());
      setPropertyChoice(PROPERTY_OTHER);
      setHighlightId(next.id);
      setSavedMsg("Work order added to the ledger.");
      setPanel("ledger");
      setTimeout(() => setSavedMsg(null), 3500);
      setTimeout(() => setHighlightId(null), 6000);
    } catch (err) {
      setSavedMsg(
        err instanceof Error ? err.message : "Could not save work order."
      );
    } finally {
      setSaving(false);
    }
  }

  function updateOrderStatus(id: string, status: WorkOrderStatus) {
    const current = orders.find((o) => o.id === id);
    if (!current) return;
    const updated: WorkOrder = {
      ...current,
      priority: normalizePriority(current.priority),
      status,
      completedAt:
        status === "completed"
          ? current.completedAt || new Date().toISOString().slice(0, 10)
          : "",
    };
    void saveOrder(updated);
    if (editingOrder?.id === id) {
      setEditingOrder(updated);
    }
  }

  function startEditOrder(order: WorkOrder) {
    setEditingOrder({
      ...order,
      priority: normalizePriority(order.priority),
    });
  }

  function cancelEditOrder() {
    setEditingOrder(null);
  }

  function updateEditingOrder<K extends keyof WorkOrder>(
    key: K,
    value: WorkOrder[K]
  ) {
    setEditingOrder((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function syncBudgetSpendFromLedger(
    _orderList: WorkOrder[],
    docList: MaintenanceDocument[],
    budgetList: BudgetLine[] = budget
  ) {
    const spendByLine = new Map<string, number>();

    for (const doc of docList) {
      if (!isDocumentApproved(doc) || !maintenanceDocumentAppliesToBudget(doc)) continue;
      const lineId = doc.budgetLineId?.trim();
      const amount =
        typeof doc.amount === "number" ? doc.amount : Number(doc.amount || 0);
      if (!lineId || Number.isNaN(amount) || amount <= 0) continue;
      spendByLine.set(
        lineId,
        round2((spendByLine.get(lineId) ?? 0) + amount)
      );
    }

    let changed = false;
    const next = budgetList.map((line) => {
      if (line.category === "all") return line;
      const spentAmount = spendByLine.get(line.id) ?? 0;
      if (spentAmount !== line.spentAmount) changed = true;
      return { ...line, spentAmount };
    });

    const lineSpent = next
      .filter((l) => l.category !== "all")
      .reduce((sum, l) => sum + l.spentAmount, 0);
    const withTotals = next.map((line) => {
      if (line.category !== "all") return line;
      if (line.spentAmount !== lineSpent) changed = true;
      return { ...line, spentAmount: lineSpent };
    });

    if (changed) {
      await saveBudgetAll(withTotals);
    }
  }

  function resolveBudgetLineForWorkOrder(order: WorkOrder, preferredId: string) {
    const lines = budget.filter((b) => b.category !== "all");
    if (preferredId && lines.some((l) => l.id === preferredId)) {
      return preferredId;
    }
    if (
      order.budgetAppliedLineId &&
      lines.some((l) => l.id === order.budgetAppliedLineId)
    ) {
      return order.budgetAppliedLineId;
    }
    const byCategory = lines.find((l) => l.category === order.category);
    return byCategory?.id ?? lines[0]?.id ?? "";
  }

  async function handleSaveEditedWorkOrder(e: FormEvent) {
    e.preventDefault();
    if (!editingOrder) return;
    if (
      !editingOrder.title.trim() ||
      !editingOrder.property.trim() ||
      !editingOrder.description.trim()
    ) {
      setSavedMsg("Title, property, and description are required.");
      return;
    }

    const linkedActual = actualCostFromDocuments(
      editingOrder.id,
      documents
    );

    const updated: WorkOrder = {
      ...editingOrder,
      priority: normalizePriority(editingOrder.priority),
      estimatedCost: "",
      actualCost: linkedActual,
      budgetAppliedAmount: "",
      budgetAppliedLineId: "",
      completedAt:
        editingOrder.status === "completed"
          ? editingOrder.completedAt ||
            new Date().toISOString().slice(0, 10)
          : "",
    };

    setEditSaving(true);
    try {
      await saveOrder(updated);
      setHighlightId(updated.id);
      setSavedMsg("Work order updated.");
      cancelEditOrder();
      setTimeout(() => setSavedMsg(null), 3500);
      setTimeout(() => setHighlightId(null), 6000);
    } catch (err) {
      setSavedMsg(
        err instanceof Error ? err.message : "Could not update work order."
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function addVendor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: VendorRecord = {
      id: crypto.randomUUID(),
      name: String(data.get("name") ?? "").trim(),
      specialty: String(data.get("specialty") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
    };
    if (!next.name) return;
    await saveVendor(next);
    e.currentTarget.reset();
  }

  async function recordExpense(e: FormEvent) {
    e.preventDefault();
    const amount = parsePositiveAmount(expenseForm.amount);
    if (!expenseForm.lineId || amount == null) return;

    const line = budget.find((b) => b.id === expenseForm.lineId);
    const category =
      line && line.category !== "all" ? line.category : ("" as const);
    const id = crypto.randomUUID();
    const day = todayIso();
    const receipt = submitDocumentForApproval(
      normalizeMaintenanceDocument({
        id,
        kind: "receipt",
        vendorName: "Manual expense",
        property: "",
        amount,
        documentDate: day,
        invoiceDate: day,
        dueDate: "",
        invoiceNumber: generateMaintenanceInvoiceNumber(id),
        vendorId: "",
        amountPaid: 0,
        disputed: false,
        payableCategory: category
          ? workOrderCategoryToPayableCategory(category)
          : "other",
        workOrderId: "",
        category: category || "",
        fileName: "manual-expense",
        notes: expenseForm.note.trim() || "Posted from Budget dashboard",
        submittedAt: new Date().toISOString(),
        applyToBudget: true,
        budgetLineId: expenseForm.lineId,
        approvalStatus: "pending",
        submittedForApprovalAt: "",
        approvedAt: "",
        approvedBy: "",
        rejectionReason: "",
      })
    );

    await saveDocument(receipt);
    await syncBudgetSpendFromLedger(orders, [receipt, ...documents]);
    setExpenseForm({ lineId: "", amount: "", note: "" });
    setBudgetView("expenses");
    setSavedMsg(
      isDocumentApproved(receipt)
        ? "Expense submitted and applied to budget."
        : "Submitted to Management for approval. Budget will update once approved."
    );
    setTimeout(() => setSavedMsg(null), 3500);
  }

  function updateDocForm<K extends keyof MaintenanceDocumentForm>(
    key: K,
    value: MaintenanceDocumentForm[K]
  ) {
    setDocForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmitDocument(e: FormEvent) {
    e.preventDefault();
    if (!docForm.workOrderId.trim()) {
      setSavedMsg("Select the work order this invoice or receipt belongs to.");
      return;
    }
    if (!docForm.vendorName.trim() || !docForm.amount.trim()) {
      setSavedMsg("Payee and amount are required for invoices/receipts.");
      return;
    }

    const linkedOrder = orders.find((o) => o.id === docForm.workOrderId);
    if (!linkedOrder) {
      setSavedMsg("Selected work order was not found in the ledger.");
      return;
    }

    const amount = parsePositiveAmount(docForm.amount);
    if (amount == null) {
      setSavedMsg("Enter a valid amount greater than zero.");
      return;
    }

    const budgetLineId =
      docForm.budgetLineId ||
      resolveBudgetLineForWorkOrder(linkedOrder, "") ||
      "";

    const category = docForm.category || linkedOrder.category;
    const id = crypto.randomUUID();
    const invoiceDate = docForm.invoiceDate || docForm.documentDate || todayIso();
    const next: MaintenanceDocument = submitDocumentForApproval(
      normalizeMaintenanceDocument({
        ...docForm,
        id,
        submittedAt: new Date().toISOString(),
        applyToBudget: true,
        budgetLineId,
        category,
        property: docForm.property.trim() || linkedOrder.property,
        amount,
        amountPaid: parsePaidAmount(docForm.amountPaid) ?? 0,
        documentDate: invoiceDate,
        invoiceDate,
        dueDate: docForm.dueDate || addDaysIso(invoiceDate, 30),
        invoiceNumber:
          docForm.invoiceNumber.trim() ||
          generateMaintenanceInvoiceNumber(id),
        vendorId: docForm.vendorId,
        disputed: docForm.disputed,
        payableCategory:
          docForm.payableCategory ||
          workOrderCategoryToPayableCategory(category),
        approvalStatus: "pending",
        submittedForApprovalAt: "",
        approvedAt: "",
        approvedBy: "",
        rejectionReason: "",
      })
    );

    try {
      await saveDocument(next);
      const nextDocs = [next, ...documents.filter((d) => d.id !== next.id)];
      const actualCost = actualCostFromDocuments(linkedOrder.id, nextDocs);
      const updatedOrder: WorkOrder = {
        ...linkedOrder,
        priority: normalizePriority(linkedOrder.priority),
        actualCost,
        estimatedCost: "",
        budgetAppliedAmount: "",
        budgetAppliedLineId: "",
        status: isDocumentApproved(next) ? "completed" : linkedOrder.status,
        completedAt: isDocumentApproved(next)
          ? linkedOrder.completedAt || todayIso()
          : linkedOrder.completedAt,
      };
      await saveOrder(updatedOrder);
      await syncBudgetSpendFromLedger(
        [updatedOrder, ...orders.filter((o) => o.id !== updatedOrder.id)],
        nextDocs
      );

      setDocForm(emptyDocument());
      setHighlightId(updatedOrder.id);
      setSavedMsg(
        isDocumentApproved(next)
          ? `${docForm.kind === "invoice" ? "Invoice" : "Receipt"} submitted, linked to "${updatedOrder.title}", and budget synced.`
          : docForm.kind === "invoice"
            ? `Invoice submitted to Management for approval. Will forward to Accounts Payable once approved.`
            : `Receipt submitted to Management for approval. Budget and work order will update once approved.`
      );
      setTimeout(() => setSavedMsg(null), 4000);
      setTimeout(() => setHighlightId(null), 6000);
    } catch (err) {
      setSavedMsg(
        err instanceof Error ? err.message : "Could not save document."
      );
    }
  }

  function onDocumentWorkOrderChange(workOrderId: string) {
    const order = orders.find((o) => o.id === workOrderId);
    if (!order) {
      updateDocForm("workOrderId", workOrderId);
      return;
    }
    setDocForm((prev) => ({
      ...prev,
      workOrderId,
      property: order.property,
      category: order.category,
      payableCategory: workOrderCategoryToPayableCategory(order.category),
      applyToBudget: true,
      budgetLineId: resolveBudgetLineForWorkOrder(order, prev.budgetLineId),
    }));
  }

  function startEditDocument(doc: MaintenanceDocument) {
    const n = normalizeMaintenanceDocument(doc);
    setEditingDocument({
      ...documentToForm(n),
      id: n.id,
      submittedAt: n.submittedAt,
    });
  }

  function cancelEditDocument() {
    setEditingDocument(null);
  }

  function updateEditingDocument<K extends keyof EditingDocument>(
    key: K,
    value: EditingDocument[K]
  ) {
    setEditingDocument((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function onEditingDocumentWorkOrderChange(workOrderId: string) {
    const order = orders.find((o) => o.id === workOrderId);
    if (!order) {
      updateEditingDocument("workOrderId", workOrderId);
      return;
    }
    setEditingDocument((prev) =>
      prev
        ? {
            ...prev,
            workOrderId,
            property: order.property,
            category: order.category,
            payableCategory: workOrderCategoryToPayableCategory(order.category),
            applyToBudget: true,
            budgetLineId: resolveBudgetLineForWorkOrder(
              order,
              prev.budgetLineId
            ),
          }
        : prev
    );
  }

  async function handleSaveEditedDocument(e: FormEvent) {
    e.preventDefault();
    if (!editingDocument) return;

    if (!editingDocument.workOrderId.trim()) {
      setSavedMsg("Select the work order this invoice or receipt belongs to.");
      return;
    }
    if (!editingDocument.vendorName.trim() || !editingDocument.amount.trim()) {
      setSavedMsg("Payee and amount are required for invoices/receipts.");
      return;
    }

    const linkedOrder = orders.find(
      (o) => o.id === editingDocument.workOrderId
    );
    if (!linkedOrder) {
      setSavedMsg("Selected work order was not found in the ledger.");
      return;
    }

    const amount = parsePositiveAmount(editingDocument.amount);
    if (amount == null) {
      setSavedMsg("Enter a valid amount greater than zero.");
      return;
    }

    const original = documents.find((d) => d.id === editingDocument.id);
    const previousWorkOrderId = original?.workOrderId ?? "";

    const budgetLineId =
      editingDocument.budgetLineId ||
      resolveBudgetLineForWorkOrder(linkedOrder, "") ||
      "";

    const category = editingDocument.category || linkedOrder.category;
    const invoiceDate =
      editingDocument.invoiceDate ||
      editingDocument.documentDate ||
      todayIso();

    const updated: MaintenanceDocument = submitDocumentForApproval(
      normalizeMaintenanceDocument({
        ...editingDocument,
        id: editingDocument.id,
        submittedAt: original?.submittedAt ?? editingDocument.submittedAt,
        applyToBudget: true,
        budgetLineId,
        category,
        property: editingDocument.property.trim() || linkedOrder.property,
        amount,
        amountPaid: parsePaidAmount(editingDocument.amountPaid) ?? 0,
        documentDate: invoiceDate,
        invoiceDate,
        dueDate:
          editingDocument.dueDate || addDaysIso(invoiceDate, 30),
        invoiceNumber:
          editingDocument.invoiceNumber.trim() ||
          generateMaintenanceInvoiceNumber(editingDocument.id),
        vendorId: editingDocument.vendorId,
        disputed: editingDocument.disputed,
        payableCategory:
          editingDocument.payableCategory ||
          workOrderCategoryToPayableCategory(category),
        approvalStatus: "pending",
        submittedForApprovalAt: "",
        approvedAt: "",
        approvedBy: "",
        rejectionReason: "",
      })
    );

    setEditDocSaving(true);
    try {
      await saveDocument(updated);
      const nextDocs = documents.map((d) =>
        d.id === updated.id ? updated : d
      );

      const orderUpdates: WorkOrder[] = [];

      const newActual = actualCostFromDocuments(linkedOrder.id, nextDocs);
      const updatedNewOrder: WorkOrder = {
        ...linkedOrder,
        priority: normalizePriority(linkedOrder.priority),
        actualCost: newActual,
        estimatedCost: "",
        budgetAppliedAmount: "",
        budgetAppliedLineId: "",
        status: isDocumentApproved(updated) ? "completed" : linkedOrder.status,
        completedAt: isDocumentApproved(updated)
          ? linkedOrder.completedAt || new Date().toISOString().slice(0, 10)
          : linkedOrder.completedAt,
      };
      orderUpdates.push(updatedNewOrder);
      await saveOrder(updatedNewOrder);

      if (
        previousWorkOrderId &&
        previousWorkOrderId !== linkedOrder.id
      ) {
        const previousOrder = orders.find((o) => o.id === previousWorkOrderId);
        if (previousOrder) {
          const previousActual = actualCostFromDocuments(
            previousWorkOrderId,
            nextDocs
          );
          const updatedPreviousOrder: WorkOrder = {
            ...previousOrder,
            priority: normalizePriority(previousOrder.priority),
            actualCost: previousActual,
            estimatedCost: "",
            budgetAppliedAmount: "",
            budgetAppliedLineId: "",
          };
          orderUpdates.push(updatedPreviousOrder);
          await saveOrder(updatedPreviousOrder);
        }
      }

      const nextOrders = orders.map(
        (o) => orderUpdates.find((u) => u.id === o.id) ?? o
      );
      await syncBudgetSpendFromLedger(nextOrders, nextDocs);

      setHighlightId(updated.id);
      setSavedMsg(
        isDocumentApproved(updated)
          ? `${updated.kind === "invoice" ? "Invoice" : "Receipt"} updated${
              previousWorkOrderId && previousWorkOrderId !== linkedOrder.id
                ? "; work order costs recomputed"
                : ""
            }, and budget synced.`
          : updated.kind === "invoice"
            ? "Invoice resubmitted to Management for approval. Will forward to Accounts Payable once approved."
            : "Receipt resubmitted to Management for approval. Budget and work order will update once approved."
      );
      cancelEditDocument();
      setTimeout(() => setSavedMsg(null), 4000);
      setTimeout(() => setHighlightId(null), 6000);
    } catch (err) {
      setSavedMsg(
        err instanceof Error ? err.message : "Could not update document."
      );
    } finally {
      setEditDocSaving(false);
    }
  }

  function patchBudgetLine(id: string, patch: Partial<BudgetLine>) {
    setBudget((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  }

  const panels: { id: Panel; label: string; icon: typeof Wrench }[] = [
    { id: "new", label: "New work order", icon: PlusCircle },
    { id: "ledger", label: "Work order ledger", icon: ClipboardList },
    { id: "vendors", label: "3rd party dashboard", icon: Users },
    { id: "budget", label: "Budget dashboard", icon: Wallet },
    { id: "documents", label: "Invoices & receipts", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Maintenance</p>
          </div>
          <form action={teamLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <Link
          href="/ops"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to operations
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Maintenance
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Enter work orders, track the ledger, manage third-party vendors,
            compare spend to budget, and submit invoices or receipts. All entries
            sync to the shared team database.
          </p>
        </div>

        {ordersError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {ordersError}
          </div>
        )}

        {ordersLoading && (
          <div className="rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-4 py-3 text-sm opacity-70">
            Loading shared maintenance data…
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {panels.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel(id)}
              className={`rounded-2xl border px-4 py-5 text-left shadow-sm transition hover:-translate-y-0.5 ${
                panel === id
                  ? "border-[var(--harbor-ink)] bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                  : "border-[var(--harbor-deep)]/15 bg-white/85 text-[var(--harbor-ink)]"
              }`}
            >
              <Icon className="h-5 w-5 opacity-80" />
              <p className="mt-3 font-semibold leading-snug">{label}</p>
            </button>
          ))}
        </div>

        {savedMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {savedMsg}
          </div>
        )}

        {panel === "new" && (
          <section className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-mist)]/35 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
                  New work order
                </p>
                <h2 className="mt-1 font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
                  Request a work order
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-[var(--harbor-ink)]/65">
                  Submit something to clean, fix, inspect, or otherwise work on.
                  Requests are saved to the shared team ledger as pending.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPanel("ledger")}
              >
                View ledger
              </button>
            </div>

            <form
              onSubmit={handleCreateWorkOrder}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-6 shadow-sm space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--harbor-deep)]/10 pb-2">
                  <Wrench className="h-5 w-5 text-[var(--harbor-mid)]" />
                  <h3 className="text-lg font-semibold text-[var(--harbor-ink)]">
                    Request details
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">Title</span>
                    <input
                      className="input input-bordered w-full"
                      value={form.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      placeholder="Clean lobby carpets / Fix suite 210 leak"
                      required
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Category</span>
                    <select
                      className="select select-bordered w-full"
                      value={form.category}
                      onChange={(e) =>
                        updateForm(
                          "category",
                          e.target.value as WorkOrderCategory
                        )
                      }
                    >
                      {WORK_ORDER_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Priority</span>
                    <select
                      className="select select-bordered w-full"
                      value={form.priority}
                      onChange={(e) =>
                        updateForm(
                          "priority",
                          e.target.value as WorkOrderPriority
                        )
                      }
                    >
                      {WORK_ORDER_PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Property</span>
                    <select
                      className="select select-bordered w-full"
                      value={propertySelectValue}
                      onChange={(e) => onPropertyChoiceChange(e.target.value)}
                    >
                      {managedPropertyNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value={PROPERTY_OTHER}>Other (type below)</option>
                    </select>
                  </label>

                  {showPropertyNameInput && (
                    <label className="form-control w-full">
                      <span className="mb-1 text-sm opacity-70">
                        Property name
                      </span>
                      <input
                        className="input input-bordered w-full"
                        value={form.property}
                        onChange={(e) => {
                          setPropertyChoice(PROPERTY_OTHER);
                          updateForm("property", e.target.value);
                        }}
                        placeholder="Riverbend Commerce Center"
                        required
                      />
                    </label>
                  )}

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Unit / area</span>
                    <input
                      className="input input-bordered w-full"
                      value={form.unit}
                      onChange={(e) => updateForm("unit", e.target.value)}
                      placeholder="Suite 210, Lobby, Restroom"
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Submitted by</span>
                    <select
                      className="select select-bordered w-full"
                      value={form.source}
                      onChange={(e) =>
                        updateForm("source", e.target.value as WorkOrderSource)
                      }
                    >
                      <option value="management_submitted">
                        Management submitted
                      </option>
                      <option value="tenant_submitted">Tenant submitted</option>
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Requested by</span>
                    <input
                      className="input input-bordered w-full"
                      value={form.requestedBy}
                      onChange={(e) =>
                        updateForm("requestedBy", e.target.value)
                      }
                      placeholder="Jordan Hale / Tenant · Suite 210"
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Due date</span>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={form.dueDate}
                      onChange={(e) => updateForm("dueDate", e.target.value)}
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <label className="form-control w-full">
                      <span className="mb-1 text-sm opacity-70">
                        Description — what needs to be done?
                      </span>
                      <textarea
                        className="textarea textarea-bordered w-full min-h-28"
                        value={form.description}
                        onChange={(e) =>
                          updateForm("description", e.target.value)
                        }
                        placeholder="Describe the cleaning, repair, or inspection needed…"
                        required
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-dashed border-[var(--harbor-deep)]/20 bg-[var(--harbor-sand)]/40 p-4">
                <div>
                  <h3 className="text-base font-semibold text-[var(--harbor-ink)]">
                    Dispatch (optional)
                  </h3>
                  <p className="text-sm text-[var(--harbor-ink)]/60">
                    Assign labor and vendor now if known. Dollar amounts are
                    added later by linking invoices or receipts to this work
                    order.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Labor type</span>
                    <select
                      className="select select-bordered w-full bg-white"
                      value={form.labor}
                      onChange={(e) =>
                        updateForm("labor", e.target.value as WorkOrderLabor)
                      }
                    >
                      <option value="in_house">In-house</option>
                      <option value="third_party">3rd party required</option>
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">
                      Vendor (if 3rd party)
                    </span>
                    <input
                      className="input input-bordered w-full bg-white"
                      value={form.vendorName}
                      onChange={(e) =>
                        updateForm("vendorName", e.target.value)
                      }
                      list="vendor-names"
                      placeholder="Oxford HVAC Pros"
                    />
                    <datalist id="vendor-names">
                      {vendors.map((v) => (
                        <option key={v.id} value={v.name} />
                      ))}
                    </datalist>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="btn btn-neutral"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Submit to ledger"}
                </button>
                <p className="text-sm text-[var(--harbor-ink)]/55">
                  Creates a pending work order with no cost. Actual cost comes
                  from invoices or receipts linked to this job.
                </p>
              </div>
            </form>
          </section>
        )}

        {panel === "ledger" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm">
              <p className="mb-3 text-sm font-medium">Filter work orders</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      status: e.target.value as Filters["status"],
                    }))
                  }
                >
                  <option value="all">All statuses</option>
                  {WORK_ORDER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.source}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      source: e.target.value as Filters["source"],
                    }))
                  }
                >
                  <option value="all">All sources</option>
                  <option value="tenant_submitted">Tenant submitted</option>
                  <option value="management_submitted">
                    Management submitted
                  </option>
                </select>

                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.labor}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      labor: e.target.value as Filters["labor"],
                    }))
                  }
                >
                  <option value="all">In-house + 3rd party</option>
                  <option value="in_house">In-house</option>
                  <option value="third_party">3rd party required</option>
                </select>

                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.category}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      category: e.target.value as Filters["category"],
                    }))
                  }
                >
                  <option value="all">All categories</option>
                  {WORK_ORDER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.property}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, property: e.target.value }))
                  }
                >
                  <option value="">All properties</option>
                  {properties.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  className="input input-bordered input-sm w-full"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                  }
                  aria-label="From date"
                />
                <input
                  type="date"
                  className="input input-bordered input-sm w-full"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, dateTo: e.target.value }))
                  }
                  aria-label="To date"
                />

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFilters(defaultFilters)}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm">
              <table className="table">
                <thead>
                  <tr>
                    <th>Work order</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Labor</th>
                    <th>Property</th>
                    <th>Actual cost</th>
                    <th>Date</th>
                    <th>Update</th>
                    <th>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center opacity-60 py-8">
                        No work orders match these filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const priority = normalizePriority(o.priority);
                      return (
                        <tr
                          key={o.id}
                          className={
                            highlightId === o.id
                              ? "bg-emerald-50 transition-colors"
                              : undefined
                          }
                        >
                          <td>
                            <p className="font-medium">{o.title}</p>
                            <p className="text-xs opacity-60">
                              {categoryLabel(o.category)}
                              {o.unit ? ` · ${o.unit}` : ""}
                            </p>
                          </td>
                          <td>
                            <span
                              className={`badge badge-sm ${priorityBadgeClass(priority)}`}
                            >
                              {priorityLabel(priority)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                o.status === "completed"
                                  ? "badge-success"
                                  : o.status === "in_progress"
                                    ? "badge-info"
                                    : "badge-warning"
                              }`}
                            >
                              {statusLabel(o.status)}
                            </span>
                          </td>
                          <td className="text-sm">{sourceLabel(o.source)}</td>
                          <td className="text-sm">{laborLabel(o.labor)}</td>
                          <td className="text-sm">{o.property}</td>
                          <td className="text-sm tabular-nums">
                            {o.actualCost ? (
                              <>
                                <p className="font-medium">
                                  {money(Number(o.actualCost))}
                                </p>
                                {linkedDocsSummary(o.id) ? (
                                  <p className="text-xs opacity-55">
                                    {linkedDocsSummary(o.id)}
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <span className="opacity-45">No invoice yet</span>
                            )}
                          </td>
                          <td className="text-sm">{o.createdAt}</td>
                          <td>
                            <select
                              className="select select-bordered select-xs"
                              value={o.status}
                              onChange={(e) =>
                                updateOrderStatus(
                                  o.id,
                                  e.target.value as WorkOrderStatus
                                )
                              }
                            >
                              {WORK_ORDER_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs gap-1"
                              onClick={() => startEditOrder(o)}
                              aria-label={`Edit ${o.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {editingOrder && (
              <form
                onSubmit={handleSaveEditedWorkOrder}
                className="rounded-2xl border border-[var(--harbor-deep)]/15 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Edit work order</h2>
                    <p className="text-sm opacity-65">
                      Update job details here. Actual cost is set by invoices or
                      receipts linked to this work order.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={cancelEditOrder}
                    aria-label="Close edit form"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">Title</span>
                    <input
                      className="input input-bordered w-full"
                      value={editingOrder.title}
                      onChange={(e) =>
                        updateEditingOrder("title", e.target.value)
                      }
                      required
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Category</span>
                    <select
                      className="select select-bordered w-full"
                      value={editingOrder.category}
                      onChange={(e) =>
                        updateEditingOrder(
                          "category",
                          e.target.value as WorkOrderCategory
                        )
                      }
                    >
                      {WORK_ORDER_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Priority</span>
                    <select
                      className="select select-bordered w-full"
                      value={editingOrder.priority}
                      onChange={(e) =>
                        updateEditingOrder(
                          "priority",
                          e.target.value as WorkOrderPriority
                        )
                      }
                    >
                      {WORK_ORDER_PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Property</span>
                    <input
                      className="input input-bordered w-full"
                      value={editingOrder.property}
                      onChange={(e) =>
                        updateEditingOrder("property", e.target.value)
                      }
                      required
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Unit / area</span>
                    <input
                      className="input input-bordered w-full"
                      value={editingOrder.unit}
                      onChange={(e) =>
                        updateEditingOrder("unit", e.target.value)
                      }
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Status</span>
                    <select
                      className="select select-bordered w-full"
                      value={editingOrder.status}
                      onChange={(e) =>
                        updateEditingOrder(
                          "status",
                          e.target.value as WorkOrderStatus
                        )
                      }
                    >
                      {WORK_ORDER_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Labor</span>
                    <select
                      className="select select-bordered w-full"
                      value={editingOrder.labor}
                      onChange={(e) =>
                        updateEditingOrder(
                          "labor",
                          e.target.value as WorkOrderLabor
                        )
                      }
                    >
                      <option value="in_house">In-house</option>
                      <option value="third_party">3rd party required</option>
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Vendor</span>
                    <input
                      className="input input-bordered w-full"
                      value={editingOrder.vendorName}
                      onChange={(e) =>
                        updateEditingOrder("vendorName", e.target.value)
                      }
                      list="vendor-names-edit"
                      placeholder="Optional"
                    />
                    <datalist id="vendor-names-edit">
                      {vendors.map((v) => (
                        <option key={v.id} value={v.name} />
                      ))}
                    </datalist>
                  </label>

                  <div className="form-control w-full sm:col-span-2 rounded-xl border border-base-300 px-3 py-3">
                    <span className="mb-1 text-sm opacity-70">Actual cost</span>
                    <p className="font-medium tabular-nums">
                      {actualCostFromDocuments(editingOrder.id, documents)
                        ? money(
                            Number(
                              actualCostFromDocuments(editingOrder.id, documents)
                            )
                          )
                        : "No invoice yet"}
                    </p>
                    <p className="mt-1 text-xs opacity-55">
                      Updated automatically when invoices or receipts are linked
                      to this work order.
                    </p>
                  </div>

                  <label className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">Description</span>
                    <textarea
                      className="textarea textarea-bordered w-full min-h-24"
                      value={editingOrder.description}
                      onChange={(e) =>
                        updateEditingOrder("description", e.target.value)
                      }
                      required
                    />
                  </label>

                  <div className="sm:col-span-2 space-y-2">
                    <p className="text-sm font-medium">
                      Linked invoices & receipts
                    </p>
                    {linkedDocsForWorkOrder(editingOrder.id).length === 0 ? (
                      <p className="text-sm opacity-55">
                        None yet. Submit an invoice or receipt and select this
                        work order.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {linkedDocsForWorkOrder(editingOrder.id).map((doc) => (
                          <li
                            key={doc.id}
                            className="rounded-lg border border-base-300 px-3 py-2 text-sm"
                          >
                            <p className="font-medium capitalize">
                              {doc.kind} · {doc.vendorName} ·{" "}
                              {money(doc.amount)}
                            </p>
                            <p className="text-xs opacity-55">
                              {doc.invoiceDate || doc.documentDate}
                              {doc.fileName ? ` · ${doc.fileName}` : ""}
                              {" · "}
                              {approvalStatusLabel(
                                normalizeDocumentApproval(doc).approvalStatus!
                              )}
                              {" · "}
                              {maintenanceDocPayableStatusLabel(doc)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="btn btn-neutral"
                    disabled={editSaving}
                  >
                    {editSaving ? "Saving…" : "Save work order"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={cancelEditOrder}
                    disabled={editSaving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {panel === "vendors" && (
          <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <form
              onSubmit={addVendor}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm space-y-3 h-fit"
            >
              <h2 className="text-lg font-semibold">Add 3rd party vendor</h2>
              <input
                name="name"
                className="input input-bordered w-full"
                placeholder="Vendor name"
                required
              />
              <input
                name="specialty"
                className="input input-bordered w-full"
                placeholder="Specialty (HVAC, plumbing…)"
              />
              <input
                name="phone"
                className="input input-bordered w-full"
                placeholder="Phone"
              />
              <input
                name="email"
                className="input input-bordered w-full"
                placeholder="Email"
              />
              <textarea
                name="notes"
                className="textarea textarea-bordered w-full"
                placeholder="Notes"
              />
              <button type="submit" className="btn btn-neutral btn-sm">
                Save vendor
              </button>
            </form>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Vendor directory</h2>
                <ul className="mt-3 space-y-3">
                  {vendors.map((v) => (
                    <li
                      key={v.id}
                      className="rounded-xl border border-base-300 px-3 py-3"
                    >
                      <p className="font-medium">{v.name}</p>
                      <p className="text-sm opacity-65">
                        {v.specialty || "General"} · {v.phone || "No phone"} ·{" "}
                        {v.email || "No email"}
                      </p>
                      {v.notes ? (
                        <p className="mt-1 text-xs opacity-55">{v.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Open 3rd party work</h2>
                {thirdPartyOpen.length === 0 ? (
                  <p className="mt-2 text-sm opacity-60">
                    No open third-party work orders.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {thirdPartyOpen.map((o) => (
                      <li
                        key={o.id}
                        className="rounded-xl border border-base-300 px-3 py-2 text-sm"
                      >
                        <p className="font-medium">{o.title}</p>
                        <p className="opacity-65">
                          {o.vendorName || "Unassigned vendor"} · {o.property} ·{" "}
                          {statusLabel(o.status)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {panel === "budget" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                  Maintenance budget
                </h2>
                <p className="mt-1 text-sm opacity-65">
                  Track allocated budget versus recorded spend. Edit line items
                  directly; record expenses anytime.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  const used = new Set(
                    budget
                      .filter((b) => b.category !== "all")
                      .map((b) => b.category)
                  );
                  const category =
                    WORK_ORDER_CATEGORIES.find((c) => !used.has(c.value))
                      ?.value ?? "general";
                  const next: BudgetLine = {
                    id: crypto.randomUUID(),
                    category,
                    label: categoryLabel(category),
                    budgetAmount: 10000,
                    spentAmount: 0,
                    notes: "",
                  };
                  void saveBudgetLine(next);
                  setBudgetView("budget");
                }}
              >
                Add budget line
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Total budget",
                  value: money(budgetTotals.totalBudget),
                },
                {
                  label: "Spent YTD",
                  value: money(budgetTotals.totalSpent),
                },
                {
                  label: "Remaining",
                  value: money(budgetTotals.remaining),
                  warn: budgetTotals.remaining < 0,
                },
                {
                  label: "% used",
                  value: `${budgetTotals.pct}%`,
                  warn: budgetTotals.pct > 100,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-wide opacity-55">
                    {card.label}
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold tabular-nums ${
                      card.warn ? "text-error" : "text-[var(--harbor-ink)]"
                    }`}
                  >
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm">
              <div
                className="flex flex-wrap gap-1 border-b border-[var(--harbor-deep)]/10 px-3 pt-3"
                role="tablist"
                aria-label="Budget views"
              >
                {(
                  [
                    { id: "budget", label: "Budget" },
                    { id: "expenses", label: "Expenses" },
                    { id: "ytd", label: "YTD Summary" },
                  ] as const
                ).map((tab) => {
                  const active = budgetView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-[var(--harbor-mist)] text-[var(--harbor-ink)]"
                          : "text-[var(--harbor-ink)]/55 hover:bg-base-200/70 hover:text-[var(--harbor-ink)]"
                      }`}
                      onClick={() => setBudgetView(tab.id)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-4" role="tabpanel">
                {budgetView === "budget" && (
                  <div className="overflow-x-auto">
                    {budgetLinesOnly.length === 0 ? (
                      <p className="text-sm opacity-60">
                        No budget lines yet. Add a line to start tracking
                        allocation versus spend.
                      </p>
                    ) : (
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Line item</th>
                            <th>Category</th>
                            <th className="text-right">Budget</th>
                            <th className="text-right">Spent</th>
                            <th className="text-right">Remaining</th>
                            <th className="text-right">% Used</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetSheetRows.map((line) => {
                            const remaining =
                              line.budgetAmount - line.spentAmount;
                            const pct = line.budgetAmount
                              ? Math.round(
                                  (line.spentAmount / line.budgetAmount) * 100
                                )
                              : 0;
                            const over = remaining < 0;
                            const isTotal = line.category === "all";
                            return (
                              <tr
                                key={line.id}
                                className={isTotal ? "font-semibold" : undefined}
                              >
                                <td>
                                  {isTotal ? (
                                    line.label
                                  ) : (
                                    <input
                                      className="input input-bordered input-sm w-full min-w-[10rem]"
                                      value={line.label}
                                      onChange={(e) =>
                                        patchBudgetLine(line.id, {
                                          label: e.target.value,
                                        })
                                      }
                                      onBlur={(e) =>
                                        void saveBudgetLine({
                                          ...line,
                                          label: e.target.value,
                                        })
                                      }
                                    />
                                  )}
                                </td>
                                <td className="whitespace-nowrap">
                                  {isTotal ? (
                                    "Total"
                                  ) : (
                                    <select
                                      className="select select-bordered select-sm w-full min-w-[9rem]"
                                      value={line.category}
                                      onChange={(e) => {
                                        const category = e.target
                                          .value as WorkOrderCategory;
                                        patchBudgetLine(line.id, { category });
                                        void saveBudgetLine({
                                          ...line,
                                          category,
                                        });
                                      }}
                                      aria-label={`Category for ${line.label}`}
                                    >
                                      {WORK_ORDER_CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>
                                          {c.label}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                                <td className="text-right tabular-nums">
                                  {isTotal ? (
                                    money(line.budgetAmount)
                                  ) : (
                                    <input
                                      className="input input-bordered input-sm w-28 text-right"
                                      value={line.budgetAmount}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        if (Number.isNaN(value)) return;
                                        patchBudgetLine(line.id, {
                                          budgetAmount: value,
                                        });
                                      }}
                                      onBlur={(e) => {
                                        const value = Number(e.target.value);
                                        if (Number.isNaN(value)) return;
                                        void saveBudgetLine({
                                          ...line,
                                          budgetAmount: value,
                                        });
                                      }}
                                    />
                                  )}
                                </td>
                                <td className="text-right tabular-nums">
                                  {isTotal ? (
                                    money(line.spentAmount)
                                  ) : (
                                    <input
                                      className="input input-bordered input-sm w-28 text-right"
                                      value={line.spentAmount}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        if (Number.isNaN(value)) return;
                                        patchBudgetLine(line.id, {
                                          spentAmount: value,
                                        });
                                      }}
                                      onBlur={(e) => {
                                        const value = Number(e.target.value);
                                        if (Number.isNaN(value)) return;
                                        void saveBudgetLine({
                                          ...line,
                                          spentAmount: value,
                                        });
                                      }}
                                    />
                                  )}
                                </td>
                                <td
                                  className={`text-right tabular-nums ${
                                    over ? "text-error" : ""
                                  }`}
                                >
                                  {money(remaining)}
                                </td>
                                <td
                                  className={`text-right tabular-nums ${
                                    over ? "text-error" : ""
                                  }`}
                                >
                                  {pct}%
                                </td>
                                <td>
                                  <input
                                    className="input input-bordered input-sm w-full min-w-[8rem]"
                                    value={line.notes}
                                    onChange={(e) =>
                                      patchBudgetLine(line.id, {
                                        notes: e.target.value,
                                      })
                                    }
                                    onBlur={(e) =>
                                      void saveBudgetLine({
                                        ...line,
                                        notes: e.target.value,
                                      })
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {budgetView === "expenses" && (
                  <div className="space-y-4">
                    <p className="text-sm opacity-65">
                      Spend by budget line. Use the form below to post a new
                      expense.
                    </p>
                    {budgetLinesOnly.length === 0 ? (
                      <p className="text-sm opacity-60">
                        No budget lines yet. Add a line first, then record
                        expenses against it.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {[...budgetLinesOnly]
                          .sort((a, b) => b.spentAmount - a.spentAmount)
                          .map((line) => {
                            const remaining =
                              line.budgetAmount - line.spentAmount;
                            const pct = line.budgetAmount
                              ? Math.min(
                                  100,
                                  Math.round(
                                    (line.spentAmount / line.budgetAmount) *
                                      100
                                  )
                                )
                              : 0;
                            const over = remaining < 0;
                            return (
                              <li
                                key={line.id}
                                className="rounded-xl border border-base-300 px-3 py-3"
                              >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <p className="font-medium">{line.label}</p>
                                    <select
                                      className="select select-bordered select-xs w-full max-w-[14rem]"
                                      value={line.category}
                                      onChange={(e) => {
                                        const category = e.target
                                          .value as WorkOrderCategory;
                                        patchBudgetLine(line.id, { category });
                                        void saveBudgetLine({
                                          ...line,
                                          category,
                                        });
                                      }}
                                      aria-label={`Category for ${line.label}`}
                                    >
                                      {WORK_ORDER_CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>
                                          {c.label}
                                        </option>
                                      ))}
                                    </select>
                                    {line.notes ? (
                                      <p className="text-xs opacity-55">
                                        {line.notes}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="text-right text-sm tabular-nums">
                                    <p className="font-semibold">
                                      {money(line.spentAmount)} spent
                                    </p>
                                    <p
                                      className={
                                        over ? "text-error" : "opacity-65"
                                      }
                                    >
                                      {money(remaining)} of{" "}
                                      {money(line.budgetAmount)} left
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--harbor-mist)]">
                                  <div
                                    className={`h-full rounded-full ${
                                      over
                                        ? "bg-error"
                                        : "bg-[var(--harbor-mid)]"
                                    }`}
                                    style={{
                                      width: `${over ? 100 : pct}%`,
                                    }}
                                  />
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </div>
                )}

                {budgetView === "ytd" && (
                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="opacity-65">Overall usage</span>
                        <span
                          className={`font-medium tabular-nums ${
                            budgetTotals.pct > 100 ? "text-error" : ""
                          }`}
                        >
                          {budgetTotals.pct}% of{" "}
                          {money(budgetTotals.totalBudget)}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-[var(--harbor-mist)]">
                        <div
                          className={`h-full rounded-full ${
                            budgetTotals.pct > 100
                              ? "bg-error"
                              : "bg-[var(--harbor-deep)]"
                          }`}
                          style={{
                            width: `${Math.min(100, budgetTotals.pct)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {budgetLinesOnly.length === 0 ? (
                      <p className="text-sm opacity-60">
                        Add budget lines to see a year-to-date comparison chart.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm opacity-65">
                          Budget vs spent by line (bars share the same scale).
                        </p>
                        {budgetLinesOnly.map((line) => {
                          const maxScale = Math.max(
                            ...budgetLinesOnly.map((l) =>
                              Math.max(l.budgetAmount, l.spentAmount)
                            ),
                            1
                          );
                          const budgetWidth = Math.round(
                            (line.budgetAmount / maxScale) * 100
                          );
                          const spentWidth = Math.round(
                            (line.spentAmount / maxScale) * 100
                          );
                          const over = line.spentAmount > line.budgetAmount;
                          return (
                            <div key={line.id} className="space-y-1.5">
                              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                                <span className="font-medium">
                                  {line.label}
                                </span>
                                <span className="tabular-nums opacity-65">
                                  {money(line.spentAmount)} /{" "}
                                  {money(line.budgetAmount)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide opacity-45">
                                    Budget
                                  </span>
                                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-base-200">
                                    <div
                                      className="h-full rounded-full bg-[var(--harbor-mist)]"
                                      style={{ width: `${budgetWidth}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide opacity-45">
                                    Spent
                                  </span>
                                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-base-200">
                                    <div
                                      className={`h-full rounded-full ${
                                        over
                                          ? "bg-error"
                                          : "bg-[var(--harbor-mid)]"
                                      }`}
                                      style={{ width: `${spentWidth}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <form
              onSubmit={recordExpense}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm space-y-3"
            >
              <h3 className="text-base font-semibold">Record expense</h3>
              <p className="text-sm opacity-65">
                Adds spend to a budget line and updates totals across all views.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="select select-bordered w-full"
                  value={expenseForm.lineId}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, lineId: e.target.value }))
                  }
                  required
                >
                  <option value="">Select budget line</option>
                  {budgetLinesOnly.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
                <input
                  className="input input-bordered w-full"
                  placeholder="Amount ($)"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  required
                />
                <input
                  className="input input-bordered w-full sm:col-span-2"
                  placeholder="Note (optional)"
                  value={expenseForm.note}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, note: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="btn btn-neutral btn-sm sm:col-span-2"
                >
                  Record expense
                </button>
                <p className="text-xs opacity-55 sm:col-span-2">
                  Submitted to Management for approval before budget spend
                  applies.
                </p>
              </div>
            </form>
          </section>
        )}

        {panel === "documents" && (
          <section className="space-y-6">
            {editingDocument && (
              <form
                onSubmit={handleSaveEditedDocument}
                className="rounded-2xl border border-[var(--harbor-deep)]/15 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Edit {editingDocument.kind}
                    </h2>
                    <p className="text-sm opacity-65">
                      Update this invoice or receipt. Changing the work order
                      recomputes actual cost on both the previous and new jobs.
                      Saves are submitted to Management for approval.
                    </p>
                    <p className="mt-1 text-xs opacity-55">
                      Status:{" "}
                      {approvalStatusLabel(
                        normalizeDocumentApproval(editingDocument)
                          .approvalStatus!
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={cancelEditDocument}
                    aria-label="Close edit form"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">
                      Work order (required)
                    </span>
                    <select
                      className="select select-bordered w-full"
                      value={editingDocument.workOrderId}
                      onChange={(e) =>
                        onEditingDocumentWorkOrderChange(e.target.value)
                      }
                      required
                    >
                      <option value="">Select work order</option>
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title} · {o.property}
                          {o.unit ? ` · ${o.unit}` : ""} ·{" "}
                          {statusLabel(o.status)} · {o.createdAt}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">
                      Document type
                    </span>
                    <select
                      className="select select-bordered w-full"
                      value={editingDocument.kind}
                      onChange={(e) =>
                        updateEditingDocument(
                          "kind",
                          e.target.value as DocumentKind
                        )
                      }
                    >
                      <option value="invoice">Invoice</option>
                      <option value="receipt">Receipt</option>
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">
                      Document date
                    </span>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={
                        editingDocument.invoiceDate ||
                        editingDocument.documentDate
                      }
                      onChange={(e) => {
                        updateEditingDocument("invoiceDate", e.target.value);
                        updateEditingDocument("documentDate", e.target.value);
                      }}
                      required
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Due date</span>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={editingDocument.dueDate}
                      onChange={(e) =>
                        updateEditingDocument("dueDate", e.target.value)
                      }
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Invoice #</span>
                    <input
                      className="input input-bordered w-full"
                      value={editingDocument.invoiceNumber}
                      onChange={(e) =>
                        updateEditingDocument("invoiceNumber", e.target.value)
                      }
                      placeholder="Auto if blank"
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">
                      Store / vendor / payee
                    </span>
                    <input
                      className="input input-bordered w-full"
                      value={editingDocument.vendorName}
                      onChange={(e) =>
                        updateEditingDocument("vendorName", e.target.value)
                      }
                      list="vendor-names-docs-edit"
                      placeholder="Home Depot"
                      required
                    />
                    <datalist id="vendor-names-docs-edit">
                      {vendors.map((v) => (
                        <option key={v.id} value={v.name} />
                      ))}
                    </datalist>
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Amount ($)</span>
                    <input
                      className="input input-bordered w-full"
                      value={editingDocument.amount}
                      onChange={(e) =>
                        updateEditingDocument("amount", e.target.value)
                      }
                      placeholder="850.00"
                      required
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Property</span>
                    <input
                      className="input input-bordered w-full"
                      value={editingDocument.property}
                      onChange={(e) =>
                        updateEditingDocument("property", e.target.value)
                      }
                      placeholder="Riverbend Commerce Center"
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">Category</span>
                    <select
                      className="select select-bordered w-full"
                      value={editingDocument.category}
                      onChange={(e) =>
                        updateEditingDocument(
                          "category",
                          e.target.value as WorkOrderCategory | ""
                        )
                      }
                    >
                      <option value="">No category</option>
                      {WORK_ORDER_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">
                      Attach invoice / receipt file (optional)
                    </span>
                    <input
                      type="file"
                      className="file-input file-input-bordered w-full"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          updateEditingDocument("fileName", file.name);
                        }
                      }}
                    />
                    {editingDocument.fileName ? (
                      <span className="mt-1 text-xs opacity-60">
                        Current: {editingDocument.fileName}
                      </span>
                    ) : (
                      <span className="mt-1 text-xs opacity-55">
                        You can save without a file if you only need the amount
                        on the work order.
                      </span>
                    )}
                  </label>

                  <label className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">Notes</span>
                    <textarea
                      className="textarea textarea-bordered w-full min-h-20"
                      value={editingDocument.notes}
                      onChange={(e) =>
                        updateEditingDocument("notes", e.target.value)
                      }
                      placeholder="What was purchased or billed?"
                    />
                  </label>

                  <label className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">Budget line</span>
                    <select
                      className="select select-bordered w-full"
                      value={editingDocument.budgetLineId}
                      onChange={(e) =>
                        updateEditingDocument("budgetLineId", e.target.value)
                      }
                      required
                    >
                      <option value="">Select budget line</option>
                      {budget
                        .filter((b) => b.category !== "all")
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="btn btn-neutral"
                    disabled={editDocSaving}
                  >
                    {editDocSaving
                      ? "Saving…"
                      : `Save ${editingDocument.kind}`}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={cancelEditDocument}
                    disabled={editDocSaving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <form
              onSubmit={handleSubmitDocument}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm space-y-4 h-fit"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--harbor-mid)]" />
                <h2 className="text-lg font-semibold">
                  Submit invoice or receipt
                </h2>
              </div>
              <p className="text-sm opacity-65">
                Link each invoice or receipt to an existing work order. That
                sets the work order’s actual cost and updates budget spend. For
                in-house jobs, record the store or payee where supplies were
                bought (for example Home Depot).
              </p>
              <p className="text-xs opacity-55">
                Invoices go to Management first, then Accounts Payable.
                Receipts go to Management first, then apply to budget (not AP).
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="form-control w-full sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">
                    Work order (required)
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.workOrderId}
                    onChange={(e) => onDocumentWorkOrderChange(e.target.value)}
                    required
                  >
                    <option value="">Select work order</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} · {o.property}
                        {o.unit ? ` · ${o.unit}` : ""} · {statusLabel(o.status)}{" "}
                        · {o.createdAt}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 text-xs opacity-55">
                    Chooses which ledger job this document updates.
                  </span>
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Document type</span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.kind}
                    onChange={(e) =>
                      updateDocForm("kind", e.target.value as DocumentKind)
                    }
                  >
                    <option value="invoice">Invoice</option>
                    <option value="receipt">Receipt</option>
                  </select>
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Document date</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={docForm.invoiceDate || docForm.documentDate}
                    onChange={(e) => {
                      updateDocForm("invoiceDate", e.target.value);
                      updateDocForm("documentDate", e.target.value);
                    }}
                    required
                  />
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Due date</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={docForm.dueDate}
                    onChange={(e) => updateDocForm("dueDate", e.target.value)}
                  />
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Invoice #</span>
                  <input
                    className="input input-bordered w-full"
                    value={docForm.invoiceNumber}
                    onChange={(e) =>
                      updateDocForm("invoiceNumber", e.target.value)
                    }
                    placeholder="Auto if blank"
                  />
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">
                    Store / vendor / payee
                  </span>
                  <input
                    className="input input-bordered w-full"
                    value={docForm.vendorName}
                    onChange={(e) => updateDocForm("vendorName", e.target.value)}
                    list="vendor-names-docs"
                    placeholder="Home Depot"
                    required
                  />
                  <datalist id="vendor-names-docs">
                    {vendors.map((v) => (
                      <option key={v.id} value={v.name} />
                    ))}
                  </datalist>
                  <span className="mt-1 text-xs opacity-55">
                    Enter any store or payee. Known vendors appear as optional
                    suggestions.
                  </span>
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Amount ($)</span>
                  <input
                    className="input input-bordered w-full"
                    value={docForm.amount}
                    onChange={(e) => updateDocForm("amount", e.target.value)}
                    placeholder="850.00"
                    required
                  />
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Property</span>
                  <input
                    className="input input-bordered w-full"
                    value={docForm.property}
                    onChange={(e) => updateDocForm("property", e.target.value)}
                    placeholder="Riverbend Commerce Center"
                  />
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Category</span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.category}
                    onChange={(e) =>
                      updateDocForm(
                        "category",
                        e.target.value as WorkOrderCategory | ""
                      )
                    }
                  >
                    <option value="">No category</option>
                    {WORK_ORDER_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control w-full sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">
                    Attach invoice / receipt file (optional)
                  </span>
                  <input
                    type="file"
                    className="file-input file-input-bordered w-full"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      updateDocForm("fileName", file?.name ?? "");
                    }}
                  />
                  {docForm.fileName ? (
                    <span className="mt-1 text-xs opacity-60">
                      Selected: {docForm.fileName}
                    </span>
                  ) : (
                    <span className="mt-1 text-xs opacity-55">
                      You can submit without a file if you only need the amount
                      on the work order.
                    </span>
                  )}
                </label>

                <label className="form-control w-full sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">Notes</span>
                  <textarea
                    className="textarea textarea-bordered w-full min-h-20"
                    value={docForm.notes}
                    onChange={(e) => updateDocForm("notes", e.target.value)}
                    placeholder="What was purchased or billed?"
                  />
                </label>

                <label className="form-control w-full sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">Budget line</span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.budgetLineId}
                    onChange={(e) =>
                      updateDocForm("budgetLineId", e.target.value)
                    }
                    required
                  >
                    <option value="">Select budget line</option>
                    {budget
                      .filter((b) => b.category !== "all")
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                  </select>
                  <span className="mt-1 text-xs opacity-55">
                    Amount is applied to this budget line and to the work
                    order’s actual cost.
                  </span>
                </label>
              </div>

              <button type="submit" className="btn btn-neutral">
                Submit {docForm.kind}
              </button>
            </form>

            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Submitted documents</h2>
              {documents.length === 0 ? (
                <p className="mt-3 text-sm opacity-60">
                  No invoices or receipts submitted yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {documents.map((doc) => {
                    const related = orders.find((o) => o.id === doc.workOrderId);
                    const approval = normalizeDocumentApproval(doc);
                    const approvalBadgeClass =
                      approval.approvalStatus === "approved"
                        ? "badge-success"
                        : approval.approvalStatus === "rejected"
                          ? "badge-error"
                          : "badge-warning";
                    return (
                      <li
                        key={doc.id}
                        className={`rounded-xl border px-3 py-3 ${
                          highlightId === doc.id
                            ? "border-[var(--harbor-mid)] bg-[var(--harbor-mid)]/5"
                            : "border-base-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium capitalize">
                              {doc.kind} · {doc.vendorName}
                            </p>
                            <p className="text-sm opacity-65">
                              {doc.property || "No property"} ·{" "}
                              {doc.invoiceDate || doc.documentDate}
                              {doc.invoiceNumber
                                ? ` · #${doc.invoiceNumber}`
                                : ""}
                              {doc.category
                                ? ` · ${categoryLabel(doc.category)}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`badge badge-sm ${approvalBadgeClass}`}
                            >
                              {approvalStatusLabel(approval.approvalStatus!)}
                            </span>
                            <span className="badge badge-sm badge-outline">
                              {maintenanceDocPayableStatusLabel(doc)}
                            </span>
                            <span className="badge badge-outline">
                              {money(doc.amount)}
                            </span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs gap-1"
                              onClick={() => startEditDocument(doc)}
                              aria-label={`Edit ${doc.kind} from ${doc.vendorName}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-xs opacity-60">
                          File: {doc.fileName || "—"}
                          {related
                            ? ` · WO: ${related.title}`
                            : doc.workOrderId
                              ? " · WO: (missing from ledger)"
                              : " · No work order linked"}
                          {!isDocumentApproved(doc)
                            ? maintenanceDocumentForwardsToAp(doc)
                              ? " · Awaiting approval → Accounts Payable"
                              : maintenanceDocumentAppliesToBudget(doc)
                                ? " · Awaiting approval → budget"
                                : " · Awaiting Management approval"
                            : maintenanceDocumentForwardsToAp(doc)
                              ? " · Approved → Accounts Payable"
                              : maintenanceDocumentAppliesToBudget(doc)
                                ? " · Applied to budget"
                                : ""}
                          {approval.approvalStatus === "rejected" &&
                          approval.rejectionReason
                            ? ` · Declined: ${approval.rejectionReason}`
                            : approval.approvalStatus === "rejected"
                              ? " · Declined by Management"
                              : ""}
                        </p>
                        {doc.notes ? (
                          <p className="mt-1 text-sm opacity-70">{doc.notes}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
