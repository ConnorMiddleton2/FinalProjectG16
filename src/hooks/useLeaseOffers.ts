"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acceptLeaseOffer,
  declineLeaseOffer,
  readLeaseOffer,
  readLeaseOffers,
  type LeaseOffer,
} from "@/lib/lease-offers";
import { updatePublicApplicationStatus } from "@/lib/application-status";

export function useLeaseOffers() {
  const [offers, setOffers] = useState<LeaseOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    try {
      setOffers(readLeaseOffers());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load lease offers in this browser."
      );
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const accept = useCallback(
    (offerId: string) => {
      const updated = acceptLeaseOffer(offerId);
      if (!updated) throw new Error("Offer not found.");
      if (updated.applicationId) {
        updatePublicApplicationStatus(
          updated.applicationId,
          "Lease Accepted",
          "Applicant accepted the lease offer in the portal. Signatures and backend processing are still required."
        );
      }
      setOffers(readLeaseOffers());
      return updated;
    },
    []
  );

  const decline = useCallback((offerId: string, reason?: string) => {
    const updated = declineLeaseOffer(offerId, reason);
    if (!updated) throw new Error("Offer not found.");
    if (updated.applicationId) {
      updatePublicApplicationStatus(
        updated.applicationId,
        "Under Review",
        "Applicant declined the lease offer. Leasing may discuss other options."
      );
    }
    setOffers(readLeaseOffers());
    return updated;
  }, []);

  const getOffer = useCallback((offerId: string) => {
    return readLeaseOffer(offerId);
  }, []);

  return {
    offers,
    loading,
    error,
    refresh,
    accept,
    decline,
    getOffer,
  };
}
