import Link from "next/link";
import type { ReactNode } from "react";
import { PortalCard } from "@/components/portal/PortalCard";

type Props = {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Section heading + card wrapper used across tenant portal pages. */
export function PortalSection({
  title,
  description,
  href,
  linkLabel = "View all",
  action,
  children,
  className = "",
  id,
}: Props) {
  const headingId =
    id ?? `portal-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <PortalCard className={className} as="section" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id={headingId} className="portal-section-title">
            {title}
          </h2>
          {description ? (
            <p className="text-sm portal-muted">{description}</p>
          ) : null}
        </div>
        {action ? (
          action
        ) : href ? (
          <Link
            href={href}
            className="shrink-0 text-sm font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline portal-focus rounded"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </PortalCard>
  );
}
