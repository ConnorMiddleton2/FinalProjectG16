"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getAuthorizedMockDocuments,
} from "@/lib/portal/documents-mock";
import { documentMatchesSearch } from "@/lib/portal/documents-format";
import {
  DEMO_TENANT_ID,
  type DocumentFilters,
  type DocumentsLoadState,
  type DocumentSortKey,
  type SortDirection,
  type TenantDocument,
} from "@/lib/portal/documents-types";

const LOAD_DELAY_MS = 400;

const DEFAULT_FILTERS: DocumentFilters = {
  search: "",
  category: "all",
  sortKey: "dateAdded",
  sortDirection: "desc",
};

type ViewerSession = {
  tenantId: string;
  viewerLabel: string;
  mode: "signed-in" | "demo";
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

async function resolveViewerSession(
  forceDemo: boolean
): Promise<ViewerSession | "unauthorized" | null> {
  if (forceDemo) {
    return {
      tenantId: DEMO_TENANT_ID,
      viewerLabel: "Demo tenant (Alex)",
      mode: "demo",
    };
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "unauthorized";

    // Live document ACL is not wired yet. Signed-in portal users map to the
    // demo tenant ACL so only documents authorized for that tenant appear.
    return {
      tenantId: DEMO_TENANT_ID,
      viewerLabel: user.email ?? "Signed-in tenant",
      mode: "signed-in",
    };
  } catch {
    // Missing Supabase env / guest browse — require explicit demo preview.
    return "unauthorized";
  }
}

/**
 * Loads documents authorized for the current tenant only.
 * Other tenants' files in the mock catalog are never returned.
 */
export function useTenantDocuments() {
  const [state, setState] = useState<DocumentsLoadState>({ status: "loading" });
  const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_FILTERS);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const load = useCallback(
    async (options?: { forceDemo?: boolean }) => {
      setState({ status: "loading" });
      setSuccessMessage(null);
      try {
        await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));
        const session = await resolveViewerSession(Boolean(options?.forceDemo));
        if (session === "unauthorized" || session === null) {
          setState({
            status: "unauthorized",
            message:
              "Sign in to view documents authorized for your tenant account. Guests cannot browse another tenant’s secure files.",
          });
          return;
        }

        // Live document API is not available yet — use authorized mock only.
        const authorized = getAuthorizedMockDocuments(session.tenantId);
        applyAuthorized(
          authorized,
          "mock",
          session.tenantId,
          session.viewerLabel
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
    },
    [applyAuthorized]
  );

  const loadDemoData = useCallback(() => {
    void load({ forceDemo: true });
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

  return {
    state,
    filters,
    filtered,
    categoryCounts,
    successMessage,
    reload: () => void load(),
    loadDemoData,
    updateFilters,
    resetFilters,
    showSuccess,
  };
}
