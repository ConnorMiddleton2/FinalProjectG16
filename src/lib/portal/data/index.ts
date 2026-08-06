/**
 * Mock data access for the current-tenant portal.
 *
 * All fixture data lives under `src/lib/portal/*-mock.ts` (and local
 * session stores). Components must not define domain mock datasets.
 * Prefer calling `@/lib/portal/services` from hooks; use these helpers
 * only inside services or for demo “Load sample data” actions.
 */

export { getMockTenantProfile } from "@/lib/portal/profile-mock";
export { getMockLeaseInformation } from "@/lib/portal/lease-mock";
export {
  getMockPaymentsOverview,
  getEmptyPaymentsOverview,
} from "@/lib/portal/payments-mock";
export { getMockPaymentHistory } from "@/lib/portal/payment-history-mock";
export { getMockMakePaymentContext } from "@/lib/portal/make-payment-mock";
export { getMockMaintenanceRequests } from "@/lib/portal/maintenance-mock";
export { getMockAnnouncements } from "@/lib/portal/announcements-mock";
export { getMockConversations } from "@/lib/portal/messages-mock";
export {
  getAllMockDocuments,
  getAuthorizedMockDocuments,
} from "@/lib/portal/documents-mock";
export {
  getMockRenewalContext,
  getMockSubmittedRenewalRequest,
} from "@/lib/portal/renewal-mock";
export { getMockMoveOutContext } from "@/lib/portal/move-out-mock";
export { getMockPortalNotifications } from "@/lib/portal/notifications-mock";
export {
  getMockTenantDashboard,
  getEmptyTenantDashboard,
} from "@/lib/portal/dashboard-mock";
