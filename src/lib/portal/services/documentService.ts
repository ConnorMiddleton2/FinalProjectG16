/**
 * Uploaded document service.
 *
 * @backend GET/POST /api/portal/applications/:id/documents
 * File bytes must stay in private storage — never under /public.
 */

import { MOCK_UPLOADED_DOCUMENTS } from "@/lib/portal/mock/data";
import { PortalServiceError } from "@/lib/portal/mock/delay";
import type { UploadedDocument } from "@/lib/portal/models";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

/** @backend GET /api/portal/applications/:applicationId/documents */
export async function listUploadedDocuments(
  applicationId: string
): Promise<ServiceResult<UploadedDocument[]>> {
  return runMockService(
    () =>
      MOCK_UPLOADED_DOCUMENTS.filter(
        (item) => item.applicationId === applicationId
      ).map((item) => ({ ...item })),
    {
      minMs: 140,
      maxMs: 380,
      failureRate: 0.03,
      failureMessage: "Could not load uploaded documents.",
    }
  );
}

/** @backend GET /api/portal/documents/:id */
export async function getUploadedDocument(
  documentId: string
): Promise<ServiceResult<UploadedDocument>> {
  return runMockService(() => {
    const document = MOCK_UPLOADED_DOCUMENTS.find((item) => item.id === documentId);
    if (!document) {
      throw new PortalServiceError("Document not found.", "NOT_FOUND", 404);
    }
    return { ...document };
  }, {
    minMs: 100,
    maxMs: 260,
    failureRate: 0.02,
    failureMessage: "Could not load document metadata.",
  });
}

/**
 * Metadata-only create for service-layer demos.
 * @backend POST /api/portal/applications/:applicationId/documents
 * Prefer the existing IndexedDB `mockUploadDocument` for real upload progress UI.
 */
export async function registerUploadedDocument(
  input: Omit<UploadedDocument, "id" | "uploadedAt" | "status" | "errorMessage"> & {
    id?: string;
  }
): Promise<ServiceResult<UploadedDocument>> {
  return runMockService(() => {
    const document: UploadedDocument = {
      id: input.id || `doc-${Date.now()}`,
      applicationId: input.applicationId,
      category: input.category,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      storageKey: input.storageKey,
      uploadedAt: new Date().toISOString(),
      status: "success",
      errorMessage: "",
    };
    MOCK_UPLOADED_DOCUMENTS.unshift(document);
    return { ...document };
  }, {
    minMs: 400,
    maxMs: 900,
    failureRate: 0.05,
    failureMessage: "Document upload failed. Please retry.",
  });
}
