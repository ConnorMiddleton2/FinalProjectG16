"use client";

import Link from "next/link";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { softPropertyNamesMatch } from "@/lib/tenants";

/** Resolve a unique managed_properties id for a display name (no ambiguous matches). */
export function resolveUniqueManagedPropertyId(
  properties: ManagementContractDraft[],
  propertyName: string
): string | null {
  const name = propertyName.trim();
  if (!name) return null;
  const matches = properties.filter((p) =>
    softPropertyNamesMatch(p.propertyName, name)
  );
  return matches.length === 1 ? matches[0].id : null;
}

const linkClass =
  "text-[var(--harbor-mid)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]";

type Props = {
  propertyName: string;
  propertyId?: string | null;
  className?: string;
  title?: string;
};

/** Link only when a stable managed_properties id is provided — never invent from name alone. */
export function ManagedPropertyLink({
  propertyName,
  propertyId,
  className = "",
  title,
}: Props) {
  const label = propertyName || "—";
  if (!propertyId) {
    return (
      <span className={className} title={title ?? label}>
        {label}
      </span>
    );
  }
  return (
    <Link
      href={`/ops/properties/${encodeURIComponent(propertyId)}`}
      className={`${linkClass} ${className}`}
      title={title ?? `Open property detail for ${label}`}
      aria-label={`Open property detail for ${label}`}
    >
      {label}
    </Link>
  );
}
