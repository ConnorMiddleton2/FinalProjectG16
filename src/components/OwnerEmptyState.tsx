import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type OwnerEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

export function OwnerEmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  className = "",
}: OwnerEmptyStateProps) {
  return (
    <div
      className={`owner-card flex flex-col items-center px-6 py-12 text-center ${className}`}
    >
      <div className="rounded-2xl bg-[var(--harbor-ink)] p-3 text-[var(--harbor-sand)]">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--harbor-ink)]">
        {title}
      </h3>
      <p className="owner-muted mt-2 max-w-md text-sm leading-relaxed">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="owner-btn-primary owner-btn-primary-sm mt-5">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
