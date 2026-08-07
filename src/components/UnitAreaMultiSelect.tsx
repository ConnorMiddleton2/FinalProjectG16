"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  COMMON_PROPERTY_AREAS,
  formatWorkOrderAreas,
  parseWorkOrderAreas,
} from "@/lib/maintenance";

type Props = {
  propertyName: string;
  /** Unit labels from the property roster (suites / units). */
  propertyUnits?: string[];
  value: string;
  onChange: (next: string) => void;
  id?: string;
  disabled?: boolean;
};

/**
 * Multi-select unit / affected-area picker for maintenance work orders.
 * Stores selections as a comma-separated string on WorkOrder.unit.
 */
export function UnitAreaMultiSelect({
  propertyName,
  propertyUnits = [],
  value,
  onChange,
  id = "wo-unit-areas",
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => parseWorkOrderAreas(value), [value]);

  const options = useMemo(() => {
    const units = propertyUnits
      .map((u) => u.trim())
      .filter(Boolean)
      .map((u) => (u.toLowerCase().startsWith("unit") || u.toLowerCase().startsWith("suite") ? u : `Unit ${u}`));
    const merged = [...units, ...COMMON_PROPERTY_AREAS];
    // Keep any custom values already on the work order
    for (const s of selected) {
      if (!merged.some((m) => m.toLowerCase() === s.toLowerCase())) {
        merged.push(s);
      }
    }
    return Array.from(new Set(merged));
  }, [propertyUnits, selected]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(area: string) {
    const has = selected.some((s) => s.toLowerCase() === area.toLowerCase());
    const next = has
      ? selected.filter((s) => s.toLowerCase() !== area.toLowerCase())
      : [...selected, area];
    onChange(formatWorkOrderAreas(next));
  }

  function remove(area: string) {
    onChange(
      formatWorkOrderAreas(
        selected.filter((s) => s.toLowerCase() !== area.toLowerCase())
      )
    );
  }

  const summary =
    selected.length === 0
      ? propertyName
        ? "Select one or more units / areas…"
        : "Select a property first…"
      : `${selected.length} area${selected.length === 1 ? "" : "s"} selected`;

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        id={id}
        disabled={disabled || !propertyName.trim()}
        className="btn btn-outline btn-sm h-auto min-h-10 w-full justify-between gap-2 font-normal"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate text-left opacity-80">{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>

      {selected.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((area) => (
            <span
              key={area}
              className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-xs"
            >
              {area}
              <button
                type="button"
                className="opacity-55 hover:opacity-100"
                aria-label={`Remove ${area}`}
                onClick={() => remove(area)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {open ? (
        <div
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-base-300 bg-base-100 p-2 shadow-lg"
          role="listbox"
          aria-multiselectable="true"
          aria-label="Affected units and areas"
        >
          {propertyUnits.length > 0 ? (
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide opacity-50">
              Units at {propertyName}
            </p>
          ) : null}
          {options.map((area) => {
            const checked = selected.some(
              (s) => s.toLowerCase() === area.toLowerCase()
            );
            const isUnit = propertyUnits.some(
              (u) =>
                area.toLowerCase().includes(u.toLowerCase()) ||
                `unit ${u}`.toLowerCase() === area.toLowerCase() ||
                `suite ${u}`.toLowerCase() === area.toLowerCase()
            );
            const showCommonHeader =
              area === COMMON_PROPERTY_AREAS[0] && propertyUnits.length > 0;
            return (
              <div key={area}>
                {showCommonHeader ? (
                  <p className="mt-2 px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide opacity-50">
                    Common areas
                  </p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-base-200 ${
                    checked ? "bg-base-200/80" : ""
                  }`}
                  onClick={() => toggle(area)}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-[var(--harbor-ink)] bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                        : "border-base-300"
                    }`}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{area}</span>
                  {isUnit ? (
                    <span className="text-[10px] uppercase opacity-45">Unit</span>
                  ) : null}
                </button>
              </div>
            );
          })}
          <p className="mt-1 border-t border-base-200 px-2 pt-2 text-[11px] opacity-55">
            Select every unit or area affected by this request.
          </p>
        </div>
      ) : null}
    </div>
  );
}
