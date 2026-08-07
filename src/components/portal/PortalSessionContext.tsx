"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { PortalTenantSession } from "@/lib/portal/auth";
import { setInjectedPortalSession } from "@/lib/portal/portal-session-inject";

const PortalSessionContext = createContext<PortalTenantSession | null>(null);

/** Provides the server-resolved portal session to client hooks/services. */
export function PortalSessionProvider({
  session,
  children,
}: {
  session: PortalTenantSession;
  children: ReactNode;
}) {
  const value = useMemo(() => session, [session]);

  useEffect(() => {
    setInjectedPortalSession(session);
    return () => setInjectedPortalSession(null);
  }, [session]);

  // Also set synchronously so first paint hooks (before useEffect) can read it.
  setInjectedPortalSession(session);

  return (
    <PortalSessionContext.Provider value={value}>
      {children}
    </PortalSessionContext.Provider>
  );
}

export function usePortalSession(): PortalTenantSession | null {
  return useContext(PortalSessionContext);
}
