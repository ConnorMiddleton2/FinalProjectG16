import type {
  DocumentFileType,
  TenantDocument,
} from "@/lib/portal/documents-types";

export function formatDocumentDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDocumentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isPreviewableFileType(fileType: DocumentFileType) {
  return (
    fileType === "PDF" ||
    fileType === "TXT" ||
    fileType === "JPG" ||
    fileType === "PNG" ||
    fileType === "WEBP"
  );
}

export function documentMatchesSearch(doc: TenantDocument, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    doc.fileName.toLowerCase().includes(q) ||
    doc.category.toLowerCase().includes(q) ||
    doc.fileType.toLowerCase().includes(q) ||
    doc.description.toLowerCase().includes(q)
  );
}
