import type {
  PaymentsDateRangeFilter,
  PaymentsFilters,
  PaymentStatus,
  PaymentType,
} from "@/lib/portal/payments-types";

type Props = {
  filters: PaymentsFilters;
  resultCount: number;
  onChange: (patch: Partial<PaymentsFilters>) => void;
  onReset: () => void;
};

const DATE_OPTIONS: Array<{ value: PaymentsDateRangeFilter; label: string }> = [
  { value: "all", label: "All dates" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "custom", label: "Custom range" },
];

const STATUS_OPTIONS: Array<{ value: "all" | PaymentStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "Paid", label: "Paid" },
  { value: "Due", label: "Due" },
  { value: "Overdue", label: "Overdue" },
  { value: "Processing", label: "Processing" },
];

const TYPE_OPTIONS: Array<{ value: "all" | PaymentType; label: string }> = [
  { value: "all", label: "All types" },
  { value: "Rent", label: "Rent" },
  { value: "Late fee", label: "Late fee" },
  { value: "Fee", label: "Fee" },
  { value: "Credit", label: "Credit" },
  { value: "Deposit", label: "Deposit" },
  { value: "Autopay", label: "Autopay" },
  { value: "Other", label: "Other" },
];

export function PaymentsTransactionFilters({
  filters,
  resultCount,
  onChange,
  onReset,
}: Props) {
  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm"
      aria-labelledby="payments-filters-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2
          id="payments-filters-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Recent transactions
        </h2>
        <p className="text-sm text-[var(--harbor-ink)]/55" aria-live="polite">
          {resultCount} shown
        </p>
      </div>

      <form
        className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="form-control w-full">
          <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
            Date range
          </span>
          <select
            className="select select-bordered w-full"
            value={filters.dateRange}
            onChange={(e) =>
              onChange({
                dateRange: e.target.value as PaymentsDateRangeFilter,
              })
            }
          >
            {DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control w-full">
          <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
            Payment status
          </span>
          <select
            className="select select-bordered w-full"
            value={filters.status}
            onChange={(e) =>
              onChange({
                status: e.target.value as PaymentsFilters["status"],
              })
            }
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control w-full">
          <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
            Payment type
          </span>
          <select
            className="select select-bordered w-full"
            value={filters.type}
            onChange={(e) =>
              onChange({
                type: e.target.value as PaymentsFilters["type"],
              })
            }
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onReset}
          >
            Reset filters
          </button>
        </div>

        {filters.dateRange === "custom" ? (
          <>
            <label className="form-control w-full">
              <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
                From
              </span>
              <input
                type="date"
                className="input input-bordered w-full"
                value={filters.customFrom}
                onChange={(e) => onChange({ customFrom: e.target.value })}
              />
            </label>
            <label className="form-control w-full">
              <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
                To
              </span>
              <input
                type="date"
                className="input input-bordered w-full"
                value={filters.customTo}
                onChange={(e) => onChange({ customTo: e.target.value })}
              />
            </label>
          </>
        ) : null}
      </form>
    </section>
  );
}
