"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  Eye,
  FileText,
  FolderOpen,
  LoaderCircle,
  Lock,
  RefreshCw,
  Search,
} from "lucide-react";
import { DocumentPreviewModal } from "@/components/portal/documents/DocumentPreviewModal";
import { useTenantDocuments } from "@/hooks/useTenantDocuments";
import {
  formatDocumentDate,
  formatDocumentSize,
} from "@/lib/portal/documents-format";
import { buildDocumentDownloadText } from "@/lib/portal/documents-mock";
import {
  DOCUMENT_CATEGORIES,
  type DocumentSortKey,
  type SortDirection,
  type TenantDocument,
} from "@/lib/portal/documents-types";

const SORT_OPTIONS: Array<{ value: DocumentSortKey; label: string }> = [
  { value: "dateAdded", label: "Date added" },
  { value: "fileName", label: "File name" },
  { value: "category", label: "Category" },
  { value: "fileSize", label: "File size" },
];

export function DocumentCenterPage() {
  const {
    state,
    filters,
    filtered,
    categoryCounts,
    successMessage,
    reload,
    loadDemoData,
    updateFilters,
    resetFilters,
    showSuccess,
  } = useTenantDocuments();

  const [previewDoc, setPreviewDoc] = useState<TenantDocument | null>(null);

  const hasActiveFilters = useMemo(
    () =>
      filters.search.trim().length > 0 ||
      filters.category !== "all" ||
      filters.sortKey !== "dateAdded" ||
      filters.sortDirection !== "desc",
    [filters]
  );

  function downloadDocument(doc: TenantDocument) {
    const body = buildDocumentDownloadText(doc);
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const base = doc.fileName.replace(/\.[^.]+$/, "");
    anchor.download = `${base}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showSuccess(`Downloaded ${doc.fileName}.`);
  }

  if (state.status === "loading") {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          className="h-8 w-8 animate-spin text-[var(--harbor-mid)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--harbor-ink)]/70">
          Loading secure documents…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className="rounded-2xl border border-error/30 bg-error/5 p-6"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-error" aria-hidden="true" />
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                Documents unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
                {state.message}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm gap-1"
                onClick={reload}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadDemoData}
              >
                Preview demo tenant documents
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "unauthorized") {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <Lock
            className="mt-0.5 h-5 w-5 text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              Sign in required
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--harbor-ink)]/65">
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/login" className="btn btn-neutral btn-sm">
            Sign in
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadDemoData}
          >
            Preview demo tenant documents
          </button>
          <Link href="/portal/lease" className="btn btn-ghost btn-sm">
            Lease information
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "empty" && !state.filtered) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <FolderOpen
            className="mt-0.5 h-5 w-5 text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              No documents yet
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--harbor-ink)]/65">
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/messages" className="btn btn-neutral btn-sm">
            Contact management
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadDemoData}
          >
            Preview demo tenant documents
          </button>
        </div>
      </div>
    );
  }

  // success (or filtered empty handled below with filters UI)
  const viewerLabel =
    state.status === "success" ? state.viewerLabel : "Your account";
  const source = state.status === "success" ? state.source : "mock";
  const totalAuthorized =
    state.status === "success" ? state.documents.length : 0;

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
        role="status"
      >
        Showing documents authorized for {viewerLabel}
        {source === "mock" ? " (demo catalog)" : ""}. Other tenants’ files are
        never listed.
      </div>

      {successMessage ? (
        <div className="alert alert-success" role="status">
          <span>{successMessage}</span>
        </div>
      ) : null}

      <DocumentFiltersBar
        search={filters.search}
        category={filters.category}
        sortKey={filters.sortKey}
        sortDirection={filters.sortDirection}
        categoryCounts={categoryCounts}
        resultCount={filtered.length}
        totalCount={totalAuthorized}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={(search) => updateFilters({ search })}
        onCategoryChange={(category) => updateFilters({ category })}
        onSortKeyChange={(sortKey) => updateFilters({ sortKey })}
        onSortDirectionChange={(sortDirection) =>
          updateFilters({ sortDirection })
        }
        onReset={resetFilters}
      />

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8"
          role="status"
        >
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            No matching documents
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--harbor-ink)]/65">
            Nothing matches your search or category filter. Clear filters to see
            all documents authorized for your account.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm mt-4"
            onClick={resetFilters}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Authorized documents">
          {filtered.map((doc) => (
            <li key={doc.id}>
              <DocumentRow
                document={doc}
                onPreview={() => setPreviewDoc(doc)}
                onDownload={() => downloadDocument(doc)}
              />
            </li>
          ))}
        </ul>
      )}

      {previewDoc ? (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={(doc) => {
            downloadDocument(doc);
          }}
        />
      ) : null}
    </div>
  );
}

function DocumentFiltersBar({
  search,
  category,
  sortKey,
  sortDirection,
  categoryCounts,
  resultCount,
  totalCount,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onSortKeyChange,
  onSortDirectionChange,
  onReset,
}: {
  search: string;
  category: "all" | (typeof DOCUMENT_CATEGORIES)[number];
  sortKey: DocumentSortKey;
  sortDirection: SortDirection;
  categoryCounts: Partial<Record<(typeof DOCUMENT_CATEGORIES)[number], number>>;
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: "all" | (typeof DOCUMENT_CATEGORIES)[number]) => void;
  onSortKeyChange: (value: DocumentSortKey) => void;
  onSortDirectionChange: (value: SortDirection) => void;
  onReset: () => void;
}) {
  const searchId = "document-center-search";
  const categoryId = "document-center-category";
  const sortId = "document-center-sort";
  const dirId = "document-center-sort-dir";

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="document-filters-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="document-filters-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Find documents
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-ink)]/65" aria-live="polite">
            {resultCount} of {totalCount} authorized file
            {totalCount === 1 ? "" : "s"} shown
          </p>
        </div>
        {hasActiveFilters ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="form-control md:col-span-2 xl:col-span-2">
          <label className="label" htmlFor={searchId}>
            <span className="label-text font-medium">Search</span>
          </label>
          <div className="input input-bordered flex min-h-11 items-center gap-2">
            <Search className="h-4 w-4 opacity-50" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              className="grow bg-transparent outline-none"
              placeholder="File name, category, or type"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="form-control">
          <label className="label" htmlFor={categoryId}>
            <span className="label-text font-medium">Category</span>
          </label>
          <select
            id={categoryId}
            className="select select-bordered w-full"
            value={category}
            onChange={(e) =>
              onCategoryChange(
                e.target.value as "all" | (typeof DOCUMENT_CATEGORIES)[number]
              )
            }
          >
            <option value="all">All categories</option>
            {DOCUMENT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
                {categoryCounts[item] != null ? ` (${categoryCounts[item]})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="form-control">
            <label className="label" htmlFor={sortId}>
              <span className="label-text font-medium">Sort by</span>
            </label>
            <select
              id={sortId}
              className="select select-bordered w-full"
              value={sortKey}
              onChange={(e) =>
                onSortKeyChange(e.target.value as DocumentSortKey)
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label" htmlFor={dirId}>
              <span className="label-text font-medium">Order</span>
            </label>
            <select
              id={dirId}
              className="select select-bordered w-full"
              value={sortDirection}
              onChange={(e) =>
                onSortDirectionChange(e.target.value as SortDirection)
              }
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Document categories">
        <li>
          <button
            type="button"
            className={`btn min-h-11 ${category === "all" ? "btn-neutral" : "btn-ghost"}`}
            onClick={() => onCategoryChange("all")}
          >
            All ({totalCount})
          </button>
        </li>
        {DOCUMENT_CATEGORIES.map((item) => (
          <li key={item}>
            <button
              type="button"
              className={`btn min-h-11 ${
                category === item ? "btn-neutral" : "btn-ghost"
              }`}
              onClick={() => onCategoryChange(item)}
            >
              {item}
              {categoryCounts[item] != null ? ` (${categoryCounts[item]})` : ""}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DocumentRow({
  document,
  onPreview,
  onDownload,
}: {
  document: TenantDocument;
  onPreview: () => void;
  onDownload: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-start gap-2">
            <FileText
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--harbor-mid)]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[var(--harbor-ink)]">
                {document.fileName}
              </h3>
              <p className="text-sm text-[var(--harbor-ink)]/65">
                {document.description}
              </p>
            </div>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Category" value={document.category} />
            <Meta
              label="Date added"
              value={formatDocumentDate(document.dateAdded)}
            />
            <Meta label="File type" value={document.fileType} />
            <Meta
              label="File size"
              value={formatDocumentSize(document.fileSizeBytes)}
            />
          </dl>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <button
            type="button"
            className="btn btn-outline btn-sm gap-1"
            onClick={onPreview}
            disabled={!document.previewSupported}
            aria-label={
              document.previewSupported
                ? `Preview ${document.fileName}`
                : `Preview not available for ${document.fileName}`
            }
            title={
              document.previewSupported
                ? "Preview"
                : "Preview not supported for this file type"
            }
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Preview
          </button>
          <button
            type="button"
            className="btn btn-neutral btn-sm gap-1"
            onClick={onDownload}
            aria-label={`Download ${document.fileName}`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download
          </button>
        </div>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[var(--harbor-ink)]">{value}</dd>
    </div>
  );
}
