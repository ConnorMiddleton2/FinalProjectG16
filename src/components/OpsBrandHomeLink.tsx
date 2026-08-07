import Link from "next/link";
import { COMPANY_SHORT } from "@/lib/brand";

/** Ops department header brand mark — links home, same visual as plain CPMC text. */
export function OpsBrandHomeLink({
  subtitle,
}: {
  subtitle?: string;
}) {
  return (
    <Link
      href="/ops"
      className="block min-w-0 rounded-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-glow)]"
      aria-label={`${COMPANY_SHORT} operations home`}
    >
      <p className="font-display text-2xl leading-tight">{COMPANY_SHORT}</p>
      {subtitle ? <p className="text-xs opacity-70">{subtitle}</p> : null}
    </Link>
  );
}
