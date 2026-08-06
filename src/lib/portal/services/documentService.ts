import {
  getAuthorizedMockDocuments,
} from "@/lib/portal/documents-mock";
import { DEMO_TENANT_ID } from "@/lib/portal/documents-types";
import type { Document } from "@/lib/portal/models";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

export type DocumentViewer = {
  tenantId: string;
  viewerLabel: string;
  mode: "signed-in" | "demo";
};

export type DocumentListPayload = {
  documents: Document[];
  viewer: DocumentViewer;
};

/**
 * Secure document center service — ACL scoped to the current tenant.
 *
 * BACKEND_TODO:
 *   GET /api/tenant/documents
 *   GET /api/tenant/documents/:id/download  (signed URL)
 * Enforce authorizedTenantIds (or equivalent) server-side. Never return
 * another tenant's documents to the client.
 */

export async function listDocuments(input?: {
  viewer?: DocumentViewer | null;
}): Promise<ServiceResult<DocumentListPayload>> {
  const forced = assertNotForcedError("listDocuments");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);

    const viewer: DocumentViewer = input?.viewer ?? {
      tenantId: auth.data.tenantScopeId,
      viewerLabel: auth.data.displayName,
      mode: "signed-in",
    };

    // Always scope to the session tenant — ignore client-supplied foreign ids.
    const scopedViewer: DocumentViewer = {
      ...viewer,
      tenantId: auth.data.tenantScopeId,
    };

    // BACKEND_TODO: fetch documents where tenant_id = session lease party
    const documents = getAuthorizedMockDocuments(scopedViewer.tenantId);
    return ok({ documents, viewer: scopedViewer }, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load documents.", "network");
  }
}

export function getDocumentsDemoFixture(
  tenantId: string = DEMO_TENANT_ID
): Document[] {
  return getAuthorizedMockDocuments(tenantId);
}

export function demoDocumentViewer(): DocumentViewer {
  return {
    tenantId: DEMO_TENANT_ID,
    viewerLabel: "Demo tenant (Alex)",
    mode: "demo",
  };
}

/** @deprecated Prefer listDocuments() which always uses the session scope. */
export function assertViewerMatchesSession(
  viewerTenantId: string,
  sessionTenantScopeId: string
) {
  return viewerTenantId === sessionTenantScopeId;
}
