/**
 * Future Tenant Portal — models, mock catalog, and services.
 *
 * @backend Swap service function bodies for real HTTP/Supabase clients.
 * Keep `models.ts` stable so UI and hooks can migrate incrementally.
 */

export * from "@/lib/portal/models";
export {
  MOCK_APPLICANT,
  MOCK_APPLICATIONS,
  MOCK_CO_APPLICANTS,
  MOCK_FEE_PAYMENTS,
  MOCK_LEASE_OFFERS,
  MOCK_MESSAGES,
  MOCK_MOVE_IN_TASKS,
  MOCK_OCCUPANTS,
  MOCK_PROPERTIES,
  MOCK_SAVED_UNITS,
  MOCK_SEARCH_AMENITIES,
  MOCK_TOURS,
  MOCK_UNITS,
  MOCK_UPLOADED_DOCUMENTS,
  DEMO_APPLICANT_ID,
} from "@/lib/portal/mock/data";
export {
  PortalServiceError,
  isPortalServiceError,
  maybeMockFailure,
  mockDelay,
} from "@/lib/portal/mock/delay";
export * from "@/lib/portal/services";
