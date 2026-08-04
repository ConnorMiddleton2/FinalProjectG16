"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Building2, KeyRound } from "lucide-react";
import { teamLogin, type TeamLoginState } from "./actions";

const initialState: TeamLoginState = {};

export default function TeamLoginPage() {
  const [state, formAction, pending] = useActionState(teamLogin, initialState);

  return (
    <main className="min-h-screen bg-[linear-gradient(165deg,#0b2a32_0%,#134e5a_45%,#1f7a8c_100%)] text-[var(--harbor-sand)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100">
          <ArrowLeft className="h-4 w-4" />
          Back to welcome
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-7 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--harbor-sand)] p-2 text-[var(--harbor-ink)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl leading-tight">Harborline</p>
              <p className="text-sm opacity-70">Team member access</p>
            </div>
          </div>

          <h1 className="mt-6 text-xl font-semibold">Enter company credentials</h1>
          <p className="mt-2 text-sm opacity-75">
            Background management is restricted to Harborline staff. Use your
            company ID and shared team password.
          </p>

          <form action={formAction} className="mt-6 space-y-4">
            <label className="form-control w-full">
              <span className="mb-1 text-sm opacity-80">Company ID</span>
              <input
                name="companyId"
                className="input input-bordered w-full bg-white text-[var(--harbor-ink)]"
                placeholder="HARBORLINE"
                autoComplete="organization"
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="mb-1 text-sm opacity-80">Password</span>
              <input
                name="password"
                type="password"
                className="input input-bordered w-full bg-white text-[var(--harbor-ink)]"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            {state.error && (
              <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              className="btn w-full gap-2 border-0 bg-[var(--harbor-sand)] text-[var(--harbor-ink)] hover:bg-white"
              disabled={pending}
            >
              <KeyRound className="h-4 w-4" />
              {pending ? "Checking…" : "Open management system"}
            </button>
          </form>

          <p className="mt-5 text-xs opacity-60">
            Demo credentials for class use: company ID <strong>HARBORLINE</strong>,
            password <strong>harborline2026</strong>
          </p>
        </div>
      </div>
    </main>
  );
}
