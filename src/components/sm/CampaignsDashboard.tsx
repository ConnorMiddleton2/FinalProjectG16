"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  CAMPAIGN_CHANNELS,
  campaignRoi,
  channelLabel,
  emptyCampaign,
  money,
  seedCampaigns,
  type SmCampaign,
} from "@/lib/sales-marketing";

export function CampaignsDashboard() {
  const {
    items: campaigns,
    saveOne,
    loading,
    error,
  } = useSharedCollection<SmCampaign>(COLLECTIONS.smCampaigns, seedCampaigns);
  const [form, setForm] = useState(emptyCampaign);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const totals = useMemo(() => {
    const cost = campaigns.reduce((s, c) => s + c.cost, 0);
    const revenue = campaigns.reduce((s, c) => s + c.revenueAttributed, 0);
    return { cost, revenue, roi: cost > 0 ? ((revenue - cost) / cost) * 100 : null };
  }, [campaigns]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await saveOne({
      ...form,
      id: crypto.randomUUID(),
      name: form.name.trim(),
    });
    setForm(emptyCampaign());
    setShowForm(false);
    setMsg("Campaign saved to the shared team database.");
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="badge badge-outline px-3 py-3">
            Spend {money(totals.cost)}
          </span>
          <span className="badge badge-outline px-3 py-3">
            Attributed {money(totals.revenue)}
          </span>
          <span className="badge badge-outline px-3 py-3">
            Blended ROI{" "}
            {totals.roi == null ? "—" : `${totals.roi.toFixed(0)}%`}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-neutral btn-sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Hide form" : "Add campaign"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}
      {loading && <p className="text-sm opacity-60">Loading campaigns…</p>}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          <input
            className="input input-bordered input-sm bg-white"
            placeholder="Campaign name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <select
            className="select select-bordered select-sm bg-white"
            value={form.channel}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                channel: e.target.value as SmCampaign["channel"],
              }))
            }
          >
            {CAMPAIGN_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            className="select select-bordered select-sm bg-white"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as SmCampaign["status"],
              }))
            }
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <input
            type="date"
            className="input input-bordered input-sm bg-white"
            value={form.startDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, startDate: e.target.value }))
            }
          />
          <input
            type="date"
            className="input input-bordered input-sm bg-white"
            value={form.endDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, endDate: e.target.value }))
            }
          />
          <input
            type="number"
            className="input input-bordered input-sm bg-white"
            placeholder="Cost"
            value={form.cost || ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, cost: Number(e.target.value) || 0 }))
            }
          />
          <input
            type="number"
            className="input input-bordered input-sm bg-white"
            placeholder="Revenue attributed"
            value={form.revenueAttributed || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                revenueAttributed: Number(e.target.value) || 0,
              }))
            }
          />
          <input
            type="number"
            className="input input-bordered input-sm bg-white"
            placeholder="Leads"
            value={form.leads || ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, leads: Number(e.target.value) || 0 }))
            }
          />
          <input
            className="input input-bordered input-sm bg-white sm:col-span-2"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <button type="submit" className="btn btn-neutral btn-sm">
            Save campaign
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Channel</th>
              <th>Dates</th>
              <th>Cost</th>
              <th>Revenue</th>
              <th>ROI</th>
              <th>Leads</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center opacity-60">
                  No campaigns yet.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => {
                const roi = campaignRoi(c);
                return (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium">{c.name}</p>
                      {c.notes ? (
                        <p className="text-xs opacity-60">{c.notes}</p>
                      ) : null}
                    </td>
                    <td>{channelLabel(c.channel)}</td>
                    <td className="text-sm whitespace-nowrap">
                      {c.startDate || "—"}
                      {c.endDate ? ` → ${c.endDate}` : ""}
                    </td>
                    <td>{money(c.cost)}</td>
                    <td>{money(c.revenueAttributed)}</td>
                    <td
                      className={
                        roi != null && roi >= 0
                          ? "text-emerald-700"
                          : roi != null
                            ? "text-red-700"
                            : ""
                      }
                    >
                      {roi == null ? "—" : `${roi.toFixed(0)}%`}
                    </td>
                    <td>{c.leads}</td>
                    <td>
                      <span className="badge badge-outline capitalize">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
