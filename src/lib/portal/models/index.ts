/**
 * Canonical current-tenant portal domain models.
 *
 * These aliases are the stable contracts for the service layer.
 * Domain-specific detail types (filters, load states, form drafts)
 * remain in `src/lib/portal/*-types.ts` and are re-exported where useful.
 *
 * Backend developers: keep these shapes stable when swapping mock
 * services for live API responses, or introduce versioned DTOs and map
 * into these models at the service boundary.
 */

export type {
  TenantProfile as Tenant,
  TenantProfile,
  TenantProfileEditable,
  TenantProfileIdentity,
  PreferredContactMethod,
  EmergencyContact,
  VehicleInformation,
  PetInformation,
  CommunicationPreferences,
} from "@/lib/portal/profile-types";

export type {
  LeaseInformation as Lease,
  LeaseInformation,
  LeaseStatus,
  LeaseOccupant,
  LeaseParkingInfo,
  LeasePetInfo,
} from "@/lib/portal/lease-types";

export type {
  PaymentTransaction as Payment,
  PaymentTransaction,
  PaymentType,
  PaymentStatus,
  PaymentsOverview,
  SavedPaymentMethodSummary,
  AutopayStatus,
} from "@/lib/portal/payments-types";

export type {
  PaymentHistoryRecord,
  HistoryPaymentStatus,
} from "@/lib/portal/payment-history-types";

export type {
  MaintenanceRequest,
  MaintenanceRequestStatus,
  MaintenancePriority,
  MaintenanceCategory,
  MaintenanceFormValues,
  MaintenanceSubmissionResult,
} from "@/lib/portal/maintenance-types";

export type {
  MaintenanceRequestDetail,
  MaintenanceStatusUpdate,
} from "@/lib/portal/maintenance-detail-types";

export type {
  TenantAnnouncement as Announcement,
  TenantAnnouncement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAttachment,
} from "@/lib/portal/announcements-types";

export type {
  PortalMessage as Message,
  PortalMessage,
  PortalConversation as Conversation,
  PortalConversation,
  MessageCategory,
  MessageAttachment,
  MessageSenderRole,
} from "@/lib/portal/messages-types";

export type {
  TenantDocument as Document,
  TenantDocument,
  DocumentCategory,
  DocumentFileType,
} from "@/lib/portal/documents-types";

export type {
  RenewalRequestRecord as RenewalRequest,
  RenewalRequestRecord,
  RenewalContext,
  RenewalStatus,
  RenewalTermOption,
  RenewalDraft,
} from "@/lib/portal/renewal-types";

export type {
  MoveOutNoticeRecord as MoveOutNotice,
  MoveOutNoticeRecord,
  MoveOutContext,
  MoveOutStatus,
  MoveOutReason,
  MoveOutFormValues,
} from "@/lib/portal/move-out-types";

export type {
  PortalNotification as Notification,
  PortalNotification,
  PortalNotificationWithRead,
} from "@/lib/portal/notifications-types";

export type {
  TenantDashboardData,
  DashboardSummary,
} from "@/lib/portal/dashboard-types";
