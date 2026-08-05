import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/portal" className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--harbor-ink)] p-2 text-[var(--harbor-sand)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl leading-tight">Harborline</p>
              <p className="text-xs opacity-60">Find your next Harborline space</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            <Link
              href="/portal/units/saved"
              className="btn btn-ghost btn-sm gap-1"
              aria-label="View saved units"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Saved units</span>
            </Link>
            <Link
              href="/portal/messages"
              className="btn btn-ghost btn-sm gap-1"
              aria-label="Contact the leasing team"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Contact leasing</span>
            </Link>
            <Link href="/login" className="btn btn-outline btn-sm">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-neutral btn-sm gap-1">
              <UserPlus className="hidden h-4 w-4 sm:block" />
              Create account
            </Link>
          </div>
        </div>
      </header>

      <PortalNav />

      <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">{children}</main>

      <footer className="mt-10 border-t border-[var(--harbor-deep)]/10 bg-white/35">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-[var(--harbor-ink)]/65 sm:flex-row sm:items-center sm:justify-between">
          <p>Harborline leasing · Discover, apply, and prepare for move-in.</p>
          <Link href="/" className="inline-flex items-center gap-1 hover:text-[var(--harbor-ink)]">
            <ArrowLeft className="h-4 w-4" />
            Return to public site
          </Link>
        </div>
      </footer>
    </div>
  );
}
