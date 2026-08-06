"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { AvailableUnit } from "@/lib/portal/future/models";
import {
  formatSpaceStats,
  occupancyClassLabel,
} from "@/lib/portal/occupancy";
import {
  FUTURE_APPLY,
  FUTURE_TOURS,
  FUTURE_UNIT,
} from "@/lib/portal/future/paths";

type Props = {
  unit: AvailableUnit;
  saved?: boolean;
  onToggleSave?: (unitId: string) => void;
  saving?: boolean;
};

function availabilityTone(availability: AvailableUnit["availability"]) {
  if (availability === "available") return "success" as const;
  if (availability === "limited") return "warning" as const;
  return "info" as const;
}

function availabilityLabel(availability: AvailableUnit["availability"]) {
  if (availability === "available") return "Available";
  if (availability === "limited") return "Limited";
  return "Coming soon";
}

function formatRent(rent: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(rent);
}

export function UnitCard({ unit, saved = false, onToggleSave, saving }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const detailHref = FUTURE_UNIT(unit.id);
  const tourHref = `${FUTURE_TOURS}?unitId=${encodeURIComponent(unit.id)}&propertyId=${encodeURIComponent(unit.propertyId)}`;
  const applyHref = `${FUTURE_APPLY}?unitId=${encodeURIComponent(unit.id)}`;

  return (
    <PortalCard className="flex h-full flex-col overflow-hidden p-0" padded={false}>
      <div className="relative aspect-[16/10] bg-[linear-gradient(135deg,var(--harbor-mist),var(--harbor-sand))]">
        {!imageFailed ? (
          <Image
            src={unit.imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized={unit.imageUrl.startsWith("http")}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-sm font-medium text-[var(--harbor-ink)]/50"
            aria-hidden="true"
          >
            {unit.floorPlan}
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <PortalStatusBadge tone={availabilityTone(unit.availability)}>
            {availabilityLabel(unit.availability)}
          </PortalStatusBadge>
          <PortalStatusBadge
            tone={unit.occupancyClass === "commercial" ? "info" : "neutral"}
          >
            {occupancyClassLabel(unit.occupancyClass)}
          </PortalStatusBadge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            {unit.propertyName}
          </p>
          <h3 className="font-display text-xl text-[var(--harbor-ink)]">
            {unit.unitLabel} · {unit.floorPlan}
          </h3>
          <p className="text-sm text-[var(--harbor-muted)]">
            {unit.location.neighborhood}, {unit.location.city}
          </p>
        </div>

        <p className="text-lg font-semibold text-[var(--harbor-ink)]">
          {formatRent(unit.rent)}
          <span className="text-sm font-normal text-[var(--harbor-muted)]">
            {" "}
            / month
          </span>
        </p>

        <p className="text-sm text-[var(--harbor-muted)]">
          {formatSpaceStats(unit)} · Available {unit.availableDate}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Link
            href={detailHref}
            className="portal-btn portal-btn-primary min-h-11 portal-focus"
          >
            View Details
          </Link>
          <button
            type="button"
            className="portal-btn portal-btn-secondary min-h-11 portal-focus"
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved units" : "Save unit"}
            disabled={saving || !onToggleSave}
            onClick={() => onToggleSave?.(unit.id)}
          >
            <Heart
              className={`h-4 w-4 ${saved ? "fill-[var(--harbor-mid)] text-[var(--harbor-mid)]" : ""}`}
              aria-hidden="true"
            />
            {saved ? "Saved" : "Save"}
          </button>
          <Link
            href={tourHref}
            className="portal-btn portal-btn-secondary min-h-11 portal-focus"
          >
            Schedule Tour
          </Link>
          <Link
            href={applyHref}
            className="portal-btn portal-btn-secondary min-h-11 portal-focus"
          >
            Apply
          </Link>
        </div>
      </div>
    </PortalCard>
  );
}
