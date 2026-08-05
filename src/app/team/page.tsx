import Link from "next/link";
import { ArrowLeft, Building2, KeyRound } from "lucide-react";
import { DEMO_EMPLOYEE } from "@/lib/team-credentials";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function TeamLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-[linear-gradient(165deg,#0b2a32_0%,#134e5a_45%,#1f7a8c_100%)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--harbor-sand)]/85 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to welcome
        </Link>

        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)] p-7 text-[var(--harbor-ink)] shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--harbor-ink)] p-2 text-[var(--harbor-sand)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl leading-tight text-[var(--harbor-ink)]">
                Harborline
              </p>
              <p className="text-sm text-[var(--harbor-ink)]/60">
                Team member access
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--harbor-deep)]/15 bg-white/80 px-4 py-3 text-sm text-[var(--harbor-ink)]">
            <p className="font-semibold">{DEMO_EMPLOYEE.name}</p>
            <p className="mt-1 text-[var(--harbor-ink)]/80">
              Company ID: <strong>{DEMO_EMPLOYEE.companyId}</strong>
            </p>
            <p className="text-[var(--harbor-ink)]/80">
              Password: <strong>{DEMO_EMPLOYEE.password}</strong>
            </p>
          </div>

          <h1 className="mt-6 text-xl font-semibold text-[var(--harbor-ink)]">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-[var(--harbor-ink)]/70">
            Use your work email and HR password. Module access is controlled in
            Human resources. Company ID still works for full admin access.
          </p>

          <form action="/team/login" method="POST" className="mt-6 space-y-4">
            <label className="form-control w-full">
              <span className="mb-1 text-sm font-medium text-[var(--harbor-ink)]/80">
                Email or company ID
              </span>
              <input
                name="email"
                className="input input-bordered w-full border-[var(--harbor-deep)]/20 bg-white text-[var(--harbor-ink)] placeholder:text-[var(--harbor-ink)]/40"
                defaultValue={DEMO_EMPLOYEE.companyId}
                autoComplete="username"
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="mb-1 text-sm font-medium text-[var(--harbor-ink)]/80">
                Password
              </span>
              <input
                name="password"
                type="password"
                className="input input-bordered w-full border-[var(--harbor-deep)]/20 bg-white text-[var(--harbor-ink)] placeholder:text-[var(--harbor-ink)]/40"
                defaultValue={DEMO_EMPLOYEE.password}
                autoComplete="current-password"
                required
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn w-full gap-2 border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)] hover:bg-[var(--harbor-deep)]"
            >
              <KeyRound className="h-4 w-4" />
              Open management system
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
