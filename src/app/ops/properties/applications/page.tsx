import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, LogOut } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import {
  getAwaitingSignatureApplications,
  getPendingOwnerApplications,
} from "@/lib/owner-auth";
import { requireOpsModule } from "@/lib/team-auth";
import {
  AwaitingSignatureCard,
  PendingApplicationCard,
} from "../PendingApplicationCard";

export default async function PendingApplicationsPage() {
  await requireOpsModule("properties");

  const [pending, awaiting] = await Promise.all([
    getPendingOwnerApplications(),
    getAwaitingSignatureApplications(),
  ]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Pending owner applications</p>
          </div>
          <form action={teamLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <Link
          href="/ops/properties"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to properties
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Owner applications
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Review pending requests, request more details, decline, or send a
            management contract for owner signature. Owners sign and pick up
            their temporary password on Check Application Status — no email
            required.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Open for review ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-6 py-12 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-[var(--harbor-mid)] opacity-70" />
              <p className="mt-3 font-medium text-[var(--harbor-ink)]">
                No pending applications
              </p>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                New owner applications from the welcome page will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((application) => (
                <PendingApplicationCard
                  key={application.id}
                  application={application}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Awaiting owner signature ({awaiting.length})
          </h2>
          {awaiting.length === 0 ? (
            <p className="text-sm text-[var(--harbor-ink)]/55">
              Contracts sent for signature will appear here until the owner
              signs on the status page.
            </p>
          ) : (
            <div className="space-y-4">
              {awaiting.map((application) => (
                <AwaitingSignatureCard
                  key={application.id}
                  application={application}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
