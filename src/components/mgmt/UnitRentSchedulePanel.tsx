"use client";

import { useMemo, useState } from "react";
import type { OwnerApplication } from "@/lib/owner-auth";
import {
  buildUnitRentSchedule,
  money,
  summarizeSchedule,
  type PropertyUnitRentSchedule,
  type UnitRentLine,
} from "@/lib/fair-market-rent";
import { publishOwnerAppUnitRents } from "@/app/ops/management/owner-applications/actions";

export function UnitRentSchedulePanel({
  application,
  onSaved,
}: {
  application: OwnerApplication;
  onSaved: (next: OwnerApplication) => void;
}) {
  const [schedules, setSchedules] = useState<PropertyUnitRentSchedule[]>(
    application.unitRentSchedules ?? []
  );
  const [selectedProp, setSelectedProp] = useState(0);
  const [previewLimit, setPreviewLimit] = useState(12);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const active = schedules[selectedProp] ?? null;
  const planSummary = useMemo(
    () => (active ? summarizeSchedule(active) : []),
    [active]
  );

  function generate() {
    setErr(null);
    if (!application.inspected) {
      setErr("Mark the application as inspected before running FMR pricing.");
      return;
    }
    const next = application.properties.map((property, propertyIndex) =>
      buildUnitRentSchedule({
        property,
        propertyIndex,
        inspected: application.inspected,
      })
    );
    setSchedules(next);
    setSelectedProp(0);
    setMsg(
      `Generated fair-market rents for ${next.reduce((s, x) => s + x.unitCount, 0)} units across ${next.length} properties.`
    );
  }

  function updateAsking(unitId: string, askingRent: number) {
    setSchedules((rows) =>
      rows.map((sched, idx) => {
        if (idx !== selectedProp) return sched;
        const units = sched.units.map((u) =>
          u.id === unitId
            ? {
                ...u,
                askingRent,
                rentPerSfMo:
                  u.sqft > 0 ? Math.round((askingRent / u.sqft) * 100) / 100 : 0,
              }
            : u
        );
        const gprAtAsking = Math.round(
          units.reduce((s, u) => s + u.askingRent, 0) * 100
        ) / 100;
        const variancePct =
          sched.ownerReportedRentRoll > 0
            ? Math.round(
                ((gprAtAsking - sched.ownerReportedRentRoll) /
                  sched.ownerReportedRentRoll) *
                  10000
              ) / 100
            : 0;
        return { ...sched, units, gprAtAsking, variancePct };
      })
    );
  }

  function applyPlanAsking(plan: string, asking: number) {
    setSchedules((rows) =>
      rows.map((sched, idx) => {
        if (idx !== selectedProp) return sched;
        const units = sched.units.map((u) =>
          u.floorPlan === plan
            ? {
                ...u,
                askingRent: asking,
                rentPerSfMo:
                  u.sqft > 0 ? Math.round((asking / u.sqft) * 100) / 100 : 0,
              }
            : u
        );
        const gprAtAsking =
          Math.round(units.reduce((s, u) => s + u.askingRent, 0) * 100) / 100;
        const variancePct =
          sched.ownerReportedRentRoll > 0
            ? Math.round(
                ((gprAtAsking - sched.ownerReportedRentRoll) /
                  sched.ownerReportedRentRoll) *
                  10000
              ) / 100
            : 0;
        return { ...sched, units, gprAtAsking, variancePct };
      })
    );
  }

  async function publish() {
    if (schedules.length === 0) {
      setErr("Generate the FMR schedule first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const result = await publishOwnerAppUnitRents({
        applicationId: application.id,
        schedules,
      });
      if ("error" in result) {
        setErr(result.error ?? "Could not publish rents.");
        return;
      }
      const next: OwnerApplication = {
        ...application,
        unitRentSchedules: result.schedules,
        rentScheduleConfirmedAt: new Date().toISOString(),
        contractPropertyIds: result.propertyIds,
      };
      onSaved(next);
      setSchedules(result.schedules);
      setMsg(
        `Published ${result.unitCount} vacant units with asking rents into leasing inventory. Prospects can apply; approved move-ins bill at these rents.`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-base-200 pt-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            Fair-market unit rent schedule
          </p>
          <p className="text-xs opacity-65">
            After inspection, Harborline prices each unit from market comps
            ($/SF and floor-plan mix), confirms asking rent, and publishes vacant
            inventory so leasing → move-in → AR billing use the same numbers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={generate}
            disabled={busy}
          >
            Run FMR calculation
          </button>
          <button
            type="button"
            className="btn btn-neutral btn-xs"
            onClick={() => void publish()}
            disabled={busy || schedules.length === 0}
          >
            {busy ? "Publishing…" : "Publish rents to leasing"}
          </button>
        </div>
      </div>

      {msg ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {err}
        </p>
      ) : null}

      {schedules.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1">
            {schedules.map((s, i) => (
              <button
                key={s.propertyName + i}
                type="button"
                className={`btn btn-xs ${selectedProp === i ? "btn-neutral" : "btn-ghost"}`}
                onClick={() => setSelectedProp(i)}
              >
                {s.propertyName}
              </button>
            ))}
          </div>

          {active ? (
            <div className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 p-3">
              <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="opacity-55">Market comps</p>
                  <p className="font-medium">{active.marketLabel}</p>
                </div>
                <div>
                  <p className="opacity-55">Method</p>
                  <p className="font-medium">{active.method}</p>
                </div>
                <div>
                  <p className="opacity-55">GPR at asking</p>
                  <p className="font-medium">{money(active.gprAtAsking)}</p>
                </div>
                <div>
                  <p className="opacity-55">vs owner rent roll</p>
                  <p className="font-medium">
                    {active.ownerReportedRentRoll
                      ? `${active.variancePct > 0 ? "+" : ""}${active.variancePct}% (${money(active.ownerReportedRentRoll)})`
                      : "Owner roll not provided"}
                  </p>
                </div>
              </div>
              <p className="text-[11px] opacity-60">
                Comps: {active.compsUsed.join(" · ")}
              </p>

              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>Floor plan</th>
                      <th># units</th>
                      <th>Avg FMR</th>
                      <th>Set asking (all of plan)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planSummary.map((row) => (
                      <tr key={row.plan}>
                        <td>{row.plan}</td>
                        <td>{row.count}</td>
                        <td>{money(row.avgFmr)}</td>
                        <td>
                          <input
                            type="number"
                            className="input input-bordered input-xs w-28 bg-white"
                            defaultValue={Math.round(row.avgAsk)}
                            onBlur={(e) =>
                              applyPlanAsking(
                                row.plan,
                                Number(e.target.value) || row.avgAsk
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">
                  Unit detail preview ({Math.min(previewLimit, active.units.length)} of{" "}
                  {active.units.length})
                </p>
                {active.units.length > previewLimit ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setPreviewLimit((n) => n + 24)}
                  >
                    Show more
                  </button>
                ) : null}
              </div>

              <div className="max-h-64 overflow-auto rounded-lg border border-base-200 bg-white">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Plan</th>
                      <th>SF</th>
                      <th>FMR</th>
                      <th>Asking</th>
                      <th>$/SF/mo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.units.slice(0, previewLimit).map((u: UnitRentLine) => (
                      <tr key={u.id}>
                        <td>{u.unit}</td>
                        <td>{u.floorPlan}</td>
                        <td>{u.sqft}</td>
                        <td>{money(u.fairMarketRent)}</td>
                        <td>
                          <input
                            type="number"
                            className="input input-bordered input-xs w-24 bg-white"
                            value={u.askingRent}
                            onChange={(e) =>
                              updateAsking(
                                u.id,
                                Number(e.target.value) || 0
                              )
                            }
                          />
                        </td>
                        <td>{u.rentPerSfMo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {active.publishedAt ? (
                <p className="text-xs text-emerald-800">
                  Published {new Date(active.publishedAt).toLocaleString()} ·
                  property id {active.managedPropertyId || "—"}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-xs opacity-60">
          No schedule yet. Confirm inspection, then run FMR calculation.
        </p>
      )}
    </div>
  );
}
