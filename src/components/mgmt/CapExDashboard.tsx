"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { WorkOrder } from "@/lib/maintenance";
import {
  money,
  seedCapitalExpenditures,
  type CapitalExpenditure,
} from "@/lib/management";

const CATEGORIES: CapitalExpenditure["category"][] = [
  "renovation",
  "addition",
  "major_repair",
  "equipment",
  "other",
];

export function CapExDashboard() {
  const {
    items: capex,
    saveOne,
    loading,
    error,
  } = useSharedCollection<CapitalExpenditure>(
    COLLECTIONS.capitalExpenditures,
    seedCapitalExpenditures
  );
  const { items: workOrders } = useSharedCollection<WorkOrder>(
    COLLECTIONS.workOrders
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    propertyName: "",
    ownerName: "",
    ownerEmail: "",
    category: "renovation" as CapitalExpenditure["category"],
    estimatedCost: "",
    description: "",
    justification: "",
    relatedWorkOrderId: "",
  });

  const selected = capex.find((c) => c.id === selectedId) ?? null;

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

  async function createFromMaintenance(wo: WorkOrder) {
    const item: CapitalExpenditure = {
      id: crypto.randomUUID(),
      title: wo.title,
      propertyName: wo.property,
      ownerName: "Property Owner",
      ownerEmail: "bobowner@building.com",
      category: "major_repair",
      estimatedCost: Number(wo.estimatedCost) || 0,
      description: wo.description,
      justification: `Escalated from maintenance work order ${wo.id}.`,
      source: "maintenance",
      relatedWorkOrderId: wo.id,
      status: "pending_mgmt_edit",
      createdAt: new Date().toISOString(),
    };
    await saveOne(item);
    setSelectedId(item.id);
    setMsg("Pulled from maintenance — edit then send to owner.");
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.propertyName.trim()) return;
    const item: CapitalExpenditure = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      propertyName: form.propertyName.trim(),
      ownerName: form.ownerName.trim() || "Owner",
      ownerEmail: form.ownerEmail.trim().toLowerCase(),
      category: form.category,
      estimatedCost: Number(form.estimatedCost) || 0,
      description: form.description.trim(),
      justification: form.justification.trim(),
      source: "management",
      relatedWorkOrderId: form.relatedWorkOrderId || undefined,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    await saveOne(item);
    setShowForm(false);
    setSelectedId(item.id);
    setMsg("CapEx draft created.");
  }

  async function saveEdits(patch: Partial<CapitalExpenditure>) {
    if (!selected) return;
    await saveOne({ ...selected, ...patch });
  }

  async function sendToOwner() {
    if (!selected) return;
    if (!selected.ownerEmail.trim()) {
      setMsg("Owner email required before sending.");
      return;
    }
    const message = `Dear ${selected.ownerName},

Harborline requests Owner approval for a capital expenditure on ${selected.propertyName}:

Project: ${selected.title}
Category: ${selected.category}
Estimated cost: ${money(selected.estimatedCost)}

Description:
${selected.description}

Justification:
${selected.justification}

Please sign in to your Harborline owner portal to approve or decline this CapEx request.

— Harborline Management`;

    await saveOne({
      ...selected,
      status: "pending_owner_approval",
      ownerRequestMessage: message,
    });
    setMsg("CapEx request sent to the owner portal.");
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
            <input
              className="input input-bordered input-sm bg-white"
              placeholder="Property"
              value={form.propertyName}
              onChange={(e) =>
                setForm({ ...form, propertyName: e.target.value })
              }
              required
            />
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
            <input
              className="input input-bordered input-sm bg-white"
              placeholder="Owner name"
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            />
            <input
              className="input input-bordered input-sm bg-white"
              placeholder="Owner email"
              value={form.ownerEmail}
              onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
            />
            <input
              type="number"
              className="input input-bordered input-sm bg-white"
              placeholder="Estimated cost"
              value={form.estimatedCost}
              onChange={(e) =>
                setForm({ ...form, estimatedCost: e.target.value })
              }
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
              {c.propertyName} · {money(c.estimatedCost)}
            </p>
            <span className="badge badge-sm mt-1 capitalize">
              {c.status.replaceAll("_", " ")}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 shadow-sm space-y-3">
        {!selected ? (
          <p className="text-sm opacity-60">
            Select a CapEx item to edit and send to the owner.
          </p>
        ) : (
          <>
            <h2 className="text-xl font-semibold">{selected.title}</h2>
            <p className="text-sm opacity-70">
              {selected.propertyName} · {selected.source} source
            </p>
            <input
              className="input input-bordered input-sm w-full bg-white"
              value={selected.title}
              onChange={(e) => void saveEdits({ title: e.target.value })}
            />
            <input
              type="number"
              className="input input-bordered input-sm w-full bg-white"
              value={selected.estimatedCost}
              onChange={(e) =>
                void saveEdits({
                  estimatedCost: Number(e.target.value) || 0,
                })
              }
            />
            <textarea
              className="textarea textarea-bordered textarea-sm w-full bg-white min-h-20"
              value={selected.description}
              onChange={(e) => void saveEdits({ description: e.target.value })}
            />
            <textarea
              className="textarea textarea-bordered textarea-sm w-full bg-white min-h-20"
              value={selected.justification}
              onChange={(e) =>
                void saveEdits({ justification: e.target.value })
              }
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="input input-bordered input-sm bg-white"
                placeholder="Owner name"
                value={selected.ownerName}
                onChange={(e) => void saveEdits({ ownerName: e.target.value })}
              />
              <input
                className="input input-bordered input-sm bg-white"
                placeholder="Owner email"
                value={selected.ownerEmail}
                onChange={(e) =>
                  void saveEdits({ ownerEmail: e.target.value })
                }
              />
            </div>
            <button
              type="button"
              className="btn btn-neutral btn-sm"
              onClick={() => void sendToOwner()}
              disabled={selected.status === "pending_owner_approval"}
            >
              Send CapEx request to owner
            </button>
            {selected.ownerRequestMessage && (
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-base-100 p-2 text-xs border">
                {selected.ownerRequestMessage}
              </pre>
            )}
            {selected.ownerRespondedAt && (
              <p className="text-sm">
                Owner response ({selected.status}):{" "}
                {selected.ownerResponseNotes || "—"}
              </p>
            )}
            {msg && <p className="text-sm text-emerald-800">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
