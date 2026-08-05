"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  MessageCircle,
  RefreshCw,
  Shield,
} from "lucide-react";
import { useMoveInOnboarding } from "@/hooks/useMoveInOnboarding";
import {
  CURRENT_TENANT_PORTAL_HREF,
  completedMoveInTasks,
  formatMoveInDate,
  isMoveInDeadlinePast,
  isMoveInDeadlineSoon,
  remainingMoveInTasks,
  type MoveInTask,
} from "@/lib/move-in-onboarding";

function TaskCard({
  task,
  onToggle,
}: {
  task: MoveInTask;
  onToggle: (completed: boolean) => void;
}) {
  const completed = task.status === "completed";
  const overdue = !completed && isMoveInDeadlinePast(task.deadline);
  const soon = !completed && isMoveInDeadlineSoon(task.deadline);

  return (
    <article
      className={`rounded-2xl border p-4 ${
        completed
          ? "border-[var(--harbor-mid)]/25 bg-[var(--harbor-mist)]/25"
          : overdue
            ? "border-error/25 bg-error/5"
            : "border-[var(--harbor-deep)]/10 bg-white/80"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {completed ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--harbor-mid)]" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--harbor-ink)]/35" />
            )}
            <div>
              <h3 className="font-semibold">{task.title}</h3>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
                {task.description}
              </p>
            </div>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={completed}
            onChange={(event) => onToggle(event.target.checked)}
          />
          {completed ? "Completed" : "Mark complete"}
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
            completed
              ? "bg-[var(--harbor-sand)]/70 text-[var(--harbor-ink)]/60"
              : overdue
                ? "bg-error/10 text-error"
                : soon
                  ? "bg-warning/15 text-warning"
                  : "bg-[var(--harbor-sand)]/70 text-[var(--harbor-ink)]/60"
          }`}
        >
          <Clock3 className="h-3.5 w-3.5" />
          Deadline {formatMoveInDate(task.deadline)}
          {overdue ? " · overdue" : soon ? " · due soon" : ""}
        </span>
        {completed && task.completedAt ? (
          <span className="text-[var(--harbor-ink)]/45">
            Completed {new Date(task.completedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      {task.requiredDocuments.length > 0 ? (
        <div className="mt-3 rounded-xl bg-[var(--harbor-sand)]/45 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/50">
            Required documents
          </p>
          <ul className="mt-2 space-y-2">
            {task.requiredDocuments.map((document) => (
              <li key={document.id} className="flex items-start gap-2 text-sm">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
                <span>
                  <span className="font-medium">{document.label}</span>
                  <span className="block text-xs text-[var(--harbor-ink)]/55">
                    {document.note}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--harbor-ink)]/45">
          No document upload is required for this step.
        </p>
      )}

      {task.helpHref ? (
        <div className="mt-3">
          <Link href={task.helpHref} className="btn btn-ghost btn-xs gap-1">
            {task.helpLabel || "Get help"}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function MoveInOnboardingChecklist() {
  const {
    onboarding,
    loading,
    error,
    refresh,
    setTaskCompleted,
    isComplete,
  } = useMoveInOnboarding();

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading move-in checklist">
        <div className="skeleton h-36 w-full rounded-3xl" />
        <div className="skeleton h-72 w-full rounded-3xl" />
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-error" />
        <h1 className="mt-4 font-display text-3xl">Checklist unavailable</h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
          {error || "Could not load move-in onboarding."}
        </p>
        <button
          type="button"
          className="btn btn-neutral mt-6 gap-1"
          onClick={refresh}
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const completed = completedMoveInTasks(onboarding);
  const remaining = remainingMoveInTasks(onboarding);
  const progress = Math.round(
    (completed.length / Math.max(onboarding.tasks.length, 1)) * 100
  );

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Move-in onboarding
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          Get ready for {onboarding.property}
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          {onboarding.unit} · Move-in {formatMoveInDate(onboarding.moveInDate)}{" "}
          · {onboarding.applicantName}
        </p>
        <div className="mt-6 max-w-md">
          <div className="flex items-center justify-between text-sm">
            <span>
              {completed.length} of {onboarding.tasks.length} complete
            </span>
            <span>{progress}%</span>
          </div>
          <progress
            className="progress progress-success mt-2 w-full"
            value={progress}
            max={100}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/75 p-4">
          <p className="text-xs uppercase tracking-wide opacity-50">Completed</p>
          <p className="mt-1 font-display text-3xl">{completed.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/75 p-4">
          <p className="text-xs uppercase tracking-wide opacity-50">Remaining</p>
          <p className="mt-1 font-display text-3xl">{remaining.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/75 p-4">
          <p className="text-xs uppercase tracking-wide opacity-50">
            Move-in date
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatMoveInDate(onboarding.moveInDate)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/portal/messages?intent=move-in"
          className="btn btn-neutral gap-1"
        >
          <MessageCircle className="h-4 w-4" />
          Contact Management
        </Link>
        <Link href="/portal/offers" className="btn btn-outline gap-1">
          Lease offer
        </Link>
        <Link href="/portal/applications" className="btn btn-ghost">
          Application status
        </Link>
      </div>

      {error ? (
        <div className="alert border-error/20 bg-error/10">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1 text-sm">{error}</div>
          <button
            type="button"
            className="btn btn-sm btn-outline gap-1"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      {isComplete ? (
        <section className="rounded-3xl border border-[var(--harbor-mid)]/30 bg-white/85 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-[var(--harbor-mid)]" />
            <div>
              <h2 className="font-display text-3xl">Onboarding complete</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--harbor-ink)]/65">
                You finished the Future Tenant Portal move-in checklist. The
                Current Tenant Portal already exists for day-to-day resident
                tools. This checklist does not change that portal or force a
                role switch — coordinate with Harborline if your account needs
                the tenant role.
              </p>
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/20 bg-[var(--harbor-sand)]/45 px-3 py-2 text-sm text-[var(--harbor-ink)]/70">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
                <p>
                  Transition only when ready. Opening the Current Tenant Portal
                  leaves this Future Tenant experience without modifying tenant
                  portal code or data.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={CURRENT_TENANT_PORTAL_HREF}
                  className="btn btn-neutral gap-1"
                >
                  Continue to Current Tenant Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/portal/messages?intent=move-in"
                  className="btn btn-outline gap-1"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contact Management
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">
          Remaining steps ({remaining.length})
        </h2>
        {remaining.length === 0 ? (
          <p className="text-sm text-[var(--harbor-ink)]/55">
            No remaining steps.
          </p>
        ) : (
          remaining.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={(completed) => setTaskCompleted(task.id, completed)}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">
          Completed steps ({completed.length})
        </h2>
        {completed.length === 0 ? (
          <p className="text-sm text-[var(--harbor-ink)]/55">
            No completed steps yet. Mark each task as you finish it.
          </p>
        ) : (
          completed.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={(done) => setTaskCompleted(task.id, done)}
            />
          ))
        )}
      </section>
    </div>
  );
}
