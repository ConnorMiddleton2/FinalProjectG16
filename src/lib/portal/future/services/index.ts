/**
 * Future Tenant Portal service layer
 * ==================================
 *
 * UI and hooks should call these functions instead of importing mock fixtures
 * directly for fetches.
 *
 * BACKEND INTEGRATION CHECKLIST
 * -----------------------------
 * 1. Search `src/lib/portal/future` for `BACKEND_TODO`.
 * 2. Replace mock/store implementations while keeping signatures stable.
 * 3. Map API DTOs into models from `@/lib/portal/future/models`.
 * 4. Return `ServiceResult<T>` (`ok` / `fail`) for success and error paths.
 * 5. Remove `simulateLatency` once real network latency applies.
 * 6. Optional: set `NEXT_PUBLIC_PORTAL_FORCE_SERVICE_ERROR=1` to test error UI.
 */

export * from "@/lib/portal/future/services/unitService";
export * from "@/lib/portal/future/services/savedUnitService";
export * from "@/lib/portal/future/services/tourService";
export * from "@/lib/portal/future/services/applicationService";
export * from "@/lib/portal/future/services/messageService";
export * from "@/lib/portal/future/services/leaseOfferService";
export * from "@/lib/portal/future/services/leaseSignService";
export * from "@/lib/portal/future/services/waitlistService";
export * from "@/lib/portal/future/services/screeningService";
export * from "@/lib/portal/future/services/commercialPackageService";
export * from "@/lib/portal/future/services/onboardingService";
export * from "@/lib/portal/future/services/notificationService";
