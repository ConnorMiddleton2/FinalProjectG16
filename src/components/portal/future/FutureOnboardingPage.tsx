"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { MoveInTask } from "@/lib/portal/future/models";
import { getTasks, toggleTask } from "@/lib/portal/future/services";

function OnboardingInner({ session }: { session: PortalTenantSession }) {
  const [tasks, setTasks] = useState<MoveInTask[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getTasks(session.userId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        setStatus("error");
        return;
      }
      setTasks(result.data);
      setStatus(result.data.length ? "ready" : "empty");
    });
    return () => {
      cancelled = true;
    };
  }, [session.userId]);

  const requiredComplete = useMemo(() => {
    const required = tasks.filter((t) => t.required);
    return required.length > 0 && required.every((t) => t.complete);
  }, [tasks]);

  async function onToggle(task: MoveInTask) {
    setBusyId(task.id);
    const result = await toggleTask(session.userId, task.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setTasks(result.data);
  }

  if (status === "loading") {
    return <p className="text-sm text-[var(--harbor-muted)]" role="status">Loading onboarding…</p>;
  }
  if (status === "error") {
    return <p className="portal-empty text-error" role="alert">{error}</p>;
  }
  if (status === "empty") {
    return <p className="portal-empty">No move-in tasks yet.</p>;
  }

  return (
    <div className="space-y-4">
      <PortalCard className="space-y-3">
        <h2 className="portal-section-title">Move-in checklist</h2>
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--harbor-deep)]/10 p-3"
            >
              <div className="min-w-0 space-y-1">
                <label className="flex items-start gap-3 text-sm text-[var(--harbor-ink)]">
                  <input
                    type="checkbox"
                    className="checkbox mt-0.5"
                    checked={task.complete}
                    disabled={busyId === task.id}
                    onChange={() => void onToggle(task)}
                  />
                  <span>
                    <span className="font-medium">{task.label}</span>
                    {task.required ? (
                      <span className="ml-2 text-xs text-[var(--harbor-mid)]">Required</span>
                    ) : null}
                    <span className="mt-1 block text-[var(--harbor-muted)]">
                      {task.description}
                    </span>
                  </span>
                </label>
              </div>
              {task.href ? (
                <Link
                  href={task.href}
                  className="portal-btn portal-btn-secondary min-h-11 portal-focus"
                >
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </PortalCard>

      {requiredComplete ? (
        <PortalCard className="space-y-3">
          <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
            Ready for the tenant portal
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            Required move-in tasks are complete. Continue to the current-tenant
            portal for payments, maintenance, and day-to-day residency tools.
          </p>
          <Link href="/portal" className="portal-btn portal-btn-primary portal-focus">
            Go to tenant portal
          </Link>
        </PortalCard>
      ) : (
        <p className="text-sm text-[var(--harbor-muted)]">
          Complete required tasks to unlock the current-tenant portal handoff.
        </p>
      )}
    </div>
  );
}

export function FutureOnboardingPage() {
  return (
    <RequireFutureApplicant>
      {(session) => <OnboardingInner session={session} />}
    </RequireFutureApplicant>
  );
}
