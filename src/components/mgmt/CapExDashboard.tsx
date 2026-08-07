"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import type { WorkOrder } from "@/lib/maintenance";
import {
  money,
  seedCapitalExpenditures,
  type CapExVendorInvoice,
  type CapitalExpenditure,
} from "@/lib/management";

const CATEGORIES: CapitalExpenditure["category"][] = [
  "renovation",
  "addition",
  "major_repair",
  "equipment",
  "other",
];

const MAX_INVOICE_BYTES = 1_200_000; // keep shared_records payloads reasonable

function ownerDisplayName(p: ManagementContractDraft) {
  return (
    p.ownerContactName?.trim() ||
    p.ownerLegalName?.trim() ||
    "Owner"
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export function CapExDashboard() {
  const {
    items: capex,
    saveOne,
    removeOne,
    loading,
    error,
  } = useSharedCollection<CapitalExpenditure>(
    COLLECTIONS.capitalExpenditures,
    seedCapitalExpenditures
  );
  const { items: workOrders } = useSharedCollection<WorkOrder>(
    COLLECTIONS.workOrders
  );
  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    propertyId: "",
    category: "renovation" as CapitalExpenditure["category"],
    estimatedCost: "",
    description: "",
    justification: "",
    relatedWorkOrderId: "",
  });
  const [draftInvoices, setDraftInvoices] = useState<CapExVendorInvoice[]>([]);
  const [invoiceVendor, setInvoiceVendor] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");

  const selected = capex.find((c) => c.id === selectedId) ?? null;

  const propertyOptions = useMemo(
    () =>
      [...properties]
        .map((p) => ({
          id: p.id,
          name: p.propertyName || "Untitled property",
          ownerName: ownerDisplayName(p),
          ownerEmail: (p.ownerEmail || "").trim().toLowerCase(),
          ownerAccountId: p.ownerAccountId || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [properties]
  );

  const ownerOptions = useMemo(() => {
    const map = new Map<
      string,
      { key: string; name: string; email: string; propertyIds: string[] }
    >();
    for (const p of propertyOptions) {
      const email = p.ownerEmail || `unknown:${p.id}`;
      const existing = map.get(email);
      if (existing) {
        existing.propertyIds.push(p.id);
      } else {
        map.set(email, {
          key: email,
          name: p.ownerName,
          email: p.ownerEmail,
          propertyIds: [p.id],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [propertyOptions]);

  const selectedProperty = propertyOptions.find((p) => p.id === form.propertyId);

  const maintenanceCandidates = useMemo(
    () =>
      workOrders.filter(
        (w) =>
          w.status !== "completed" &&
          (Number(w.estimatedCost) >= 10000 ||
            w.category === "structural" ||
            w.category === "hvac")
      ),
    [workOrders]
  );

  function resolvePropertyForWorkOrder(wo: WorkOrder) {
    const name = (wo.property || "").toLowerCase();
    return (
      propertyOptions.find(
        (p) =>
          p.name.toLowerCase() === name ||
          p.name.toLowerCase().includes(name) ||
          name.includes(p.name.toLowerCase())
      ) ?? null
    );
  }

  async function attachInvoiceFile(
    file: File | undefined,
    target: "draft" | "selected"
  ) {
    if (!file) return;
    let dataUrl: string | undefined;
    if (file.size <= MAX_INVOICE_BYTES) {
      try {
        dataUrl = await readFileAsDataUrl(file);
      } catch {
        setMsg("Could not read that file.");
        return;
      }
    } else {
      setMsg(
        `File stored by name only (${file.name}) — keep under ~1.2MB to embed a preview for the owner.`
      );
    }
    const inv: CapExVendorInvoice = {
      id: crypto.randomUUID(),
      fileName: file.name,
      vendorName: invoiceVendor.trim() || "Vendor",
      amount: Math.max(0, Number(invoiceAmount) || 0),
      dataUrl,
      uploadedAt: new Date().toISOString(),
    };
    if (target === "draft") {
      setDraftInvoices((prev) => [...prev, inv]);
    } else if (selected) {
      await saveOne({
        ...selected,
        vendorInvoices: [...(selected.vendorInvoices ?? []), inv],
      });
    }
    setInvoiceVendor("");
    setInvoiceAmount("");
  }

  async function createFromMaintenance(wo: WorkOrder) {
    const prop = resolvePropertyForWorkOrder(wo);
    const item: CapitalExpenditure = {
      id: crypto.randomUUID(),
      title: wo.title,
      propertyId: prop?.id,
      propertyName: prop?.name || wo.property,
      ownerName: prop?.ownerName || "Property Owner",
      ownerEmail: prop?.ownerEmail || "",
      ownerAccountId: prop?.ownerAccountId || undefined,
      category: "major_repair",
      estimatedCost: Math.max(0, Number(wo.estimatedCost) || 0),
      description: wo.description,
      justification: `Escalated from maintenance work order ${wo.id}.`,
      source: "maintenance",
      relatedWorkOrderId: wo.id,
      vendorInvoices: [],
      status: "pending_mgmt_edit",
      createdAt: new Date().toISOString(),
    };
    await saveOne(item);
    setSelectedId(item.id);
    setMsg(
      prop
        ? "Pulled from maintenance — owner locked from portfolio. Attach invoices, then send."
        : "Pulled from maintenance — match a portfolio property before sending."
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !selectedProperty) {
      setMsg("Select a portfolio property (owner fills automatically).");
      return;
    }
    if (!selectedProperty.ownerEmail) {
      setMsg(
        "That property has no owner email on file. Update the managed property record first."
      );
      return;
    }
    const cost = Number(form.estimatedCost);
    if (!Number.isFinite(cost) || cost < 0) {
      setMsg("Estimated cost cannot be negative.");
      return;
    }
    const item: CapitalExpenditure = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      propertyId: selectedProperty.id,
      propertyName: selectedProperty.name,
      ownerName: selectedProperty.ownerName,
      ownerEmail: selectedProperty.ownerEmail,
      ownerAccountId: selectedProperty.ownerAccountId || undefined,
      category: form.category,
      estimatedCost: cost,
      description: form.description.trim(),
      justification: form.justification.trim(),
      source: "management",
      relatedWorkOrderId: form.relatedWorkOrderId || undefined,
      vendorInvoices: draftInvoices,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    await saveOne(item);
    setShowForm(false);
    setDraftInvoices([]);
    setForm({
      title: "",
      propertyId: "",
      category: "renovation",
      estimatedCost: "",
      description: "",
      justification: "",
      relatedWorkOrderId: "",
    });
    setSelectedId(item.id);
    setMsg("CapEx draft created with portfolio owner locked in.");
  }

  async function saveEdits(patch: Partial<CapitalExpenditure>) {
    if (!selected) return;
    if (
      patch.estimatedCost !== undefined &&
      (!Number.isFinite(patch.estimatedCost) || patch.estimatedCost < 0)
    ) {
      setMsg("Estimated cost cannot be negative.");
      return;
    }
    await saveOne({ ...selected, ...patch });
  }

  async function deleteSelected() {
    if (!selected) return;
    const canDelete =
      selected.status === "draft" ||
      selected.status === "pending_mgmt_edit" ||
      selected.status === "cancelled";
    if (!canDelete) {
      setMsg("Only drafts (or cancelled items) can be deleted. Cancel first if sent.");
      return;
    }
    if (!window.confirm(`Delete CapEx “${selected.title}”? This cannot be undone.`)) {
      return;
    }
    await removeOne(selected.id);
    setSelectedId(null);
    setMsg("CapEx deleted.");
  }

  async function cancelSelected() {
    if (!selected) return;
    if (selected.status === "pending_owner_approval") {
      await saveOne({
        ...selected,
        status: "cancelled",
        ownerResponseNotes: "Withdrawn by CPMC Property Management Company before owner response.",
        ownerRespondedAt: new Date().toISOString(),
      });
      setMsg("CapEx cancelled and withdrawn from the owner portal.");
      return;
    }
    // Close the open detail panel without deleting
    setSelectedId(null);
    setMsg(null);
  }

  async function sendToOwner() {
    if (!selected) return;
    if (!selected.ownerEmail.trim()) {
      setMsg("Owner email required before sending — pick a portfolio property.");
      return;
    }
    if (!selected.propertyId && propertyOptions.length > 0) {
      setMsg("Link this CapEx to a portfolio property before sending.");
      return;
    }

    const invoiceLines =
      (selected.vendorInvoices ?? []).length > 0
        ? (selected.vendorInvoices ?? [])
            .map(
              (inv) =>
                `  • ${inv.vendorName}: ${inv.fileName}${
                  inv.amount ? ` (${money(inv.amount)})` : ""
                }`
            )
            .join("\n")
        : "  • (no vendor invoices attached — owner should request them if needed)";

    const portalUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/owners/dashboard`
        : "/owners/dashboard";

    const message = `Dear ${selected.ownerName},

CPMC requests your approval for a capital expenditure on ${selected.propertyName}:

Project: ${selected.title}
Category: ${selected.category.replaceAll("_", " ")}
Estimated cost: ${money(selected.estimatedCost)}

Description:
${selected.description}

Justification:
${selected.justification}

Vendor invoices on file:
${invoiceLines}

Please sign in to your CPMC owner portal to review invoices, approve or decline, and choose how you want to pay:
${portalUrl}

— CPMC Property Management Company`;

    const now = new Date().toISOString();
    await saveOne({
      ...selected,
      status: "pending_owner_approval",
      ownerRequestMessage: message,
      submittedToOwnerAt: now,
      emailedTo: selected.ownerEmail,
      emailedAt: now,
    });

    const subject = encodeURIComponent(
      `CapEx approval needed: ${selected.title} · ${selected.propertyName}`
    );
    const body = encodeURIComponent(message);
    window.open(
      `mailto:${encodeURIComponent(selected.ownerEmail)}?subject=${subject}&body=${body}`,
      "_blank"
    );

    setMsg(
      `Sent to owner portal for ${selected.ownerEmail}. Your email client opened so you can send the notice.`
    );
  }

  function onOwnerFilterChange(ownerKey: string) {
    if (!ownerKey) return;
    const owner = ownerOptions.find((o) => o.key === ownerKey);
    if (!owner) return;
    // Prefer keeping current property if it belongs to this owner
    if (form.propertyId && owner.propertyIds.includes(form.propertyId)) return;
    const first = owner.propertyIds[0];
    if (first) setForm((f) => ({ ...f, propertyId: first }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Hide form" : "Enter CapEx"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="grid gap-2 rounded-xl border border-base-300 bg-white p-3 sm:grid-cols-2"
          >
            <input
              className="input input-bordered input-sm bg-white sm:col-span-2"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <select
              className="select select-bordered select-sm bg-white"
              value={form.propertyId}
              onChange={(e) =>
                setForm({ ...form, propertyId: e.target.value })
              }
              required
            >
              <option value="">Select property</option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="select select-bordered select-sm bg-white"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value as CapitalExpenditure["category"],
                })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <label className="form-control sm:col-span-2">
              <span className="mb-1 text-xs opacity-60">
                Filter by owner (optional) — property still drives who receives
                the CapEx
              </span>
              <select
                className="select select-bordered select-sm bg-white"
                value={
                  selectedProperty?.ownerEmail
                    ? selectedProperty.ownerEmail
                    : ""
                }
                onChange={(e) => onOwnerFilterChange(e.target.value)}
              >
                <option value="">All owners</option>
                {ownerOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.name}
                    {o.email ? ` · ${o.email}` : " · (no email)"}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-[var(--harbor-deep)]/15 bg-[var(--harbor-deep)]/[0.04] px-3 py-2 sm:col-span-2">
              <p className="text-[10px] uppercase tracking-wide opacity-55">
                Owner (from portfolio — not editable)
              </p>
              {selectedProperty ? (
                <p className="text-sm font-medium">
                  {selectedProperty.ownerName}
                  <span className="ml-2 font-normal opacity-70">
                    {selectedProperty.ownerEmail || "No email on file"}
                  </span>
                </p>
              ) : (
                <p className="text-sm opacity-55">
                  Select a property to lock the correct owner.
                </p>
              )}
            </div>

            <input
              type="number"
              min={0}
              step="0.01"
              className="input input-bordered input-sm bg-white sm:col-span-2"
              placeholder="Estimated cost"
              value={form.estimatedCost}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setForm({ ...form, estimatedCost: "" });
                  return;
                }
                const n = Number(v);
                if (!Number.isFinite(n) || n < 0) return;
                setForm({ ...form, estimatedCost: v });
              }}
            />
            <textarea
              className="textarea textarea-bordered textarea-sm bg-white sm:col-span-2"
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <textarea
              className="textarea textarea-bordered textarea-sm bg-white sm:col-span-2"
              placeholder="Justification"
              value={form.justification}
              onChange={(e) =>
                setForm({ ...form, justification: e.target.value })
              }
            />

            <div className="sm:col-span-2 space-y-2 rounded-lg border border-dashed border-[var(--harbor-deep)]/25 p-3">
              <p className="text-xs font-medium opacity-70">
                Vendor invoices (owner will review these)
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="input input-bordered input-xs bg-white"
                  placeholder="Vendor name"
                  value={invoiceVendor}
                  onChange={(e) => setInvoiceVendor(e.target.value)}
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input input-bordered input-xs bg-white"
                  placeholder="Invoice amount"
                  value={invoiceAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setInvoiceAmount("");
                      return;
                    }
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 0) return;
                    setInvoiceAmount(v);
                  }}
                />
              </div>
              <input
                type="file"
                className="file-input file-input-bordered file-input-xs w-full"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void attachInvoiceFile(file, "draft");
                  e.target.value = "";
                }}
              />
              {draftInvoices.length > 0 ? (
                <ul className="space-y-1 text-xs">
                  {draftInvoices.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">
                        {inv.vendorName} · {inv.fileName}
                        {inv.amount ? ` · ${money(inv.amount)}` : ""}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() =>
                          setDraftInvoices((prev) =>
                            prev.filter((x) => x.id !== inv.id)
                          )
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <button type="submit" className="btn btn-neutral btn-sm">
              Save CapEx draft
            </button>
          </form>
        )}

        {maintenanceCandidates.length > 0 && (
          <div className="rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-3">
            <p className="text-xs font-medium opacity-70">
              From maintenance (major / structural)
            </p>
            <ul className="mt-2 space-y-1">
              {maintenanceCandidates.slice(0, 5).map((wo) => (
                <li
                  key={wo.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">
                    {wo.title} · {wo.property}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => void createFromMaintenance(wo)}
                  >
                    Pull in
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
        {loading && <p className="text-sm opacity-60">Loading CapEx…</p>}
        {msg && !selected && (
          <p className="text-sm text-emerald-800">{msg}</p>
        )}

        {capex.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            className={`w-full rounded-xl border px-3 py-3 text-left ${
              selectedId === c.id
                ? "border-[var(--harbor-mid)] bg-white"
                : "border-[var(--harbor-deep)]/10 bg-white/80"
            }`}
          >
            <p className="font-semibold">{c.title}</p>
            <p className="text-sm opacity-70">
              {c.propertyName} · {money(c.estimatedCost)} · {c.ownerName}
            </p>
            <span className="badge badge-sm mt-1 capitalize">
              {c.status.replaceAll("_", " ")}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 shadow-sm">
        {!selected ? (
          <p className="text-sm opacity-60">
            Select a CapEx item to edit, attach invoices, and send to the owner.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">{selected.title}</h2>
                <p className="text-sm opacity-70">
                  {selected.propertyName} · {selected.source} source
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setSelectedId(null);
                  setMsg(null);
                }}
              >
                Close
              </button>
            </div>

            <label className="form-control">
              <span className="mb-1 text-xs opacity-60">Property</span>
              <select
                className="select select-bordered select-sm bg-white"
                value={selected.propertyId || ""}
                disabled={selected.status === "pending_owner_approval"}
                onChange={(e) => {
                  const prop = propertyOptions.find(
                    (p) => p.id === e.target.value
                  );
                  if (!prop) return;
                  void saveEdits({
                    propertyId: prop.id,
                    propertyName: prop.name,
                    ownerName: prop.ownerName,
                    ownerEmail: prop.ownerEmail,
                    ownerAccountId: prop.ownerAccountId || undefined,
                  });
                }}
              >
                <option value="">Select property</option>
                {propertyOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-[var(--harbor-deep)]/15 bg-[var(--harbor-deep)]/[0.04] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide opacity-55">
                Owner (locked from property)
              </p>
              <p className="text-sm font-medium">
                {selected.ownerName}{" "}
                <span className="font-normal opacity-70">
                  {selected.ownerEmail || "No email"}
                </span>
              </p>
            </div>

            <input
              className="input input-bordered input-sm w-full bg-white"
              value={selected.title}
              onChange={(e) => void saveEdits({ title: e.target.value })}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              className="input input-bordered input-sm w-full bg-white"
              value={selected.estimatedCost}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n) || n < 0) {
                  setMsg("Estimated cost cannot be negative.");
                  return;
                }
                void saveEdits({ estimatedCost: n });
              }}
            />
            <textarea
              className="textarea textarea-bordered textarea-sm min-h-20 w-full bg-white"
              value={selected.description}
              onChange={(e) => void saveEdits({ description: e.target.value })}
            />
            <textarea
              className="textarea textarea-bordered textarea-sm min-h-20 w-full bg-white"
              value={selected.justification}
              onChange={(e) =>
                void saveEdits({ justification: e.target.value })
              }
            />

            <div className="space-y-2 rounded-lg border border-dashed border-[var(--harbor-deep)]/25 p-3">
              <p className="text-xs font-medium opacity-70">
                Vendor invoices for owner review
              </p>
              {(selected.vendorInvoices ?? []).length === 0 ? (
                <p className="text-xs opacity-55">None attached yet.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {(selected.vendorInvoices ?? []).map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>
                        {inv.vendorName} · {inv.fileName}
                        {inv.amount ? ` · ${money(inv.amount)}` : ""}
                      </span>
                      <div className="flex gap-1">
                        {inv.dataUrl ? (
                          <a
                            className="btn btn-ghost btn-xs"
                            href={inv.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Preview
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-red-700"
                          onClick={() =>
                            void saveEdits({
                              vendorInvoices: (
                                selected.vendorInvoices ?? []
                              ).filter((x) => x.id !== inv.id),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="input input-bordered input-xs bg-white"
                  placeholder="Vendor name"
                  value={invoiceVendor}
                  onChange={(e) => setInvoiceVendor(e.target.value)}
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input input-bordered input-xs bg-white"
                  placeholder="Invoice amount"
                  value={invoiceAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setInvoiceAmount("");
                      return;
                    }
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 0) return;
                    setInvoiceAmount(v);
                  }}
                />
              </div>
              <input
                type="file"
                className="file-input file-input-bordered file-input-xs w-full"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void attachInvoiceFile(file, "selected");
                  e.target.value = "";
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm"
                onClick={() => void sendToOwner()}
                disabled={
                  selected.status === "pending_owner_approval" ||
                  selected.status === "cancelled" ||
                  selected.status === "approved_by_owner"
                }
              >
                {selected.status === "pending_owner_approval"
                  ? "Awaiting owner approval"
                  : selected.status === "cancelled"
                    ? "Cancelled"
                    : "Submit to owner portal & email"}
              </button>
              {selected.status === "pending_owner_approval" ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => void cancelSelected()}
                >
                  Cancel request
                </button>
              ) : null}
              {selected.status === "draft" ||
              selected.status === "pending_mgmt_edit" ||
              selected.status === "cancelled" ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm text-red-700"
                  onClick={() => void deleteSelected()}
                >
                  Delete
                </button>
              ) : null}
            </div>

            {selected.emailedTo ? (
              <p className="text-xs opacity-60">
                Routed to {selected.emailedTo}
                {selected.emailedAt
                  ? ` · ${new Date(selected.emailedAt).toLocaleString()}`
                  : ""}
              </p>
            ) : null}

            {selected.ownerRequestMessage && (
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-base-100 p-2 text-xs">
                {selected.ownerRequestMessage}
              </pre>
            )}
            {selected.ownerRespondedAt && (
              <p className="text-sm">
                Owner response ({selected.status.replaceAll("_", " ")}):{" "}
                {selected.ownerResponseNotes || "—"}
                {selected.paymentMethod
                  ? ` · Payment: ${selected.paymentMethod.replaceAll("_", " ")}`
                  : ""}
              </p>
            )}
            {msg && <p className="text-sm text-emerald-800">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
