"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  isClockedIn,
  latestPunchFor,
  seedTimePunches,
  type TimePunch,
} from "@/lib/hr-time-clock";

function formatPunchTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EmployeeClockIn({
  employeeKey,
  employeeName,
}: {
  employeeKey: string;
  employeeName: string;
}) {
  const { items, saveOne, loading, error } = useSharedCollection<TimePunch>(
    COLLECTIONS.hrTimePunches,
    seedTimePunches
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [nowLabel, setNowLabel] = useState("");

  useEffect(() => {
    function tick() {
      setNowLabel(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    }
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const clockedIn = useMemo(
    () => isClockedIn(items, employeeKey),
    [items, employeeKey]
  );
  const latest = useMemo(
    () => latestPunchFor(items, employeeKey),
    [items, employeeKey]
  );

  async function punch(type: "in" | "out") {
    setBusy(true);
    setMsg(null);
    try {
      await saveOne({
        id: crypto.randomUUID(),
        employeeKey,
        employeeName,
        type,
        punchedAt: new Date().toISOString(),
      });
      setMsg(type === "in" ? "You are clocked in." : "You are clocked out.");
      setTimeout(() => setMsg(null), 2800);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save punch.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-[var(--harbor-sand)]/95 text-[var(--harbor-ink)] shadow-[0_20px_50px_rgba(11,42,50,0.35)] backdrop-blur-sm">
      <div className="border-b border-[var(--harbor-deep)]/10 bg-white/40 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--harbor-ink)]/45">
              Time clock
            </p>
            <p className="mt-1 text-base font-semibold leading-tight">
              Employee clock in
            </p>
          </div>
          <span
            className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              clockedIn
                ? "bg-emerald-100 text-emerald-900"
                : "bg-[var(--harbor-mist)] text-[var(--harbor-deep)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                clockedIn ? "bg-emerald-600" : "bg-[var(--harbor-mid)]"
              }`}
            />
            {clockedIn ? "On the clock" : "Off the clock"}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
            <Clock className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{employeeName}</p>
            <p className="text-xs text-[var(--harbor-ink)]/55">
              {nowLabel ? `Local time ${nowLabel}` : "Loading time…"}
              {latest
                ? ` · last ${latest.type === "in" ? "in" : "out"} ${formatPunchTime(latest.punchedAt)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn btn-neutral btn-sm h-10 border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)] hover:bg-[var(--harbor-deep)]"
            disabled={busy || loading || clockedIn}
            onClick={() => void punch("in")}
          >
            Clock in
          </button>
          <button
            type="button"
            className="btn btn-sm h-10 border-[var(--harbor-deep)]/20 bg-white text-[var(--harbor-ink)] hover:bg-[var(--harbor-mist)]/70"
            disabled={busy || loading || !clockedIn}
            onClick={() => void punch("out")}
          >
            Clock out
          </button>
        </div>

        {error ? <p className="text-xs text-error">{error}</p> : null}
        {msg ? (
          <p className="text-xs font-medium text-emerald-800">{msg}</p>
        ) : null}
      </div>
    </div>
  );
}
