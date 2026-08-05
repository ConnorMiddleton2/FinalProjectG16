import Link from "next/link";

type RelatedLink = {
  href: string;
  label: string;
};

type PortalPlaceholderProps = {
  title: string;
  description: string;
  related?: RelatedLink[];
};

export function PortalPlaceholder({
  title,
  description,
  related,
}: PortalPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
          Future tenant portal
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
          {description}
        </p>
      </div>

      <div className="min-h-64 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 p-6">
        <p className="text-sm text-[var(--harbor-ink)]/55">
          Placeholder — routing and navigation only. Feature work comes later.
        </p>
        {related && related.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {related.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="btn btn-outline btn-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
