"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Building2, KeyRound } from "lucide-react";
import { DEMO_EMPLOYEE } from "@/lib/team-credentials";
import { teamLogin, type TeamLoginState } from "./actions";

const initialState: TeamLoginState = {};

export default function TeamLoginPage() {
  const [state, formAction, pending] = useActionState(teamLogin, initialState);
  const [companyId, setCompanyId] = useState<string>(DEMO_EMPLOYEE.companyId);
  const [password, setPassword] = useState<string>(DEMO_EMPLOYEE.password);

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

          <div className="mt-5 rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-3 text-sm text-[var(--harbor-ink)]">
            <p className="font-semibold">{DEMO_EMPLOYEE.name}</p>
            <p className="mt-1 text-[var(--harbor-ink)]/80">
              Company ID: <strong>{DEMO_EMPLOYEE.companyId}</strong>
            </p>
            <p className="text-[var(--harbor-ink)]/80">
              Password: <strong>{DEMO_EMPLOYEE.password}</strong>
            </p>
          </div>

          <h1 className="mt-6 text-xl font-semibold text-[var(--harbor-ink)]">
            Enter company credentials
          </h1>
          <p className="mt-2 text-sm text-[var(--harbor-ink)]/70">
            Use the employee credentials above to open the background management
            system.
          </p>

          <form action={formAction} className="mt-6 space-y-4">
            <label className="form-control w-full">
              <span className="mb-1 text-sm font-medium text-[var(--harbor-ink)]/80">
                Company ID
              </span>
              <input
                name="companyId"
                className="input input-bordered w-full border-[var(--harbor-deep)]/20 bg-white text-[var(--harbor-ink)] placeholder:text-[var(--harbor-ink)]/40"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                autoComplete="organization"
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="mb-1 text-sm font-medium text-[var(--harbor-ink)]/80">
                Password
              </span>
              <input
                name="password"
                type="text"
                className="input input-bordered w-full border-[var(--harbor-deep)]/20 bg-white text-[var(--harbor-ink)] placeholder:text-[var(--harbor-ink)]/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {state.error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              className="btn w-full gap-2 border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)] hover:bg-[var(--harbor-deep)]"
              disabled={pending}
            >
              <KeyRound className="h-4 w-4" />
              {pending ? "Checking…" : "Open management system"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
