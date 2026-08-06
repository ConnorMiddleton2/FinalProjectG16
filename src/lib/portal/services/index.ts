/**
 * Current-tenant portal service layer
 * ===================================
 *
 * Hooks and UI should call these functions instead of importing mock
 * fixtures or talking to APIs directly.
 *
 * BACKEND INTEGRATION CHECKLIST
 * -----------------------------
 * 1. Search this folder for `BACKEND_TODO`.
 * 2. Replace mock/store implementations while keeping signatures stable.
 * 3. Map API DTOs into models from `@/lib/portal/models`.
 * 4. Return `ServiceResult<T>` (`ok` / `fail`) for success and error paths.
 * 5. Remove `simulateLatency` once real network latency applies.
 * 6. Optional: set `NEXT_PUBLIC_PORTAL_FORCE_SERVICE_ERROR=1` to test error UI.
 *
 * Domain services
 * ---------------
 * - tenantService        → Tenant (profile)
 * - leaseService         → Lease
 * - paymentService       → Payment / payments overview / make payment
 * - maintenanceService   → MaintenanceRequest
 * - announcementService  → Announcement
 * - messageService       → Message / Conversation
 * - documentService      → Document
 * - renewalService       → RenewalRequest
 * - moveOutService       → MoveOutNotice
 * - dashboardService     → dashboard aggregate
 * - notificationService  → in-portal notifications
 */

export * from "@/lib/portal/services/shared";
export * from "@/lib/portal/services/session";
export * from "@/lib/portal/services/tenantService";
export * from "@/lib/portal/services/leaseService";
export * from "@/lib/portal/services/paymentService";
export * from "@/lib/portal/services/maintenanceService";
export * from "@/lib/portal/services/announcementService";
export * from "@/lib/portal/services/messageService";
export * from "@/lib/portal/services/documentService";
export * from "@/lib/portal/services/renewalService";
export * from "@/lib/portal/services/moveOutService";
export * from "@/lib/portal/services/dashboardService";
export * from "@/lib/portal/services/notificationService";
