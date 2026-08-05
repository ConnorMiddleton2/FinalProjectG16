"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

export function DetailRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2">
      <dt className="opacity-55">{label}</dt>
      <dd
        className={`text-right ${
          emphasize ? "font-semibold tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export function CurrencyInput({
  value,
  onChange,
  placeholder,
  required,
  min = "0.01",
  allowZero,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  allowZero?: boolean;
}) {
  return (
    <div className="flex h-12 w-full items-center rounded-lg border border-base-300 bg-white transition focus-within:border-[var(--harbor-mid)] focus-within:ring-2 focus-within:ring-[var(--harbor-mid)]/25">
      <span className="pl-3 pr-1 text-base font-medium opacity-60">$</span>
      <input
        type="number"
        min={allowZero ? "0" : min}
        step="0.01"
        inputMode="decimal"
        className="h-full w-full flex-1 rounded-r-lg bg-transparent pr-3 text-base tabular-nums outline-none"
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value.replace(/-/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "e" || e.key === "E") {
            e.preventDefault();
          }
        }}
      />
    </div>
  );
}

export function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--harbor-ink)]/55 p-4 sm:p-8">
      <div
        className={`w-full ${
          wide ? "max-w-5xl" : "max-w-3xl"
        } rounded-2xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-sand)] shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--harbor-deep)]/15 px-6 py-4">
          <h2 className="font-display text-2xl leading-tight text-[var(--harbor-ink)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export const apCardClass =
  "rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm";
