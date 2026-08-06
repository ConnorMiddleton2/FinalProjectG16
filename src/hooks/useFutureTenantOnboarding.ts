"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getOrCreateFutureOnboarding,
  loadFutureOnboarding,
  saveFutureOnboarding,
} from "@/lib/portal/future-tenant-store";
import type { FutureTenantOnboarding } from "@/lib/portal/future-tenant-types";
import type { PortalTenantSession } from "@/lib/portal/auth";
import { TENANT_AUTH_DEMO_SAMPLE } from "@/lib/portal/tenant-auth-demo";

type Seed = {
  propertyLabel?: string;
  unit?: string;
  invitationCode?: string;
};

export function useFutureTenantOnboarding(
  session: PortalTenantSession | null,
  seed?: Seed
) {
  const [data, setData] = useState<FutureTenantOnboarding | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!session) {
      setData(null);
      setLoading(false);
      return;
    }
    const meta =
      typeof window !== "undefined"
        ? (() => {
            try {
              const raw = window.sessionStorage.getItem(
                "harborline.portal.futureInviteSeed.v1"
              );
              return raw ? (JSON.parse(raw) as Seed) : {};
            } catch {
              return {};
            }
          })()
        : {};

    const next = getOrCreateFutureOnboarding({
      ownerUserId: session.userId,
      ownerEmail: session.email,
      displayName: session.displayName,
      propertyLabel:
        seed?.propertyLabel ||
        meta.propertyLabel ||
        "Harborline Demo Residences · Unit 204",
      unit: seed?.unit || meta.unit || TENANT_AUTH_DEMO_SAMPLE.unit,
      invitationCode:
        seed?.invitationCode ||
        meta.invitationCode ||
        TENANT_AUTH_DEMO_SAMPLE.invitationCode,
    });
    setData(next);
    setLoading(false);
  }, [session, seed?.propertyLabel, seed?.unit, seed?.invitationCode]);

  useEffect(() => {
    refresh();
    const onChange = () => {
      if (!session) return;
      setData(loadFutureOnboarding(session.userId));
    };
    window.addEventListener("harborline:future-onboarding-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(
        "harborline:future-onboarding-changed",
        onChange
      );
      window.removeEventListener("storage", onChange);
    };
  }, [refresh, session]);

  const update = useCallback(
    (mutator: (prev: FutureTenantOnboarding) => FutureTenantOnboarding) => {
      setData((prev) => {
        if (!prev) return prev;
        const saved = saveFutureOnboarding(mutator(prev));
        return saved ?? prev;
      });
    },
    []
  );

  return { data, loading, refresh, update };
}
