"use client";

import { useId, useMemo, useState } from "react";
import {
  COMPOSITION_METRICS,
  buildCompositionSlices,
  type CompositionMetric,
  type CompositionSlice,
} from "@/lib/portfolio-insights";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { formatMetricCurrency } from "@/lib/management-contract";
import type { LivePortfolioMetrics } from "@/lib/property-live-metrics";

type Props = {
  contracts: ManagementContractDraft[];
  live: LivePortfolioMetrics;
  onSelectProperty: (propertyId: string) => void;
};

function formatSliceValue(metric: CompositionMetric, value: number): string {
  switch (metric) {
    case "rentRoll":
    case "ar":
      if (value <= 0) return "$0";
      return formatMetricCurrency(value, "$0");
    case "liveOccupancy":
      return `${value.toFixed(0)}%`;
    case "tenantCount":
    case "occupiedUnits":
    case "vacantUnits":
      return value.toLocaleString();
    default:
      return String(value);
  }
}

/** Polar → cartesian for SVG donut arcs. */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const o1 = polar(cx, cy, rOuter, startAngle);
  const o2 = polar(cx, cy, rOuter, endAngle);
  const i1 = polar(cx, cy, rInner, endAngle);
  const i2 = polar(cx, cy, rInner, startAngle);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ");
}

export function PortfolioCompositionChart({
  contracts,
  live,
  onSelectProperty,
}: Props) {
  const [metric, setMetric] = useState<CompositionMetric>("tenantCount");
  const [activeId, setActiveId] = useState<string | null>(null);
  const titleId = useId();
  const descId = useId();

  const slices = useMemo(
    () => buildCompositionSlices(contracts, metric, live),
    [contracts, metric, live]
  );

  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((s, r) => s + r.value, 0);

  const arcs = useMemo(() => {
    if (total <= 0) return [] as (CompositionSlice & { start: number; end: number })[];
    let angle = 0;
    return positive.map((s) => {
      const sweep = (s.value / total) * 360;
      const start = angle;
      const end = angle + Math.max(sweep, 0.5);
      angle = end;
      return { ...s, start, end };
    });
  }, [positive, total]);

  const active = slices.find((s) => s.id === activeId) ?? null;
  const metricMeta = COMPOSITION_METRICS.find((m) => m.value === metric);

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm"
      aria-labelledby={titleId}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id={titleId}
            className="text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/70"
          >
            Portfolio composition
          </h2>
          <p id={descId} className="text-xs text-[var(--harbor-ink)]/50">
            Interactive share by property. Hover or focus a segment; click to
            open property detail.
          </p>
        </div>
        <label className="form-control w-full max-w-xs">
          <span className="label-text text-xs opacity-60">Metric</span>
          <select
            className="select select-bordered select-sm bg-white"
            value={metric}
            onChange={(e) => {
              setMetric(e.target.value as CompositionMetric);
              setActiveId(null);
            }}
            aria-describedby={descId}
          >
            {COMPOSITION_METRICS.map((m) => (
              <option key={m.value} value={m.value} title={m.hint}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_1fr] md:items-center">
        <div className="mx-auto w-full max-w-[14rem]">
          {total <= 0 ? (
            <div className="flex aspect-square items-center justify-center rounded-full border border-dashed border-base-300 text-center text-xs opacity-60">
              No values entered for this metric
            </div>
          ) : (
            <svg
              viewBox="0 0 120 120"
              className="h-auto w-full"
              role="img"
              aria-labelledby={titleId}
            >
              <title>{metricMeta?.label ?? "Portfolio composition"}</title>
              {arcs.map((s) => (
                <path
                  key={s.id}
                  d={arcPath(60, 60, 54, 32, s.start, s.end)}
                  fill={s.color}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.label}: ${formatSliceValue(metric, s.value)}, ${s.percent.toFixed(1)}% of portfolio`}
                  className={`cursor-pointer outline-none transition ${
                    activeId === s.id
                      ? "opacity-100 stroke-white stroke-2"
                      : activeId
                        ? "opacity-45"
                        : "opacity-95 hover:opacity-100"
                  }`}
                  onMouseEnter={() => setActiveId(s.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(s.id)}
                  onBlur={() => setActiveId(null)}
                  onClick={() => onSelectProperty(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectProperty(s.id);
                    }
                  }}
                />
              ))}
              <circle cx="60" cy="60" r="28" fill="white" />
              <text
                x="60"
                y="58"
                textAnchor="middle"
                className="fill-[var(--harbor-ink)]"
                style={{ fontSize: "7px" }}
              >
                {active ? active.label.slice(0, 16) : "Portfolio"}
              </text>
              <text
                x="60"
                y="68"
                textAnchor="middle"
                className="fill-[var(--harbor-ink)] opacity-70"
                style={{ fontSize: "6px" }}
              >
                {active
                  ? `${active.percent.toFixed(0)}%`
                  : formatSliceValue(metric, total)}
              </text>
            </svg>
          )}
        </div>

        <div>
          {active && (
            <div className="mb-3 rounded-lg border border-[var(--harbor-mid)]/30 bg-[var(--harbor-mid)]/5 px-3 py-2 text-sm">
              <p className="font-semibold text-[var(--harbor-ink)]">
                {active.label}
              </p>
              <p className="text-xs opacity-70">
                {formatSliceValue(metric, active.value)} ·{" "}
                {active.percent.toFixed(1)}% of portfolio
              </p>
            </div>
          )}
          <ul className="space-y-1.5" aria-label="Composition legend">
            {slices.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-base-200 ${
                    activeId === s.id ? "bg-base-200" : ""
                  }`}
                  onMouseEnter={() => setActiveId(s.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(s.id)}
                  onBlur={() => setActiveId(null)}
                  onClick={() => onSelectProperty(s.id)}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {s.label}
                  </span>
                  <span className="shrink-0 opacity-70">
                    {formatSliceValue(metric, s.value)}
                  </span>
                  <span className="w-10 shrink-0 text-right opacity-55">
                    {s.value > 0 ? `${s.percent.toFixed(0)}%` : "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {metricMeta && (
            <p className="mt-2 text-[10px] opacity-50">{metricMeta.hint}</p>
          )}
        </div>
      </div>
    </section>
  );
}
