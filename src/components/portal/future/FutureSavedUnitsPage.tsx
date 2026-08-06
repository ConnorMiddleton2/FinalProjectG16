"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UnitCard } from "@/components/portal/future/UnitCard";
import { PortalCard } from "@/components/portal/PortalCard";
import type { AvailableUnit } from "@/lib/portal/future/models";
import { FUTURE_UNITS } from "@/lib/portal/future/paths";
import {
  getSavedUnits,
  removeSavedUnit,
  saveUnit,
  type SavedUnitWithDetails,
} from "@/lib/portal/future/services";

export function FutureSavedUnitsPage() {
  const [items, setItems] = useState<SavedUnitWithDetails[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    const result = await getSavedUnits();
    if (!result.ok) {
      setError(result.error.message);
      setStatus("error");
      return;
    }
    setItems(result.data);
    setStatus(result.data.length ? "ready" : "empty");
  }

  useEffect(() => {
    void load();
    function onChange() {
      void load();
    }
    window.addEventListener("harborline:future-saved-units-changed", onChange);
    return () => {
      window.removeEventListener(
        "harborline:future-saved-units-changed",
        onChange
      );
    };
  }, []);

  async function handleToggleSave(unitId: string) {
    setSavingId(unitId);
    const isSaved = items.some((item) => item.unitId === unitId);
    if (isSaved) {
      await removeSavedUnit(unitId);
    } else {
      await saveUnit(unitId);
    }
    await load();
    setSavingId(null);
  }

  if (status === "loading") {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading saved units…
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="portal-empty text-error" role="alert">
        {error ?? "Could not load saved units."}
      </p>
    );
  }

  if (status === "empty") {
    return (
      <PortalCard className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
          No saved units yet
        </h2>
        <p className="text-sm text-[var(--harbor-muted)]">
          Save homes and commercial suites while browsing to compare them here. Saved units work even
          when you are signed out.
        </p>
        <Link href={FUTURE_UNITS} className="portal-btn portal-btn-primary portal-focus">
          Browse available units
        </Link>
      </PortalCard>
    );
  }

  const units = items
    .map((item) => item.unit)
    .filter((unit): unit is AvailableUnit => Boolean(unit));

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--harbor-muted)]">
        {units.length} saved unit{units.length === 1 ? "" : "s"}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {units.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            saved
            saving={savingId === unit.id}
            onToggleSave={handleToggleSave}
          />
        ))}
      </div>
    </div>
  );
}
