"use client";

import { FutureTenantShell } from "@/components/portal/future/FutureTenantShell";

/**
 * Future Tenant Portal chrome for /portal/future/*
 * Session is resolved client-side inside FutureTenantShell.
 */
export default function FuturePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FutureTenantShell>{children}</FutureTenantShell>;
}
