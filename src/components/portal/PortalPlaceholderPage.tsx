import Link from "next/link";

type Props = {
  actions?: Array<{ href: string; label: string }>;
  detail?: string;
};

/** Shared empty/placeholder content for current-tenant portal routes. */
export function PortalPlaceholderPage({ actions = [], detail }: Props) {
  return (
    <div className="space-y-4">
      {detail ? (
        <p className="text-sm text-[var(--harbor-ink)]/55">
          <span className="sr-only">Detail: </span>
          {detail}
        </p>
      ) : null}

      <section
        className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8"
        aria-labelledby="portal-placeholder-empty-heading"
      >
        <h2
          id="portal-placeholder-empty-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Nothing here yet
        </h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--harbor-ink)]/65">
          This page is a routed placeholder. Loading, success, error, and
          validation states will be added when the feature is built.
        </p>

        {actions.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {actions.map((action) => (
              <li key={action.href}>
                <Link href={action.href} className="btn btn-sm btn-neutral">
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
