"use client";

import Link from "next/link";
import { OpsBrandHomeLink } from "@/components/OpsBrandHomeLink";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { BudgetFillBar } from "@/components/mgmt/BudgetFillBar";
import { UnitAreaMultiSelect } from "@/components/UnitAreaMultiSelect";
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
import {
  maintenanceBudgetViewLines,
  normalizeMaintCategoryKey,
  propertyNamesMatch,
  seedDepartmentBudgets,
  seedPropertyBudgetPacks,
  type DepartmentBudget,
  type PropertyBudgetPack,
} from "@/lib/management";
import type {
  ManagementContractDraft,
  SharedPropertyTenant,
} from "@/lib/management-contract";

type Panel = "new" | "ledger" | "vendors" | "budget" | "documents";

const NON_SPECIFIC_WORK_ORDER = "__none__";
const MAX_DOC_FILE_BYTES = 1_200_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function emptyExpenseForm() {
  return {
    kind: "invoice" as DocumentKind,
    workOrderId: "",
    lineId: "",
    property: "",
    category: "" as WorkOrderCategory | "",
    vendorName: "",
    amount: "",
    note: "",
    fileName: "",
    fileDataUrl: "",
  };
}

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
  const { items: deptBudgets } = useSharedCollection<DepartmentBudget>(
    COLLECTIONS.departmentBudgets,
    seedDepartmentBudgets
  );
  const { items: budgetPacks } = useSharedCollection<PropertyBudgetPack>(
    COLLECTIONS.propertyBudgetPacks,
    seedPropertyBudgetPacks
  );
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
  const { items: propertyTenants } = useSharedCollection<SharedPropertyTenant>(
    COLLECTIONS.propertyTenants
  );
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [form, setForm] = useState(emptyWorkOrder);
  // Default to Other so the controlled <select> always matches an enabled option
  // (empty + disabled placeholder causes SSR/client hydration mismatches).
  const [propertyChoice, setPropertyChoice] = useState(PROPERTY_OTHER);
  const [docForm, setDocForm] = useState(emptyDocument);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseMsg, setExpenseMsg] = useState<string | null>(null);
  const thisYear = new Date().getFullYear();
  const [budgetPropertyId, setBudgetPropertyId] = useState("");
  const [budgetFiscalYear, setBudgetFiscalYear] = useState(thisYear);
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

  const budgetPropertyOptions = useMemo(
    () =>
      [...managedProperties]
        .map((p) => ({
          id: p.id,
          name: p.propertyName?.trim() || "Untitled property",
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [managedProperties]
  );

  useEffect(() => {
    if (budgetPropertyId) return;
    if (budgetPropertyOptions.length === 0) return;
    setBudgetPropertyId(budgetPropertyOptions[0].id);
  }, [budgetPropertyId, budgetPropertyOptions]);

  const selectedBudgetProperty = budgetPropertyOptions.find(
    (p) => p.id === budgetPropertyId
  );

  const budgetFiscalYears = useMemo(() => {
    const years = new Set<number>();
    for (const row of deptBudgets) {
      if (row.department !== "maintenance") continue;
      if (budgetPropertyId && row.propertyId !== budgetPropertyId) continue;
      years.add(row.fiscalYear);
    }
    years.add(thisYear);
    years.add(thisYear + 1);
    years.add(thisYear - 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [deptBudgets, budgetPropertyId, thisYear]);

  useEffect(() => {
    if (budgetFiscalYears.includes(budgetFiscalYear)) return;
    if (budgetFiscalYears.length === 0) return;
    setBudgetFiscalYear(budgetFiscalYears[0]);
  }, [budgetFiscalYears, budgetFiscalYear]);

  const mgmtBudgetLines = useMemo(() => {
    if (!budgetPropertyId || !selectedBudgetProperty) return [];
    return maintenanceBudgetViewLines({
      items: deptBudgets,
      packs: budgetPacks,
      propertyId: budgetPropertyId,
      propertyName: selectedBudgetProperty.name,
      fiscalYear: budgetFiscalYear,
    });
  }, [
    deptBudgets,
    budgetPacks,
    budgetPropertyId,
    selectedBudgetProperty,
    budgetFiscalYear,
  ]);

  /** Lines shaped for the fill-bar UI (amounts from Management; spend from docs). */
  const budgetLinesOnly = useMemo(() => {
    const propName = selectedBudgetProperty?.name ?? "";
    return mgmtBudgetLines.map((line) => {
      let approved = 0;
      let pending = 0;
      for (const d of documents) {
        if (!d.applyToBudget) continue;
        if (propName && !propertyNamesMatch(d.property, propName)) continue;
        const dateStr = d.documentDate || d.submittedAt || "";
        const y = new Date(dateStr).getFullYear();
        if (Number.isFinite(y) && y !== budgetFiscalYear) continue;
        const key = normalizeMaintCategoryKey(d.category || "");
        if (d.budgetLineId !== line.id && key !== line.categoryKey) continue;
        const status =
          normalizeDocumentApproval(d).approvalStatus ?? "approved";
        const amt = Number.isFinite(d.amount) ? d.amount : 0;
        if (status === "approved") approved += amt;
        else if (status === "pending") pending += amt;
      }
      return {
        id: line.id,
        category: line.categoryKey,
        label: line.label,
        budgetAmount: line.budgeted,
        spentAmount: round2(approved),
        pending: round2(pending),
        notes: "",
      };
    });
  }, [
    mgmtBudgetLines,
    documents,
    selectedBudgetProperty,
    budgetFiscalYear,
  ]);

  const budgetTotals = useMemo(() => {
    const totalBudget = budgetLinesOnly.reduce(
      (s, l) => s + l.budgetAmount,
      0
    );
    const totalSpent = budgetLinesOnly.reduce((s, l) => s + l.spentAmount, 0);
    const remaining = totalBudget - totalSpent;
    const pct = totalBudget
      ? Math.round((totalSpent / totalBudget) * 100)
      : 0;
    return { totalBudget, totalSpent, remaining, pct };
  }, [budgetLinesOnly]);

  const pendingSpendTotal = useMemo(
    () => budgetLinesOnly.reduce((s, l) => s + l.pending, 0),
    [budgetLinesOnly]
  );

  const pendingSpendByLine = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of budgetLinesOnly) {
      map.set(line.id, line.pending);
    }
    return map;
  }, [budgetLinesOnly]);

  const budgetExpenseDocs = useMemo(() => {
    const propName = selectedBudgetProperty?.name ?? "";
    return [...documents]
      .filter((d) => {
        if (!d.applyToBudget) return false;
        if (propName && d.property && !propertyNamesMatch(d.property, propName))
          return false;
        const dateStr = d.documentDate || d.submittedAt || "";
        const y = new Date(dateStr).getFullYear();
        if (Number.isFinite(y) && y !== budgetFiscalYear) return false;
        return true;
      })
      .sort((a, b) =>
        (b.submittedAt || "").localeCompare(a.submittedAt || "")
      );
  }, [documents, selectedBudgetProperty, budgetFiscalYear]);

  /** Budget categories for invoice forms (property from form + year from date). */
  function codingLinesForProperty(
    propertyName: string,
    fiscalYear: number
  ) {
    const prop = budgetPropertyOptions.find((p) =>
      propertyNamesMatch(p.name, propertyName)
    );
    if (!prop) {
      return WORK_ORDER_CATEGORIES.map((c) => ({
        id: `fallback-${c.value}`,
        category: c.value,
        label: c.label,
        budgetAmount: 0,
        spentAmount: 0,
        pending: 0,
        notes: "",
      }));
    }
    const lines = maintenanceBudgetViewLines({
      items: deptBudgets,
      packs: budgetPacks,
      propertyId: prop.id,
      propertyName: prop.name,
      fiscalYear,
    });
    if (lines.length === 0) {
      return WORK_ORDER_CATEGORIES.map((c) => ({
        id: `fallback-${prop.id}-${fiscalYear}-${c.value}`,
        category: c.value,
        label: c.label,
        budgetAmount: 0,
        spentAmount: 0,
        pending: 0,
        notes: "",
      }));
    }
    return lines.map((line) => ({
      id: line.id,
      category: line.categoryKey,
      label: line.label,
      budgetAmount: line.budgeted,
      spentAmount: 0,
      pending: 0,
      notes: "",
    }));
  }

  const docCodingLines = useMemo(() => {
    const year = new Date(
      docForm.invoiceDate || docForm.documentDate || todayIso()
    ).getFullYear();
    return codingLinesForProperty(docForm.property, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    docForm.property,
    docForm.invoiceDate,
    docForm.documentDate,
    deptBudgets,
    budgetPacks,
    budgetPropertyOptions,
  ]);

  const editDocCodingLines = useMemo(() => {
    if (!editingDocument) return [];
    const year = new Date(
      editingDocument.invoiceDate ||
        editingDocument.documentDate ||
        todayIso()
    ).getFullYear();
    return codingLinesForProperty(editingDocument.property, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editingDocument?.property,
    editingDocument?.invoiceDate,
    editingDocument?.documentDate,
    deptBudgets,
    budgetPacks,
    budgetPropertyOptions,
  ]);

  function maintenanceBudgetCode(category: string) {
    const codes: Record<string, string> = {
      hvac: "HVAC",
      plumbing: "PLMB",
      electrical: "ELEC",
      structural: "STRC",
      janitorial: "JAN",
      landscaping: "LAND",
      security: "SEC",
      appliance: "APPL",
      appliances: "APPL",
      general: "GEN",
      other: "OTH",
      housekeeping: "JAN",
      painting_drywall: "STRC",
      doors_locks: "STRC",
      make_ready: "GEN",
      emergency: "GEN",
      amenities: "OTH",
      pest_control: "OTH",
    };
    return (
      codes[normalizeMaintCategoryKey(category)] ??
      codes[category] ??
      String(category).slice(0, 4).toUpperCase()
    );
  }

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
    setForm((prev) => ({
      ...prev,
      property: value === PROPERTY_OTHER ? "" : value,
      unit: "",
    }));
  }

  const unitOptionsForProperty = useMemo(() => {
    const name = form.property.trim().toLowerCase();
    if (!name) return [] as string[];
    return propertyTenants
      .filter((t) => {
        const pn = (t.propertyName || "").trim().toLowerCase();
        return (
          pn === name ||
          pn.includes(name) ||
          name.includes(pn) ||
          propertyNamesMatch(t.propertyName, form.property)
        );
      })
      .map((t) => t.unit)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [propertyTenants, form.property]);

  const unitOptionsForEditing = useMemo(() => {
    const name = (editingOrder?.property || "").trim().toLowerCase();
    if (!name || !editingOrder) return [] as string[];
    return propertyTenants
      .filter((t) => {
        const pn = (t.propertyName || "").trim().toLowerCase();
        return (
          pn === name ||
          pn.includes(name) ||
          name.includes(pn) ||
          propertyNamesMatch(t.propertyName, editingOrder.property)
        );
      })
      .map((t) => t.unit)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [propertyTenants, editingOrder]);

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
    _orderList?: WorkOrder[],
    _docList?: MaintenanceDocument[]
  ) {
    // Spend is computed live from Management budgets + maintenance documents.
  }

  function resolveBudgetLineForWorkOrder(
    order: WorkOrder,
    preferredId: string,
    lines: Array<{ id: string; category: string }> = budgetLinesOnly
  ) {
    if (preferredId && lines.some((l) => l.id === preferredId)) {
      return preferredId;
    }
    if (
      order.budgetAppliedLineId &&
      lines.some((l) => l.id === order.budgetAppliedLineId)
    ) {
      return order.budgetAppliedLineId;
    }
    const key = normalizeMaintCategoryKey(order.category);
    const byCategory = lines.find(
      (l) => normalizeMaintCategoryKey(String(l.category)) === key
    );
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
    if (!expenseForm.lineId || amount == null) {
      setExpenseMsg("Select a budget category and enter a valid amount.");
      return;
    }
    if (!expenseForm.vendorName.trim()) {
      setExpenseMsg("Payee / vendor is required.");
      return;
    }
    if (!expenseForm.property.trim() && !selectedBudgetProperty?.name) {
      setExpenseMsg("Location / property is required.");
      return;
    }
    if (!expenseForm.workOrderId) {
      setExpenseMsg("Select a work order or Non-specific.");
      return;
    }

    const line = budgetLinesOnly.find((b) => b.id === expenseForm.lineId);
    const linkedOrder =
      expenseForm.workOrderId !== NON_SPECIFIC_WORK_ORDER
        ? orders.find((o) => o.id === expenseForm.workOrderId)
        : undefined;
    if (
      expenseForm.workOrderId !== NON_SPECIFIC_WORK_ORDER &&
      !linkedOrder
    ) {
      setExpenseMsg("Selected work order was not found.");
      return;
    }

    const category =
      expenseForm.category ||
      (line ? line.category : "") ||
      linkedOrder?.category ||
      "";
    const id = crypto.randomUUID();
    const day = todayIso();
    const receipt = submitDocumentForApproval(
      normalizeMaintenanceDocument({
        id,
        kind: expenseForm.kind,
        vendorName: expenseForm.vendorName.trim(),
        property:
          expenseForm.property.trim() ||
          selectedBudgetProperty?.name ||
          "",
        amount,
        documentDate: day,
        invoiceDate: day,
        dueDate: "",
        invoiceNumber: generateMaintenanceInvoiceNumber(id),
        vendorId: "",
        amountPaid: 0,
        disputed: false,
        payableCategory: category
          ? workOrderCategoryToPayableCategory(
              category as WorkOrderCategory | ""
            )
          : "other",
        workOrderId:
          expenseForm.workOrderId === NON_SPECIFIC_WORK_ORDER
            ? ""
            : expenseForm.workOrderId,
        category: (category as WorkOrderCategory | "") || "",
        fileName: expenseForm.fileName.trim() || "manual-expense",
        fileDataUrl: expenseForm.fileDataUrl || "",
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
    if (linkedOrder) {
      const nextDocs = [receipt, ...documents.filter((d) => d.id !== receipt.id)];
      const actualCost = actualCostFromDocuments(linkedOrder.id, nextDocs);
      await saveOrder({
        ...linkedOrder,
        priority: normalizePriority(linkedOrder.priority),
        actualCost,
        estimatedCost: "",
        budgetAppliedAmount: "",
        budgetAppliedLineId: "",
      });
      await syncBudgetSpendFromLedger(
        [linkedOrder, ...orders.filter((o) => o.id !== linkedOrder.id)],
        nextDocs
      );
    } else {
      await syncBudgetSpendFromLedger(orders, [receipt, ...documents]);
    }
    const kindLabel =
      expenseForm.kind === "invoice" ? "Invoice" : "Receipt";
    setExpenseForm(emptyExpenseForm());
    setShowExpenseForm(false);
    setExpenseMsg(
      isDocumentApproved(receipt)
        ? `${kindLabel} submitted and applied to budget.`
        : expenseForm.kind === "invoice"
          ? `${kindLabel} submitted to Management for approval. Will forward to Accounts Payable once approved.`
          : `${kindLabel} submitted to Management for approval. Budget will update once approved.`
    );
    setTimeout(() => setExpenseMsg(null), 3000);
  }

  function onExpenseWorkOrderChange(workOrderId: string) {
    if (!workOrderId || workOrderId === NON_SPECIFIC_WORK_ORDER) {
      setExpenseForm((f) => ({
        ...f,
        workOrderId,
        ...(workOrderId === NON_SPECIFIC_WORK_ORDER
          ? {}
          : { property: "", category: "", lineId: "" }),
      }));
      return;
    }
    const order = orders.find((o) => o.id === workOrderId);
    if (!order) {
      setExpenseForm((f) => ({ ...f, workOrderId }));
      return;
    }
    const lineId = resolveBudgetLineForWorkOrder(order, "");
    const line = budgetLinesOnly.find((b) => b.id === lineId);
    setExpenseForm((f) => ({
      ...f,
      workOrderId,
      property: order.property || selectedBudgetProperty?.name || f.property,
      category: order.category,
      lineId: lineId || f.lineId,
      ...(line
        ? { category: (line.category as WorkOrderCategory) || order.category }
        : {}),
    }));
  }

  async function onExpenseFileChange(file: File | undefined) {
    if (!file) {
      setExpenseForm((f) => ({ ...f, fileName: "", fileDataUrl: "" }));
      return;
    }
    if (file.size > MAX_DOC_FILE_BYTES) {
      setExpenseMsg(
        "File is too large to store (max ~1.2MB). Choose a smaller PDF or image."
      );
      setExpenseForm((f) => ({
        ...f,
        fileName: file.name,
        fileDataUrl: "",
      }));
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setExpenseForm((f) => ({
        ...f,
        fileName: file.name,
        fileDataUrl: dataUrl,
      }));
      setExpenseMsg(null);
    } catch {
      setExpenseMsg("Could not read the selected file.");
    }
  }

  function updateDocForm<K extends keyof MaintenanceDocumentForm>(
    key: K,
    value: MaintenanceDocumentForm[K]
  ) {
    setDocForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmitDocument(e: FormEvent) {
    e.preventDefault();
    const isNonSpecific =
      !docForm.workOrderId.trim() ||
      docForm.workOrderId === NON_SPECIFIC_WORK_ORDER;
    if (!isNonSpecific) {
      const linkedCheck = orders.find((o) => o.id === docForm.workOrderId);
      if (!linkedCheck) {
        setSavedMsg("Selected work order was not found in the ledger.");
        return;
      }
    }
    if (!docForm.vendorName.trim() || !docForm.amount.trim()) {
      setSavedMsg("Payee and amount are required for invoices/receipts.");
      return;
    }
    if (!docForm.property.trim()) {
      setSavedMsg("Location / property is required.");
      return;
    }

    const linkedOrder = isNonSpecific
      ? undefined
      : orders.find((o) => o.id === docForm.workOrderId);

    const amount = parsePositiveAmount(docForm.amount);
    if (amount == null) {
      setSavedMsg("Enter a valid amount greater than zero.");
      return;
    }

    const budgetLineId =
      docForm.budgetLineId ||
      (linkedOrder
        ? resolveBudgetLineForWorkOrder(linkedOrder, "", docCodingLines) || ""
        : "") ||
      "";
    if (!budgetLineId) {
      setSavedMsg("Select a budget category to code this document to.");
      return;
    }

    const line =
      docCodingLines.find((b) => b.id === budgetLineId) ??
      budgetLinesOnly.find((b) => b.id === budgetLineId);
    const category =
      docForm.category ||
      (line ? (line.category as WorkOrderCategory) : "") ||
      linkedOrder?.category ||
      "";
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
        property: docForm.property.trim(),
        workOrderId: isNonSpecific ? "" : docForm.workOrderId,
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
        fileName: docForm.fileName,
        fileDataUrl: docForm.fileDataUrl || "",
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
      if (linkedOrder) {
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
        setHighlightId(updatedOrder.id);
        setTimeout(() => setHighlightId(null), 6000);
      } else {
        await syncBudgetSpendFromLedger(orders, nextDocs);
      }

      setDocForm(emptyDocument());
      setSavedMsg(
        isDocumentApproved(next)
          ? `${docForm.kind === "invoice" ? "Invoice" : "Receipt"} submitted${
              linkedOrder ? `, linked to "${linkedOrder.title}"` : " (non-specific)"
            }, and budget synced.`
          : docForm.kind === "invoice"
            ? "Invoice submitted to Management for approval. Will forward to Accounts Payable once approved."
            : "Receipt submitted to Management for approval. Budget and work order will update once approved."
      );
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (err) {
      setSavedMsg(
        err instanceof Error ? err.message : "Could not save document."
      );
    }
  }

  function onDocumentWorkOrderChange(workOrderId: string) {
    if (!workOrderId || workOrderId === NON_SPECIFIC_WORK_ORDER) {
      setDocForm((prev) => ({
        ...prev,
        workOrderId,
      }));
      return;
    }
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
      budgetLineId: resolveBudgetLineForWorkOrder(
        order,
        prev.budgetLineId,
        codingLinesForProperty(
          order.property,
          new Date(
            prev.invoiceDate || prev.documentDate || todayIso()
          ).getFullYear()
        )
      ),
    }));
  }

  async function onDocumentFileChange(file: File | undefined) {
    if (!file) {
      updateDocForm("fileName", "");
      updateDocForm("fileDataUrl", "");
      return;
    }
    if (file.size > MAX_DOC_FILE_BYTES) {
      setSavedMsg(
        "File is too large to store (max ~1.2MB). Choose a smaller PDF or image."
      );
      updateDocForm("fileName", file.name);
      updateDocForm("fileDataUrl", "");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setDocForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileDataUrl: dataUrl,
      }));
    } catch {
      setSavedMsg("Could not read the selected file.");
    }
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
    if (!workOrderId || workOrderId === NON_SPECIFIC_WORK_ORDER) {
      updateEditingDocument("workOrderId", workOrderId);
      return;
    }
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
              prev.budgetLineId,
              codingLinesForProperty(
                order.property,
                new Date(
                  prev.invoiceDate || prev.documentDate || todayIso()
                ).getFullYear()
              )
            ),
          }
        : prev
    );
  }

  async function handleSaveEditedDocument(e: FormEvent) {
    e.preventDefault();
    if (!editingDocument) return;

    const isNonSpecific =
      !editingDocument.workOrderId.trim() ||
      editingDocument.workOrderId === NON_SPECIFIC_WORK_ORDER;
    if (!isNonSpecific) {
      const linkedCheck = orders.find(
        (o) => o.id === editingDocument.workOrderId
      );
      if (!linkedCheck) {
        setSavedMsg("Selected work order was not found in the ledger.");
        return;
      }
    }
    if (!editingDocument.vendorName.trim() || !editingDocument.amount.trim()) {
      setSavedMsg("Payee and amount are required for invoices/receipts.");
      return;
    }
    if (!editingDocument.property.trim()) {
      setSavedMsg("Location / property is required.");
      return;
    }

    const linkedOrder = isNonSpecific
      ? undefined
      : orders.find((o) => o.id === editingDocument.workOrderId);

    const amount = parsePositiveAmount(editingDocument.amount);
    if (amount == null) {
      setSavedMsg("Enter a valid amount greater than zero.");
      return;
    }

    const original = documents.find((d) => d.id === editingDocument.id);
    const previousWorkOrderId = original?.workOrderId ?? "";

    const budgetLineId =
      editingDocument.budgetLineId ||
      (linkedOrder
        ? resolveBudgetLineForWorkOrder(
            linkedOrder,
            "",
            editDocCodingLines
          ) || ""
        : "") ||
      "";
    if (!budgetLineId) {
      setSavedMsg("Select a budget category to code this document to.");
      return;
    }

    const line =
      editDocCodingLines.find((b) => b.id === budgetLineId) ??
      budgetLinesOnly.find((b) => b.id === budgetLineId);
    const category =
      editingDocument.category ||
      (line ? (line.category as WorkOrderCategory) : "") ||
      linkedOrder?.category ||
      "";
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
        property: editingDocument.property.trim(),
        workOrderId: isNonSpecific ? "" : editingDocument.workOrderId,
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
        fileName: editingDocument.fileName,
        fileDataUrl: editingDocument.fileDataUrl || "",
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

      if (linkedOrder) {
        const newActual = actualCostFromDocuments(linkedOrder.id, nextDocs);
        const updatedNewOrder: WorkOrder = {
          ...linkedOrder,
          priority: normalizePriority(linkedOrder.priority),
          actualCost: newActual,
          estimatedCost: "",
          budgetAppliedAmount: "",
          budgetAppliedLineId: "",
          status: isDocumentApproved(updated)
            ? "completed"
            : linkedOrder.status,
          completedAt: isDocumentApproved(updated)
            ? linkedOrder.completedAt || new Date().toISOString().slice(0, 10)
            : linkedOrder.completedAt,
        };
        orderUpdates.push(updatedNewOrder);
        await saveOrder(updatedNewOrder);
      }

      if (
        previousWorkOrderId &&
        previousWorkOrderId !== (linkedOrder?.id ?? "")
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
              previousWorkOrderId &&
              previousWorkOrderId !== (linkedOrder?.id ?? "")
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

  const panels: { id: Panel; label: string; icon: typeof Wrench }[] = [
    { id: "new", label: "New work order", icon: PlusCircle },
    { id: "ledger", label: "Work order ledger", icon: ClipboardList },
    { id: "vendors", label: "3rd party dashboard", icon: Users },
    { id: "budget", label: "Budget dashboard", icon: Wallet },
    { id: "documents", label: "Invoices & receipts", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[var(--harbor-sand)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <OpsBrandHomeLink subtitle="Maintenance" />
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

                  <div className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">
                      Unit / area{" "}
                      <span className="opacity-55">(select all that apply)</span>
                    </span>
                    <UnitAreaMultiSelect
                      propertyName={form.property}
                      propertyUnits={unitOptionsForProperty}
                      value={form.unit}
                      onChange={(next) => updateForm("unit", next)}
                    />
                  </div>

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

            <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-border)] bg-[var(--harbor-card)] shadow-sm">
              <table className="table table-sm">
                <thead>
                  <tr className="text-[var(--harbor-muted)]">
                    <th className="min-w-[14rem]">Work order</th>
                    <th className="whitespace-nowrap">Priority</th>
                    <th className="whitespace-nowrap">Status</th>
                    <th className="whitespace-nowrap">Source</th>
                    <th className="whitespace-nowrap">Labor</th>
                    <th className="min-w-[8rem]">Property</th>
                    <th className="whitespace-nowrap">Actual cost</th>
                    <th className="whitespace-nowrap">Date</th>
                    <th className="whitespace-nowrap">Update</th>
                    <th className="whitespace-nowrap">Edit</th>
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
                          <td className="align-middle">
                            <p className="font-medium leading-snug text-[var(--harbor-text)]">
                              {o.title}
                            </p>
                            <p className="text-xs text-[var(--harbor-muted)]">
                              {categoryLabel(o.category)}
                              {o.unit ? ` · ${o.unit}` : ""}
                            </p>
                          </td>
                          <td className="align-middle whitespace-nowrap">
                            <span
                              className={`badge badge-sm h-7 whitespace-nowrap px-2.5 ${priorityBadgeClass(priority)}`}
                            >
                              {priorityLabel(priority)}
                            </span>
                          </td>
                          <td className="align-middle whitespace-nowrap">
                            <span
                              className={`badge badge-sm h-7 whitespace-nowrap px-2.5 ${
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
                          <td className="align-middle whitespace-nowrap text-sm text-[var(--harbor-muted)]">
                            {sourceLabel(o.source)}
                          </td>
                          <td className="align-middle whitespace-nowrap text-sm text-[var(--harbor-muted)]">
                            {laborLabel(o.labor)}
                          </td>
                          <td className="align-middle text-sm text-[var(--harbor-text)]">
                            {o.property}
                          </td>
                          <td className="align-middle text-sm tabular-nums">
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
                          <td className="align-middle whitespace-nowrap text-sm text-[var(--harbor-muted)]">
                            {o.createdAt}
                          </td>
                          <td className="align-middle">
                            <select
                              className="select select-bordered select-sm h-9 min-w-[9.5rem] whitespace-nowrap"
                              value={o.status}
                              onChange={(e) =>
                                updateOrderStatus(
                                  o.id,
                                  e.target.value as WorkOrderStatus
                                )
                              }
                              aria-label={`Update status for ${o.title}`}
                            >
                              {WORK_ORDER_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="align-middle whitespace-nowrap">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm gap-1"
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

                  <div className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">
                      Unit / area{" "}
                      <span className="opacity-55">(select all that apply)</span>
                    </span>
                    <UnitAreaMultiSelect
                      propertyName={editingOrder.property}
                      propertyUnits={unitOptionsForEditing}
                      value={editingOrder.unit}
                      onChange={(next) => updateEditingOrder("unit", next)}
                    />
                  </div>

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
          <section className="space-y-3">
            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-3 shadow-sm space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold leading-tight text-[var(--harbor-ink)]">
                    Maintenance budget
                  </h2>
                  <p className="text-[11px] opacity-60">
                    Budgets pushed by Management by building &amp; year
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="select select-bordered select-xs bg-white max-w-[12rem]"
                    value={budgetPropertyId}
                    onChange={(e) => setBudgetPropertyId(e.target.value)}
                    aria-label="Property"
                  >
                    {budgetPropertyOptions.length === 0 ? (
                      <option value="">No properties</option>
                    ) : (
                      budgetPropertyOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                  <select
                    className="select select-bordered select-xs bg-white"
                    value={budgetFiscalYear}
                    onChange={(e) =>
                      setBudgetFiscalYear(Number(e.target.value))
                    }
                    aria-label="Fiscal year"
                  >
                    {budgetFiscalYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <div className="rounded-lg border border-[#8aa3b5]/45 bg-[#d5dee5] px-3 py-1 text-right">
                    <p className="text-[9px] uppercase tracking-wide opacity-55">
                      Net budgeted
                    </p>
                    <p className="text-lg font-semibold leading-tight text-[#2f4556]">
                      {money(budgetTotals.totalBudget)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-[11px] font-medium">
                  <span>Overall</span>
                  <span>
                    {money(budgetTotals.totalSpent)} approved ·{" "}
                    {money(pendingSpendTotal)} pending ·{" "}
                    {money(budgetTotals.totalBudget - budgetTotals.totalSpent)}{" "}
                    left
                  </span>
                </div>
                <BudgetFillBar
                  budgeted={budgetTotals.totalBudget}
                  approved={budgetTotals.totalSpent}
                  pending={pendingSpendTotal}
                />
              </div>

              <div className="space-y-1">
                {budgetLinesOnly.length === 0 ? (
                  <p className="py-2 text-center text-xs opacity-55">
                    No Management budget for this building and year yet. Create
                    one under Management → Department budgets.
                  </p>
                ) : (
                  budgetLinesOnly.map((line) => {
                    const pending = pendingSpendByLine.get(line.id) ?? 0;
                    return (
                      <div
                        key={line.id}
                        className="grid grid-cols-[4.25rem_1fr] items-center gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-bold leading-none text-[#2f4556]">
                            {maintenanceBudgetCode(line.category)}
                          </p>
                          <p className="truncate text-[9px] leading-tight opacity-55">
                            {line.label}
                          </p>
                        </div>
                        <BudgetFillBar
                          budgeted={line.budgetAmount}
                          approved={line.spentAmount}
                          pending={pending}
                          compact
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-base-200 pt-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    Invoice / receipt coding
                  </h3>
                  <button
                    type="button"
                    className="btn btn-neutral btn-xs"
                    onClick={() => {
                      setShowExpenseForm((v) => {
                        if (!v && selectedBudgetProperty) {
                          setExpenseForm((f) => ({
                            ...f,
                            property:
                              f.property || selectedBudgetProperty.name,
                          }));
                        }
                        return !v;
                      });
                    }}
                  >
                    {showExpenseForm ? "Hide" : "Submit invoice"}
                  </button>
                </div>

                {expenseMsg && (
                  <p className="text-xs text-emerald-800">{expenseMsg}</p>
                )}

                {showExpenseForm && (
                  <form
                    onSubmit={recordExpense}
                    className="grid gap-1.5 rounded-lg border border-base-300 bg-base-100 p-2 sm:grid-cols-2"
                  >
                    <select
                      className="select select-bordered select-xs bg-white"
                      value={expenseForm.kind}
                      onChange={(e) =>
                        setExpenseForm((f) => ({
                          ...f,
                          kind: e.target.value as DocumentKind,
                        }))
                      }
                    >
                      <option value="invoice">Invoice</option>
                      <option value="receipt">Receipt</option>
                    </select>
                    <select
                      className="select select-bordered select-xs bg-white"
                      value={expenseForm.workOrderId}
                      onChange={(e) =>
                        onExpenseWorkOrderChange(e.target.value)
                      }
                      required
                    >
                      <option value="">Work order</option>
                      <option value={NON_SPECIFIC_WORK_ORDER}>
                        Non-specific (not linked)
                      </option>
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title} · {o.property}
                          {o.unit ? ` · ${o.unit}` : ""}
                        </option>
                      ))}
                    </select>
                    <select
                      className="select select-bordered select-xs bg-white"
                      value={
                        selectedBudgetProperty?.name || expenseForm.property
                      }
                      onChange={(e) =>
                        setExpenseForm((f) => ({
                          ...f,
                          property: e.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Location / property</option>
                      {selectedBudgetProperty ? (
                        <option value={selectedBudgetProperty.name}>
                          {selectedBudgetProperty.name}
                        </option>
                      ) : null}
                      {properties.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <select
                      className="select select-bordered select-xs bg-white"
                      value={expenseForm.lineId}
                      onChange={(e) => {
                        const lineId = e.target.value;
                        const line = budgetLinesOnly.find((b) => b.id === lineId);
                        setExpenseForm((f) => ({
                          ...f,
                          lineId,
                          category: line
                            ? (line.category as WorkOrderCategory)
                            : f.category,
                        }));
                      }}
                      required
                    >
                      <option value="">Budget category</option>
                      {budgetLinesOnly.map((b) => (
                        <option key={b.id} value={b.id}>
                          {maintenanceBudgetCode(b.category)} · {b.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input input-bordered input-xs bg-white"
                      placeholder="Vendor / payee"
                      value={expenseForm.vendorName}
                      onChange={(e) =>
                        setExpenseForm((f) => ({
                          ...f,
                          vendorName: e.target.value,
                        }))
                      }
                      required
                    />
                    <input
                      className="input input-bordered input-xs bg-white"
                      placeholder="Amount"
                      value={expenseForm.amount}
                      onChange={(e) =>
                        setExpenseForm((f) => ({
                          ...f,
                          amount: e.target.value,
                        }))
                      }
                      required
                    />
                    <input
                      className="input input-bordered input-xs bg-white sm:col-span-2"
                      placeholder="Note (optional)"
                      value={expenseForm.note}
                      onChange={(e) =>
                        setExpenseForm((f) => ({
                          ...f,
                          note: e.target.value,
                        }))
                      }
                    />
                    <label className="form-control w-full sm:col-span-2">
                      <span className="mb-0.5 text-[10px] opacity-60">
                        Upload invoice / receipt (optional, max ~1.2MB)
                      </span>
                      <input
                        type="file"
                        className="file-input file-input-bordered file-input-xs w-full bg-white"
                        accept="image/*,.pdf"
                        onChange={(e) =>
                          void onExpenseFileChange(e.target.files?.[0])
                        }
                      />
                      {expenseForm.fileName ? (
                        <span className="mt-0.5 text-[10px] opacity-55">
                          Selected: {expenseForm.fileName}
                          {expenseForm.fileDataUrl ? " · attached" : ""}
                        </span>
                      ) : null}
                    </label>
                    <button
                      type="submit"
                      className="btn btn-neutral btn-xs sm:col-span-2"
                    >
                      Submit for approval
                    </button>
                  </form>
                )}

                <div className="max-h-28 overflow-y-auto rounded-lg border border-base-300">
                  <table className="table table-xs">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Vendor</th>
                        <th>$</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetExpenseDocs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-3 text-center opacity-55"
                          >
                            No expenses yet.
                          </td>
                        </tr>
                      ) : (
                        budgetExpenseDocs.map((d) => {
                          const line =
                            budgetLinesOnly.find(
                              (b) => b.id === d.budgetLineId
                            ) ??
                            budgetLinesOnly.find(
                              (b) =>
                                normalizeMaintCategoryKey(b.category) ===
                                normalizeMaintCategoryKey(d.category || "")
                            );
                          const code = line
                            ? maintenanceBudgetCode(line.category)
                            : d.category
                              ? maintenanceBudgetCode(d.category)
                              : "—";
                          const status =
                            normalizeDocumentApproval(d).approvalStatus ??
                            "approved";
                          return (
                            <tr key={d.id}>
                              <td className="font-mono font-semibold">
                                {code}
                              </td>
                              <td className="max-w-[10rem] truncate">
                                {d.vendorName || "—"}
                              </td>
                              <td>{money(d.amount)}</td>
                              <td className="capitalize">{status}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] opacity-50">
                  Invoices: Management → Accounts Payable. Receipts: Management
                  → budget (not AP).
                </p>
              </div>
            </div>
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
                        editingDocument.approvalStatus ?? "pending"
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
                    <span className="mb-1 text-sm opacity-70">Work order</span>
                    <select
                      className="select select-bordered w-full"
                      value={
                        editingDocument.workOrderId || NON_SPECIFIC_WORK_ORDER
                      }
                      onChange={(e) =>
                        onEditingDocumentWorkOrderChange(e.target.value)
                      }
                      required
                    >
                      <option value="">Select work order</option>
                      <option value={NON_SPECIFIC_WORK_ORDER}>
                        Non-specific (not linked to a work order)
                      </option>
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
                      Upload invoice / receipt (optional, max ~1.2MB)
                    </span>
                    <input
                      type="file"
                      className="file-input file-input-bordered w-full"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) {
                          updateEditingDocument("fileName", "");
                          updateEditingDocument("fileDataUrl", "");
                          return;
                        }
                        if (file.size > MAX_DOC_FILE_BYTES) {
                          setSavedMsg(
                            "File is too large to store (max ~1.2MB)."
                          );
                          updateEditingDocument("fileName", file.name);
                          updateEditingDocument("fileDataUrl", "");
                          return;
                        }
                        void readFileAsDataUrl(file).then((dataUrl) => {
                          setEditingDocument((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  fileName: file.name,
                                  fileDataUrl: dataUrl,
                                }
                              : prev
                          );
                        });
                      }}
                    />
                    {editingDocument.fileName ? (
                      <span className="mt-1 text-xs opacity-60">
                        Current: {editingDocument.fileName}
                        {editingDocument.fileDataUrl ? " · attached" : ""}
                      </span>
                    ) : (
                      <span className="mt-1 text-xs opacity-55">
                        Optional — attach a PDF or image.
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
                    <span className="mb-1 text-sm opacity-70">
                      Budget category
                    </span>
                    <select
                      className="select select-bordered w-full"
                      value={editingDocument.budgetLineId}
                      onChange={(e) => {
                        const budgetLineId = e.target.value;
                        const line = editDocCodingLines.find(
                          (b) => b.id === budgetLineId
                        );
                        setEditingDocument((prev) =>
                          prev
                            ? {
                                ...prev,
                                budgetLineId,
                                category: line
                                  ? (line.category as WorkOrderCategory)
                                  : prev.category,
                                payableCategory: line
                                  ? workOrderCategoryToPayableCategory(
                                      line.category
                                    )
                                  : prev.payableCategory,
                              }
                            : prev
                        );
                      }}
                      required
                    >
                      <option value="">Select budget category</option>
                      {editDocCodingLines.map((b) => (
                        <option key={b.id} value={b.id}>
                          {maintenanceBudgetCode(b.category)} · {b.label}
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
                Link to a work order when applicable, or choose non-specific.
                Code spend to a Management budget category and optionally upload
                the invoice or receipt file.
              </p>
              <p className="text-xs opacity-55">
                Invoices go to Management first, then Accounts Payable.
                Receipts go to Management first, then apply to budget (not AP).
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="form-control w-full sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">Work order</span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.workOrderId}
                    onChange={(e) => onDocumentWorkOrderChange(e.target.value)}
                    required
                  >
                    <option value="">Select work order</option>
                    <option value={NON_SPECIFIC_WORK_ORDER}>
                      Non-specific (not linked to a work order)
                    </option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} · {o.property}
                        {o.unit ? ` · ${o.unit}` : ""} · {statusLabel(o.status)}{" "}
                        · {o.createdAt}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 text-xs opacity-55">
                    Linked documents update that job’s actual cost.
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
                  <span className="mb-1 text-sm opacity-70">
                    Location / property
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.property}
                    onChange={(e) => updateDocForm("property", e.target.value)}
                    required
                  >
                    <option value="">Select location</option>
                    {properties.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {docForm.property &&
                    !properties.includes(docForm.property) ? (
                      <option value={docForm.property}>{docForm.property}</option>
                    ) : null}
                  </select>
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">
                    Budget category
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.budgetLineId}
                    onChange={(e) => {
                      const budgetLineId = e.target.value;
                      const line = docCodingLines.find(
                        (b) => b.id === budgetLineId
                      );
                      setDocForm((prev) => ({
                        ...prev,
                        budgetLineId,
                        category: line
                          ? (line.category as WorkOrderCategory)
                          : prev.category,
                        payableCategory: line
                          ? workOrderCategoryToPayableCategory(line.category)
                          : prev.payableCategory,
                      }));
                    }}
                    required
                  >
                    <option value="">Select budget category</option>
                    {docCodingLines.map((b) => (
                      <option key={b.id} value={b.id}>
                        {maintenanceBudgetCode(b.category)} · {b.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control w-full sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">
                    Upload invoice / receipt (optional, max ~1.2MB)
                  </span>
                  <input
                    type="file"
                    className="file-input file-input-bordered w-full"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      void onDocumentFileChange(e.target.files?.[0])
                    }
                  />
                  {docForm.fileName ? (
                    <span className="mt-1 text-xs opacity-60">
                      Selected: {docForm.fileName}
                      {docForm.fileDataUrl ? " · attached" : ""}
                    </span>
                  ) : (
                    <span className="mt-1 text-xs opacity-55">
                      Optional — attach a PDF or image of the invoice/receipt.
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
