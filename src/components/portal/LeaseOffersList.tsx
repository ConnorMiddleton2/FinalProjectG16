"use client";

import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useLeaseOffers } from "@/hooks/useLeaseOffers";
import {
  formatOfferDateTime,
  isOfferExpired,
  leaseOfferStatusLabel,
} from "@/lib/lease-offers";

export function LeaseOffersList() {
  const { offers, loading, error, refresh } = useLeaseOffers();

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Approved applicants
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Lease offers</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Review rent, deposits, dates, fees, and documents before you accept or
          decline. Portal acceptance is not a finished legal lease.
        </p>
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

      {loading ? (
        <div className="skeleton h-48 w-full rounded-3xl" />
      ) : offers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/65 px-6 py-14 text-center">
          <FileText className="mx-auto h-10 w-10 text-[var(--harbor-mid)]" />
          <h2 className="mt-4 font-display text-3xl">No lease offers yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--harbor-ink)]/60">
            When leasing sends an offer after approval, it will appear here.
          </p>
          <Link href="/portal/applications" className="btn btn-neutral mt-6">
            Application status
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {offers.map((offer) => {
            const expired = isOfferExpired(offer);
            const status =
              expired && offer.status === "available" ? "expired" : offer.status;
            return (
              <li
                key={offer.id}
                className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
                      {leaseOfferStatusLabel(status)}
                    </p>
                    <h2 className="mt-1 font-display text-2xl">
                      {offer.property}
                    </h2>
                    <p className="text-sm text-[var(--harbor-ink)]/65">
                      {offer.unit} · {offer.monthlyRent}/mo
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--harbor-ink)]/55">
                      <CalendarClock className="h-4 w-4" />
                      Expires {formatOfferDateTime(offer.offerExpirationDate)}
                    </p>
                  </div>
                  <Link
                    href={`/portal/offers/${offer.id}`}
                    className="btn btn-neutral btn-sm"
                  >
                    Review offer
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
