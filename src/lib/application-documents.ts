/**
 * Application document uploads — metadata + isolated mock blob storage.
 *
 * File bytes live only in IndexedDB (never under /public or other static folders).
 * The application draft stores metadata and an opaque storage key only.
 */

export const APPLICATION_DOCUMENT_DB = "harborline_application_documents";
export const APPLICATION_DOCUMENT_STORE = "blobs";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
] as const;

export type DocumentCategory =
  | "proof-of-income"
  | "government-id"
  | "employment-verification"
  | "rental-history"
  | "pet-records"
  | "vehicle-information"
  | "supporting";

export type DocumentUploadStatus = "uploading" | "success" | "failure";

export type DocumentCategoryMeta = {
  id: DocumentCategory;
  label: string;
  description: string;
  required: boolean;
  allowMultiple: boolean;
};

export const DOCUMENT_CATEGORIES: DocumentCategoryMeta[] = [
  {
    id: "proof-of-income",
    label: "Proof of income",
    description: "Pay stubs, offer letters, or other income documentation.",
    required: true,
    allowMultiple: true,
  },
  {
    id: "government-id",
    label: "Government-issued identification",
    description: "Driver’s license, state ID, or passport photo page.",
    required: true,
    allowMultiple: false,
  },
  {
    id: "employment-verification",
    label: "Employment verification",
    description: "Employer letter or verification form.",
    required: false,
    allowMultiple: true,
  },
  {
    id: "rental-history",
    label: "Rental history",
    description: "Prior lease pages or landlord references.",
    required: false,
    allowMultiple: true,
  },
  {
    id: "pet-records",
    label: "Pet records",
    description: "Vaccination, licensing, or pet documentation.",
    required: false,
    allowMultiple: true,
  },
  {
    id: "vehicle-information",
    label: "Vehicle information",
    description: "Registration or related vehicle paperwork.",
    required: false,
    allowMultiple: true,
  },
  {
    id: "supporting",
    label: "Supporting documents",
    description: "Any additional files that support your application.",
    required: false,
    allowMultiple: true,
  },
];

/** Metadata persisted with the draft — never raw file bytes. */
export type DocumentMeta = {
  id: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: DocumentUploadStatus;
  errorMessage: string;
  /** Opaque IndexedDB key — not a public URL or filesystem path. */
  storageKey: string;
};

export function getDocumentCategoryMeta(
  category: DocumentCategory
): DocumentCategoryMeta {
  const found = DOCUMENT_CATEGORIES.find((item) => item.id === category);
  if (!found) throw new Error(`Unknown document category: ${category}`);
  return found;
}

export function createDocumentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function acceptAttribute(): string {
  return [...ALLOWED_DOCUMENT_EXTENSIONS, ...ALLOWED_DOCUMENT_MIME_TYPES].join(
    ","
  );
}

export function validateDocumentFile(file: File): string | null {
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `Files must be ${formatFileSize(MAX_DOCUMENT_BYTES)} or smaller.`;
  }

  const lower = file.name.toLowerCase();
  const extensionOk = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) =>
    lower.endsWith(ext)
  );
  const mimeOk =
    !file.type ||
    (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type);

  if (!extensionOk && !mimeOk) {
    return "Allowed types: PDF, JPG, PNG, WEBP, or HEIC.";
  }

  return null;
}

function openDocumentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Secure browser storage is unavailable."));
      return;
    }
    const request = indexedDB.open(APPLICATION_DOCUMENT_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(APPLICATION_DOCUMENT_STORE)) {
        db.createObjectStore(APPLICATION_DOCUMENT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open document storage."));
  });
}

export async function putDocumentBlob(
  storageKey: string,
  blob: Blob
): Promise<void> {
  const db = await openDocumentDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(APPLICATION_DOCUMENT_STORE, "readwrite");
    tx.objectStore(APPLICATION_DOCUMENT_STORE).put(blob, storageKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Could not store document securely."));
  });
  db.close();
}

export async function getDocumentBlob(
  storageKey: string
): Promise<Blob | null> {
  if (!storageKey) return null;
  const db = await openDocumentDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(APPLICATION_DOCUMENT_STORE, "readonly");
    const request = tx.objectStore(APPLICATION_DOCUMENT_STORE).get(storageKey);
    request.onsuccess = () => {
      resolve((request.result as Blob | undefined) ?? null);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read document."));
  });
  db.close();
  return blob;
}

export async function deleteDocumentBlob(storageKey: string): Promise<void> {
  if (!storageKey) return;
  const db = await openDocumentDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(APPLICATION_DOCUMENT_STORE, "readwrite");
    tx.objectStore(APPLICATION_DOCUMENT_STORE).delete(storageKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Could not remove stored document."));
  });
  db.close();
}

export type MockUploadHandlers = {
  onProgress: (percent: number) => void;
  signal?: AbortSignal;
};

/**
 * Isolated mock upload: simulates progress, then stores the blob in IndexedDB.
 * Does not write under public/ or any static frontend folder.
 */
export async function mockUploadDocument(
  file: File,
  handlers: MockUploadHandlers
): Promise<{ storageKey: string }> {
  const validationError = validateDocumentFile(file);
  if (validationError) throw new Error(validationError);

  const storageKey = `mock://${createDocumentId()}/${encodeURIComponent(file.name)}`;

  await new Promise<void>((resolve, reject) => {
    let progress = 0;
    const tick = () => {
      if (handlers.signal?.aborted) {
        reject(new DOMException("Upload cancelled.", "AbortError"));
        return;
      }
      progress = Math.min(progress + 12 + Math.floor(Math.random() * 18), 92);
      handlers.onProgress(progress);
      if (progress >= 92) {
        resolve();
        return;
      }
      window.setTimeout(tick, 90 + Math.floor(Math.random() * 80));
    };
    tick();
  });

  // Occasional mock failure (~5%) so retry UI can be exercised.
  if (Math.random() < 0.05) {
    throw new Error("Mock upload failed. You can retry.");
  }

  await putDocumentBlob(storageKey, file);
  handlers.onProgress(100);
  return { storageKey };
}

export function canPreviewDocument(mimeType: string, fileName: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  if (mimeType === "application/pdf") return true;
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp")
  );
}

export function isImageDocument(mimeType: string, fileName: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif")
  );
}

/** Migrate legacy category ids from earlier drafts. */
export function normalizeDocumentMeta(
  raw: Partial<DocumentMeta> & {
    category?: string;
    id?: string;
    fileName?: string;
    fileSize?: number;
    uploadedAt?: string;
  }
): DocumentMeta {
  const legacyMap: Record<string, DocumentCategory> = {
    "photo-id": "government-id",
    income: "proof-of-income",
    other: "supporting",
  };
  const category = (legacyMap[raw.category ?? ""] ??
    raw.category ??
    "supporting") as DocumentCategory;

  return {
    id: raw.id || createDocumentId(),
    category: DOCUMENT_CATEGORIES.some((item) => item.id === category)
      ? category
      : "supporting",
    fileName: raw.fileName ?? "document",
    fileSize: raw.fileSize ?? 0,
    mimeType: raw.mimeType ?? "",
    uploadedAt: raw.uploadedAt ?? new Date().toISOString(),
    status: raw.status === "failure" || raw.status === "uploading"
      ? raw.status
      : "success",
    errorMessage: raw.errorMessage ?? "",
    storageKey: raw.storageKey ?? "",
  };
}

export function validateRequiredDocuments(
  documents: DocumentMeta[]
): string | null {
  const successful = documents.filter((doc) => doc.status === "success");
  const hasId = successful.some((doc) => doc.category === "government-id");
  const hasIncome = successful.some((doc) => doc.category === "proof-of-income");
  if (!hasId) {
    return "Upload government-issued identification to continue.";
  }
  if (!hasIncome) {
    return "Upload proof of income to continue.";
  }
  if (documents.some((doc) => doc.status === "uploading")) {
    return "Wait for uploads to finish before continuing.";
  }
  if (documents.some((doc) => doc.status === "failure")) {
    return "Remove or retry failed uploads before continuing.";
  }
  return null;
}
