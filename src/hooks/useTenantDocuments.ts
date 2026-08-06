"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPortalTenantSessionClient } from "@/lib/portal/auth-client";
import {
  isDocumentAcknowledged,
  markDocumentAcknowledged,
} from "@/lib/portal/documents-ack-store";
import { documentMatchesSearch } from "@/lib/portal/documents-format";
import type {
  DocumentFilters,
  DocumentsLoadState,
  DocumentSortKey,
  SortDirection,
  TenantDocument,
} from "@/lib/portal/documents-types";
import { listDocuments } from "@/lib/portal/services/documentService";

const DEFAULT_FILTERS: DocumentFilters = {
  search: "",
  category: "all",
  sortKey: "dateAdded",
  sortDirection: "desc",
};

function compareDocuments(
  a: TenantDocument,
  b: TenantDocument,
  key: DocumentSortKey,
  direction: SortDirection
) {
  const dir = direction === "asc" ? 1 : -1;
  switch (key) {
    case "fileName":
      return a.fileName.localeCompare(b.fileName) * dir;
    case "category":
      return a.category.localeCompare(b.category) * dir;
    case "fileSize":
      return (a.fileSizeBytes - b.fileSizeBytes) * dir;
    case "dateAdded":
    default:
      return a.dateAdded.localeCompare(b.dateAdded) * dir;
  }
}

/**
 * Loads documents authorized for the current tenant only.
 * Other tenants' files in the mock catalog are never returned.
 * Viewer tenant id always comes from the portal session (never client override).
 */
export function useTenantDocuments() {
  const [state, setState] = useState<DocumentsLoadState>({ status: "loading" });
  const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_FILTERS);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ackVersion, setAckVersion] = useState(0);
  const tenantScopeRef = useRef<string | null>(null);

  const applyAuthorized = useCallback(
    (
      documents: TenantDocument[],
      source: "live" | "mock",
      tenantId: string,
      viewerLabel: string
    ) => {
      if (documents.length === 0) {
        setState({
          status: "empty",
          filtered: false,
          message:
            "No documents are available for your tenant account yet. Files Harborline shares with you will appear here.",
        });
        return;
      }
      setState({
        status: "success",
        documents,
        source,
        tenantId,
        viewerLabel,
      });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setSuccessMessage(null);
    try {
      const session = await getPortalTenantSessionClient();
      tenantScopeRef.current = session?.tenantScopeId ?? null;
      const result = await listDocuments();
      if (!result.ok) {
        if (result.error.code === "unauthorized") {
          setState({
            status: "unauthorized",
            message: result.error.message,
          });
          return;
        }
        setState({ status: "error", message: result.error.message });
        return;
      }

      applyAuthorized(
        result.data.documents,
        result.source,
        result.data.viewer.tenantId,
        result.data.viewer.viewerLabel
      );
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load your document center.",
      });
    }
  }, [applyAuthorized]);

  const loadDemoData = useCallback(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateFilters = useCallback((patch: Partial<DocumentFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 3500);
  }, []);

  const isAcknowledged = useCallback(
    (documentId: string) => {
      void ackVersion;
      const scopeId = tenantScopeRef.current;
      if (!scopeId) return false;
      return isDocumentAcknowledged(documentId, scopeId);
    },
    [ackVersion]
  );

  const acknowledgeDocument = useCallback(
    (documentId: string) => {
      const scopeId = tenantScopeRef.current;
      if (!scopeId) return false;
      markDocumentAcknowledged(documentId, scopeId);
      setAckVersion((v) => v + 1);
      showSuccess("Document acknowledged for your account.");
      return true;
    },
    [showSuccess]
  );

  const filtered = useMemo(() => {
    if (state.status !== "success") return [];
    return state.documents
      .filter((doc) => {
        if (filters.category !== "all" && doc.category !== filters.category) {
          return false;
        }
        return documentMatchesSearch(doc, filters.search);
      })
      .sort((a, b) =>
        compareDocuments(a, b, filters.sortKey, filters.sortDirection)
      );
  }, [state, filters]);

  const categoryCounts = useMemo(() => {
    if (state.status !== "success") return {};
    const counts: Partial<Record<TenantDocument["category"], number>> = {};
    for (const doc of state.documents) {
      counts[doc.category] = (counts[doc.category] ?? 0) + 1;
    }
    return counts;
  }, [state]);

  const pendingAcknowledgments = useMemo(() => {
    if (state.status !== "success") return 0;
    void ackVersion;
    const scopeId = tenantScopeRef.current;
    if (!scopeId) return 0;
    return state.documents.filter(
      (doc) =>
        doc.requiresAcknowledgment &&
        !isDocumentAcknowledged(doc.id, scopeId)
    ).length;
  }, [state, ackVersion]);

  return {
    state,
    filters,
    filtered,
    categoryCounts,
    successMessage,
    pendingAcknowledgments,
    reload: () => void load(),
    loadDemoData,
    updateFilters,
    resetFilters,
    showSuccess,
    isAcknowledged,
    acknowledgeDocument,
  };
}
