"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  FileUp,
  Loader2,
  RefreshCw,
  Replace,
  Trash2,
  X,
} from "lucide-react";
import {
  DOCUMENT_CATEGORIES,
  MAX_DOCUMENT_BYTES,
  acceptAttribute,
  canPreviewDocument,
  createDocumentId,
  deleteDocumentBlob,
  formatFileSize,
  getDocumentBlob,
  getDocumentCategoryMeta,
  isImageDocument,
  mockUploadDocument,
  validateDocumentFile,
  type DocumentCategory,
  type DocumentMeta,
} from "@/lib/application-documents";

type Props = {
  documents: DocumentMeta[];
  onChange: (updater: (current: DocumentMeta[]) => DocumentMeta[]) => void;
  disabled?: boolean;
};

type PendingUpload = {
  tempId: string;
  category: DocumentCategory;
  file: File;
  progress: number;
  status: "uploading" | "failure";
  errorMessage: string;
  replaceId?: string;
};

function RequiredMark() {
  return (
    <span className="text-error" aria-hidden="true">
      *
    </span>
  );
}

function DocumentPreviewModal({
  document,
  onClose,
}: {
  document: DocumentMeta;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const blob = await getDocumentBlob(document.storageKey);
        if (cancelled) return;
        if (!blob) {
          setError("Preview is unavailable for this file.");
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setError("Could not load preview.");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.storageKey]);

  const showImage = isImageDocument(document.mimeType, document.fileName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--harbor-ink)]/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${document.fileName}`}
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--harbor-deep)]/10 px-4 py-3">
          <div>
            <p className="font-semibold">{document.fileName}</p>
            <p className="text-xs text-[var(--harbor-ink)]/50">
              {formatFileSize(document.fileSize)} · secure mock storage
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex max-h-[75vh] min-h-[12rem] items-center justify-center bg-[var(--harbor-sand)]/40 p-4">
          {error ? (
            <p className="text-sm text-error">{error}</p>
          ) : !url ? (
            <Loader2 className="h-8 w-8 animate-spin text-[var(--harbor-mid)]" />
          ) : showImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob preview URL
            <img
              src={url}
              alt={`Preview of ${document.fileName}`}
              className="max-h-[70vh] max-w-full object-contain"
            />
          ) : (
            <iframe
              title={`Preview of ${document.fileName}`}
              src={url}
              className="h-[70vh] w-full rounded-xl bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function ApplicationDocumentsUpload({
  documents,
  onChange,
  disabled = false,
}: Props) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] =
    useState<DocumentCategory>("proof-of-income");
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragOverCategory, setDragOverCategory] =
    useState<DocumentCategory | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentMeta | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const replaceTargetRef = useRef<string | null>(null);

  const updatePending = useCallback(
    (tempId: string, partial: Partial<PendingUpload>) => {
      setPending((current) =>
        current.map((item) =>
          item.tempId === tempId ? { ...item, ...partial } : item
        )
      );
    },
    []
  );

  const removePending = useCallback((tempId: string) => {
    setPending((current) => current.filter((item) => item.tempId !== tempId));
  }, []);

  const runUpload = useCallback(
    async (item: PendingUpload) => {
      updatePending(item.tempId, {
        status: "uploading",
        progress: 0,
        errorMessage: "",
      });

      try {
        const { storageKey } = await mockUploadDocument(item.file, {
          onProgress: (percent) =>
            updatePending(item.tempId, { progress: percent }),
        });

        const meta: DocumentMeta = {
          id: item.replaceId || createDocumentId(),
          category: item.category,
          fileName: item.file.name,
          fileSize: item.file.size,
          mimeType: item.file.type || "",
          uploadedAt: new Date().toISOString(),
          status: "success",
          errorMessage: "",
          storageKey,
        };

        if (item.replaceId) {
          onChange((current) => {
            const previous = current.find((doc) => doc.id === item.replaceId);
            if (previous?.storageKey) {
              void deleteDocumentBlob(previous.storageKey);
            }
            return current.map((doc) =>
              doc.id === item.replaceId ? meta : doc
            );
          });
        } else {
          const categoryMeta = getDocumentCategoryMeta(item.category);
          onChange((current) => {
            if (!categoryMeta.allowMultiple) {
              for (const doc of current) {
                if (doc.category === item.category && doc.storageKey) {
                  void deleteDocumentBlob(doc.storageKey);
                }
              }
              return [
                ...current.filter((doc) => doc.category !== item.category),
                meta,
              ];
            }
            return [...current, meta];
          });
        }

        removePending(item.tempId);
        setBanner(`Uploaded ${item.file.name} securely (mock storage).`);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          removePending(item.tempId);
          return;
        }
        updatePending(item.tempId, {
          status: "failure",
          progress: 0,
          errorMessage:
            err instanceof Error ? err.message : "Upload failed. Try again.",
        });
      }
    },
    [onChange, removePending, updatePending]
  );

  const enqueueFiles = useCallback(
    (files: FileList | File[], category: DocumentCategory, replaceId?: string) => {
      if (disabled) return;
      const list = Array.from(files);
      if (list.length === 0) return;

      const categoryMeta = getDocumentCategoryMeta(category);
      const toUpload = replaceId || !categoryMeta.allowMultiple ? list.slice(0, 1) : list;

      const nextItems: PendingUpload[] = [];
      for (const file of toUpload) {
        const validationError = validateDocumentFile(file);
        if (validationError) {
          setBanner(validationError);
          continue;
        }
        nextItems.push({
          tempId: createDocumentId(),
          category,
          file,
          progress: 0,
          status: "uploading",
          errorMessage: "",
          replaceId,
        });
      }

      if (nextItems.length === 0) return;
      setPending((current) => [...current, ...nextItems]);
      queueMicrotask(() => {
        for (const item of nextItems) {
          void runUpload(item);
        }
      });
    },
    [disabled, runUpload]
  );

  function openFilePicker(category: DocumentCategory, replaceId?: string) {
    setActiveCategory(category);
    replaceTargetRef.current = replaceId ?? null;
    fileInputRef.current?.click();
  }

  async function removeDocument(doc: DocumentMeta) {
    if (doc.storageKey) {
      try {
        await deleteDocumentBlob(doc.storageKey);
      } catch {
        // Still remove metadata if blob cleanup fails.
      }
    }
    onChange((current) => current.filter((item) => item.id !== doc.id));
    setBanner(`Removed ${doc.fileName}.`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl">Document uploads</h2>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
          Upload files by category. Files are stored in isolated mock browser
          storage — not in public frontend folders. Allowed types: PDF, JPG,
          PNG, WEBP, HEIC. Max {formatFileSize(MAX_DOCUMENT_BYTES)} each.
        </p>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={acceptAttribute()}
        multiple
        disabled={disabled}
        onChange={(event) => {
          const files = event.target.files;
          if (!files) return;
          enqueueFiles(
            files,
            activeCategory,
            replaceTargetRef.current ?? undefined
          );
          replaceTargetRef.current = null;
          event.target.value = "";
        }}
      />

      {banner ? (
        <div className="rounded-2xl border border-[var(--harbor-mid)]/30 bg-white/70 px-4 py-3 text-sm">
          {banner}
        </div>
      ) : null}

      {DOCUMENT_CATEGORIES.map((category) => {
        const categoryDocs = documents.filter(
          (doc) => doc.category === category.id
        );
        const categoryPending = pending.filter(
          (item) => item.category === category.id
        );
        const isDragOver = dragOverCategory === category.id;

        return (
          <section
            key={category.id}
            className={`rounded-2xl border p-4 transition ${
              isDragOver
                ? "border-[var(--harbor-mid)] bg-[var(--harbor-mid)]/5"
                : "border-[var(--harbor-deep)]/10 bg-white/55"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!disabled) setDragOverCategory(category.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) {
                return;
              }
              setDragOverCategory((current) =>
                current === category.id ? null : current
              );
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragOverCategory(null);
              if (disabled) return;
              enqueueFiles(event.dataTransfer.files, category.id);
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">
                  {category.label}{" "}
                  {category.required ? <RequiredMark /> : null}
                </h3>
                <p className="mt-1 text-sm text-[var(--harbor-ink)]/55">
                  {category.description}
                </p>
              </div>
              {!disabled ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm gap-2"
                  onClick={() => openFilePicker(category.id)}
                >
                  <FileUp className="h-4 w-4" />
                  Browse
                </button>
              ) : null}
            </div>

            <div
              className={`mt-3 flex min-h-[5.5rem] flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center ${
                isDragOver
                  ? "border-[var(--harbor-mid)]"
                  : "border-[var(--harbor-deep)]/20"
              }`}
            >
              <FileText className="h-6 w-6 text-[var(--harbor-ink)]/35" />
              <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
                Drag and drop files here, or use Browse
              </p>
              <p className="mt-1 text-xs text-[var(--harbor-ink)]/45">
                {category.allowMultiple
                  ? "Multiple files allowed"
                  : "One file for this category"}
              </p>
            </div>

            <ul className="mt-3 space-y-2">
              {categoryPending.map((item) => (
                <li
                  key={item.tempId}
                  className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-[var(--harbor-ink)]/50">
                        {formatFileSize(item.file.size)}
                      </p>
                    </div>
                    {item.status === "uploading" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--harbor-mid)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Uploading {item.progress}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-error">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    )}
                  </div>
                  {item.status === "uploading" ? (
                    <progress
                      className="progress progress-neutral mt-2 w-full"
                      value={item.progress}
                      max={100}
                    />
                  ) : null}
                  {item.status === "failure" ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-error">{item.errorMessage}</p>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs gap-1"
                        onClick={() => void runUpload(item)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => removePending(item.tempId)}
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}

              {categoryDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/80 px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {doc.fileName}
                      </p>
                      <p className="text-xs text-[var(--harbor-ink)]/50">
                        {formatFileSize(doc.fileSize)} ·{" "}
                        {new Date(doc.uploadedAt).toLocaleString()}
                      </p>
                      {doc.status === "success" ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--harbor-mid)]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Upload successful
                        </p>
                      ) : doc.status === "failure" ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-error">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {doc.errorMessage || "Upload failed"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {canPreviewDocument(doc.mimeType, doc.fileName) &&
                      doc.storageKey ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs gap-1"
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </button>
                      ) : null}
                      {!disabled ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs gap-1"
                            onClick={() => openFilePicker(category.id, doc.id)}
                          >
                            <Replace className="h-3.5 w-3.5" />
                            Replace
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs gap-1 text-error"
                            onClick={() => void removeDocument(doc)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}

              {categoryDocs.length === 0 && categoryPending.length === 0 ? (
                <li className="text-xs text-[var(--harbor-ink)]/45">
                  No files uploaded yet
                  {category.required ? " (required)" : ""}.
                </li>
              ) : null}
            </ul>
          </section>
        );
      })}

      {previewDoc ? (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      ) : null}
    </div>
  );
}
