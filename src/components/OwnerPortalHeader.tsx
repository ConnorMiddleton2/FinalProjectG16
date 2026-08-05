import Link from "next/link";
import { FileText, LogOut, type LucideIcon } from "lucide-react";
import { ownerLogout } from "@/app/owners/actions";

export function OwnerPortalHeader({
  subtitle,
  pendingApprovals = 0,
}: {
  subtitle: string;
  pendingApprovals?: number;
}) {
  return (
    <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)] print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="font-display text-2xl leading-tight">Harborline</p>
          <p className="text-xs opacity-70">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <HeaderNavLink href="/owners/dashboard/contracts" icon={FileText}>
            Contracts
          </HeaderNavLink>
          <HeaderNavLink href="/owners/dashboard/approvals" icon={null}>
            Approvals
            {pendingApprovals > 0 ? (
              <span className="badge badge-warning badge-sm">
                {pendingApprovals}
              </span>
            ) : null}
          </HeaderNavLink>
          <form action={ownerLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function HeaderNavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon | null;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </Link>
  );
}
