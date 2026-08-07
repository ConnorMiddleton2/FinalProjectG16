"use client";

import { useId, useMemo, type ReactNode } from "react";

const CHART_COLORS = [
  "#0F3D3E",
  "#0D9488",
  "#14B8A6",
  "#475569",
  "#0F766E",
  "#64748B",
  "#99F6E4",
  "#334155",
];

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--harbor-border)] bg-[var(--harbor-card)] p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">{title}</h3>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-[var(--harbor-ink)]/55">{subtitle}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function HorizontalBarChart({
  rows,
  formatValue,
  maxValue,
}: {
  rows: { id: string; label: string; value: number; color?: string }[];
  formatValue?: (n: number) => string;
  maxValue?: number;
}) {
  const peak = Math.max(1, maxValue ?? Math.max(0, ...rows.map((r) => r.value)));
  const fmt = formatValue ?? ((n: number) => n.toLocaleString());

  if (rows.length === 0) {
    return <p className="text-sm opacity-55">No data to chart.</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row, i) => (
        <li key={row.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate font-medium text-[var(--harbor-ink)]/80">
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums opacity-60">{fmt(row.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--harbor-deep)]/8">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${Math.min(100, (row.value / peak) * 100)}%`,
                background: row.color ?? CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GroupedBarChart({
  categories,
  series,
  formatValue,
  height = 160,
}: {
  categories: string[];
  series: { key: string; label: string; color: string; values: number[] }[];
  formatValue?: (n: number) => string;
  height?: number;
}) {
  const peak = Math.max(
    1,
    ...series.flatMap((s) => s.values),
  );
  const fmt = formatValue ?? ((n: number) => String(n));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-[var(--harbor-ink)]/60">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
      <div
        className="grid items-end gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, categories.length)}, minmax(0, 1fr))`,
          height,
        }}
      >
        {categories.map((cat, i) => (
          <div key={cat} className="flex h-full flex-col items-center justify-end gap-1">
            <div className="flex w-full flex-1 items-end justify-center gap-1 px-0.5">
              {series.map((s) => {
                const v = s.values[i] ?? 0;
                const h = Math.max(v > 0 ? 4 : 0, (v / peak) * 100);
                return (
                  <div
                    key={s.key}
                    className="w-[40%] max-w-6 rounded-t-md"
                    style={{ height: `${h}%`, background: s.color }}
                    title={`${s.label}: ${fmt(v)}`}
                  />
                );
              })}
            </div>
            <p className="w-full truncate text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/50">
              {cat}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

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

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
  formatValue,
}: {
  slices: { id: string; label: string; value: number; color?: string }[];
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (n: number) => string;
}) {
  const titleId = useId();
  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((s, r) => s + r.value, 0);
  const fmt = formatValue ?? ((n: number) => n.toLocaleString());

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    let angle = 0;
    return positive.map((s, i) => {
      const sweep = (s.value / total) * 360;
      const start = angle;
      const end = angle + Math.max(sweep, 0.5);
      angle = end;
      return {
        ...s,
        start,
        end,
        color: s.color ?? CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  }, [positive, total]);

  const cx = 80;
  const cy = 80;
  const rOuter = 70;
  const rInner = 42;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg
        viewBox="0 0 160 160"
        className="h-40 w-40 shrink-0"
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>Distribution chart</title>
        {total <= 0 ? (
          <circle cx={cx} cy={cy} r={rOuter} fill="var(--harbor-deep)" opacity={0.08} />
        ) : (
          arcs.map((a) => (
            <path
              key={a.id}
              d={arcPath(cx, cy, rOuter, rInner, a.start, a.end)}
              fill={a.color}
            />
          ))
        )}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-[var(--harbor-ink)] text-[11px] font-semibold"
        >
          {centerValue ?? (total > 0 ? fmt(total) : "—")}
        </text>
        {centerLabel ? (
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            className="fill-[var(--harbor-ink)] text-[8px] opacity-55"
          >
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <ul className="w-full space-y-1.5 text-xs">
        {slices.map((s, i) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: s.color ?? CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 tabular-nums opacity-60">{fmt(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
