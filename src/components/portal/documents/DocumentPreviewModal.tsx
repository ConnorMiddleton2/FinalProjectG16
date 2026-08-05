"use client";

import { useEffect, useId, useRef } from "react";
import { Download, X } from "lucide-react";
import {
  formatDocumentDate,
  formatDocumentSize,
} from "@/lib/portal/documents-format";
import type { TenantDocument } from "@/lib/portal/documents-types";

type Props = {
  document: TenantDocument;
  onClose: () => void;
  onDownload: (doc: TenantDocument) => void;
};

export function DocumentPreviewModal({ document, onClose, onDownload }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const isImage =
    document.fileType === "JPG" ||
    document.fileType === "PNG" ||
    document.fileType === "WEBP";

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--harbor-ink)]/40 p-3 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--harbor-deep)]/15 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--harbor-deep)]/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-lg font-semibold text-[var(--harbor-ink)]"
            >
              Preview · {document.fileName}
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
              {document.category} · {document.fileType} ·{" "}
              {formatDocumentSize(document.fileSizeBytes)} · Added{" "}
              {formatDocumentDate(document.dateAdded)}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          {!document.previewSupported ? (
            <p className="text-sm text-[var(--harbor-ink)]/70">
              Preview is not supported for {document.fileType} files in this
              portal. Download the file to view it locally.
            </p>
          ) : (
            <div className="space-y-4">
              {isImage ? (
                <div
                  className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[var(--harbor-deep)]/20 bg-[var(--harbor-sand)]/40 px-4 py-10 text-center"
                  role="img"
                  aria-label={`Image preview placeholder for ${document.fileName}`}
                >
                  <p className="max-w-sm text-sm text-[var(--harbor-ink)]/70">
                    Image preview placeholder for{" "}
                    <span className="font-medium">{document.fileName}</span>.
                    Binary image bytes are not stored in this demo.
                  </p>
                </div>
              ) : null}
              <pre className="whitespace-pre-wrap rounded-xl bg-[var(--harbor-sand)]/35 p-4 font-sans text-sm leading-relaxed text-[var(--harbor-ink)]/85">
                {document.previewText}
              </pre>
              <p className="text-xs text-[var(--harbor-ink)]/55">
                {document.description}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--harbor-deep)]/10 px-4 py-4 sm:px-5">
          <button
            type="button"
            className="btn btn-neutral btn-sm gap-1"
            onClick={() => onDownload(document)}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
