import Link from "next/link";
import type { PortalBreadcrumb } from "@/lib/portal/nav";

type Props = {
  items: PortalBreadcrumb[];
};

export function PortalBreadcrumbs({ items }: Props) {
  if (items.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-[var(--harbor-muted)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <span aria-hidden="true" className="px-1 opacity-70">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded px-1 hover:text-[var(--harbor-ink)] portal-focus"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={
                    isLast
                      ? "inline-flex min-h-11 items-center px-1 font-medium text-[var(--harbor-ink)]"
                      : "inline-flex min-h-11 items-center px-1"
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
