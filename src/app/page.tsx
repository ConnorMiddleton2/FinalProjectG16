import Link from "next/link";
import { Building2, KeyRound, Landmark, Users } from "lucide-react";

export default function WelcomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 welcome-wash"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 70% 20%, rgba(31,122,140,0.28), transparent 55%), radial-gradient(ellipse 60% 50% at 10% 80%, rgba(240,194,122,0.22), transparent 45%), linear-gradient(160deg, #f3efe6 0%, #d7eef2 42%, #134e5a 100%)",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-[55%] hidden md:block welcome-drift"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,42,50,0.08), rgba(11,42,50,0.55)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 900'%3E%3Crect fill='%230b2a32' width='800' height='900'/%3E%3Cpath fill='%23134e5a' d='M0 520c80-40 140-20 220 10s160 40 240 10 140-50 220-30v390H0z'/%3E%3Cpath fill='%231f7a8c' d='M0 610c90-30 150 0 230 20s150 10 230-15 150-20 220 5v280H0z'/%3E%3Ccircle fill='%23f0c27a' cx='620' cy='180' r='48' opacity='.7'/%3E%3C/svg%3E\") center/cover no-repeat",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 md:px-10">
        <div className="absolute right-6 top-6 md:right-10 md:top-10">
          <Link
            href="/tasks"
            className="inline-flex items-center justify-center rounded-xl border border-[#8aa3b5]/55 bg-[#b7c9d6] px-5 py-2.5 text-sm font-semibold text-[#2f4556] shadow-[0_1px_2px_rgba(47,69,86,0.10)] transition hover:-translate-y-0.5 hover:bg-[#a9bdcd]"
          >
            Tasks
          </Link>
        </div>

        <div className="max-w-xl welcome-rise">
          <p className="font-display text-5xl sm:text-6xl md:text-7xl tracking-tight text-[var(--harbor-ink)]">
            Harborline
          </p>
          <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-[var(--harbor-deep)] leading-snug">
            Property management built around clear leases and clean cash flow.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[var(--harbor-ink)]/75 max-w-md">
            Whether you are looking for commercial space, own the asset, or run
            the portfolio behind the scenes, start with the path that matches
            your role.
          </p>
        </div>

        <div className="mt-10 grid gap-4 max-w-3xl sm:grid-cols-2 lg:grid-cols-3 welcome-rise-delay">
          <Link
            href="/portal"
            className="group rounded-2xl bg-[var(--harbor-ink)] text-[var(--harbor-sand)] px-6 py-5 shadow-lg transition hover:-translate-y-0.5 hover:bg-[var(--harbor-deep)]"
          >
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-6 w-6 shrink-0 opacity-90" />
              <div>
                <p className="text-lg font-semibold leading-tight">
                  I am a tenant or future tenant
                </p>
                <p className="mt-1 text-sm opacity-75">
                  Apply for a property, manage contracts, and handle billing.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/owners"
            className="group rounded-2xl bg-[var(--harbor-sand)] text-[var(--harbor-ink)] border border-[var(--harbor-deep)]/15 px-6 py-5 shadow-lg transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]"
          >
            <div className="flex items-start gap-3">
              <Landmark className="mt-0.5 h-6 w-6 shrink-0 text-[var(--harbor-mid)]" />
              <div>
                <p className="text-lg font-semibold leading-tight">
                  Property owner
                </p>
                <p className="mt-1 text-sm opacity-70">
                  Log in with your Harborline account, or apply for owner access.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/team"
            className="group rounded-2xl bg-[var(--harbor-sand)] text-[var(--harbor-ink)] border border-[var(--harbor-deep)]/15 px-6 py-5 shadow-lg transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)] sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-6 w-6 shrink-0 text-[var(--harbor-mid)]" />
              <div>
                <p className="text-lg font-semibold leading-tight">Team member</p>
                <p className="mt-1 text-sm opacity-70">
                  Enter your company ID to open the management system.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <p className="mt-8 flex items-center gap-2 text-sm text-[var(--harbor-ink)]/55 welcome-rise-delay">
          <Building2 className="h-4 w-4" />
          Harborline Property Management · ACCY 628 · Group 16
        </p>
      </div>
    </main>
  );
}
