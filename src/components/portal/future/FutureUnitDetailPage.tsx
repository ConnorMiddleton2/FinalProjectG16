"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { AvailableUnit } from "@/lib/portal/future/models";
import {
  formatSpaceStats,
  occupancyClassLabel,
} from "@/lib/portal/occupancy";
import {
  FUTURE_APPLY,
  FUTURE_MESSAGES,
  FUTURE_TOURS,
  FUTURE_UNITS,
} from "@/lib/portal/future/paths";
import {
  getSavedUnitIdsSync,
  getUnit,
  removeSavedUnit,
  saveUnit,
} from "@/lib/portal/future/services";

type Props = {
  unitId: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function FutureUnitDetailPage({ unitId }: Props) {
  const [unit, setUnit] = useState<AvailableUnit | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setSaved(getSavedUnitIdsSync().includes(unitId));
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      const result = await getUnit(unitId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        setStatus("error");
        return;
      }
      setUnit(result.data);
      setActiveImage(0);
      setImageFailed(false);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  async function handleToggleSave() {
    setSaving(true);
    const result = saved
      ? await removeSavedUnit(unitId)
      : await saveUnit(unitId);
    if (result.ok) {
      setSaved(result.data.some((item) => item.unitId === unitId));
    }
    setSaving(false);
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: unit ? `${unit.unitLabel} at ${unit.propertyName}` : "Harborline unit",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage("Link copied to clipboard.");
    } catch {
      setShareMessage("Unable to share right now. Copy the URL from your browser.");
    }
  }

  if (status === "loading") {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading unit details…
      </p>
    );
  }

  if (status === "error" || !unit) {
    return (
      <PortalCard className="space-y-3">
        <p className="text-error" role="alert">
          {error ?? "That unit could not be found."}
        </p>
        <Link href={FUTURE_UNITS} className="portal-btn portal-btn-secondary portal-focus">
          Back to available units
        </Link>
      </PortalCard>
    );
  }

  const gallery = unit.galleryUrls?.length
    ? unit.galleryUrls
    : [unit.imageUrl];
  const tourHref = `${FUTURE_TOURS}?unitId=${encodeURIComponent(unit.id)}&propertyId=${encodeURIComponent(unit.propertyId)}`;
  const applyHref = `${FUTURE_APPLY}?unitId=${encodeURIComponent(unit.id)}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--harbor-mist),var(--harbor-sand))]">
            {!imageFailed ? (
              <Image
                src={gallery[activeImage] ?? unit.imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
                unoptimized={(gallery[activeImage] ?? unit.imageUrl).startsWith(
                  "http"
                )}
                priority
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
          </div>
          {gallery.length > 1 ? (
            <div className="flex flex-wrap gap-2" role="list" aria-label="Unit gallery">
              {gallery.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  role="listitem"
                  className={`relative h-16 w-24 overflow-hidden rounded-lg border-2 portal-focus ${
                    index === activeImage
                      ? "border-[var(--harbor-mid)]"
                      : "border-transparent"
                  }`}
                  aria-label={`Show photo ${index + 1}`}
                  aria-pressed={index === activeImage}
                  onClick={() => {
                    setActiveImage(index);
                    setImageFailed(false);
                  }}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized={src.startsWith("http")}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <PortalCard className="space-y-4 self-start">
          <div className="space-y-2">
            <PortalStatusBadge
              tone={
                unit.availability === "available"
                  ? "success"
                  : unit.availability === "limited"
                    ? "warning"
                    : "info"
              }
            >
              {unit.availability === "coming_soon"
                ? "Coming soon"
                : unit.availability === "limited"
                  ? "Limited"
                  : "Available"}
            </PortalStatusBadge>
            <h2 className="font-display text-3xl text-[var(--harbor-ink)]">
              {unit.unitLabel}
            </h2>
            <p className="text-[var(--harbor-muted)]">
              {unit.propertyName} · {unit.floorPlan}
            </p>
            <p className="text-2xl font-semibold text-[var(--harbor-ink)]">
              {formatMoney(unit.rent)}
              <span className="text-base font-normal text-[var(--harbor-muted)]">
                {" "}
                / month
              </span>
            </p>
            <p className="text-sm text-[var(--harbor-muted)]">
              Deposit {formatMoney(unit.deposit)} · {formatSpaceStats(unit)}
            </p>
            <p className="text-sm text-[var(--harbor-muted)]">
              {occupancyClassLabel(unit.occupancyClass)} · Available{" "}
              {unit.availableDate} · {unit.location.neighborhood},{" "}
              {unit.location.city}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={tourHref} className="portal-btn portal-btn-primary portal-focus">
              Schedule Tour
            </Link>
            <Link href={applyHref} className="portal-btn portal-btn-primary portal-focus">
              Start Application
            </Link>
            <button
              type="button"
              className="portal-btn portal-btn-secondary portal-focus"
              onClick={() => void handleToggleSave()}
              disabled={saving}
              aria-pressed={saved}
            >
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              className="portal-btn portal-btn-secondary portal-focus"
              onClick={() => void handleShare()}
            >
              Share
            </button>
            <Link
              href={FUTURE_MESSAGES}
              className="portal-btn portal-btn-secondary portal-focus"
            >
              Contact Leasing
            </Link>
          </div>
          {shareMessage ? (
            <p className="text-sm text-[var(--harbor-muted)]" role="status">
              {shareMessage}
            </p>
          ) : null}
        </PortalCard>
      </div>

      <PortalCard className="space-y-3">
        <h2 className="portal-section-title">
          About this {unit.occupancyClass === "commercial" ? "space" : "home"}
        </h2>
        <p className="text-[var(--harbor-ink)]">{unit.description}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
              Utilities
            </dt>
            <dd className="text-sm text-[var(--harbor-muted)]">{unit.utilities}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
              Parking
            </dt>
            <dd className="text-sm text-[var(--harbor-muted)]">{unit.parking}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
              Pet policy
            </dt>
            <dd className="text-sm text-[var(--harbor-muted)]">{unit.petPolicy}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
              Lease terms
            </dt>
            <dd className="text-sm text-[var(--harbor-muted)]">
              {unit.leaseTermOptions.join(", ")}
            </dd>
          </div>
        </dl>
      </PortalCard>

      <div className="grid gap-4 md:grid-cols-2">
        <PortalCard>
          <h2 className="portal-section-title">Amenities</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--harbor-muted)]">
            {unit.amenities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PortalCard>
        <PortalCard>
          <h2 className="portal-section-title">Accessibility</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--harbor-muted)]">
            {unit.accessibility.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PortalCard>
      </div>

      <PortalCard className="space-y-2">
        <h2 className="portal-section-title">Application requirements</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--harbor-muted)]">
          {unit.applicationRequirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="pt-2 text-sm text-[var(--harbor-muted)]">
          {unit.feesDisclaimer}
        </p>
      </PortalCard>
    </div>
  );
}
