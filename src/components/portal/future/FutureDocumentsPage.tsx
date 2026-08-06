"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type {
  DocumentCategory,
  RentalApplication,
  UploadedDocument,
} from "@/lib/portal/future/models";
import { getDraft, saveDraft } from "@/lib/portal/future/services";

const CATEGORIES: Array<{ value: DocumentCategory; label: string }> = [
  { value: "government_id", label: "Government identification" },
  { value: "proof_of_income", label: "Proof of income" },
  { value: "employment_verification", label: "Employment verification" },
  { value: "rental_history", label: "Rental history" },
  { value: "pet_records", label: "Pet records" },
  { value: "vehicle_information", label: "Vehicle information" },
  { value: "supporting", label: "Supporting" },
];

function DocumentsInner({ session }: { session: PortalTenantSession }) {
  const [app, setApp] = useState<RentalApplication | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("government_id");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getDraft(session.userId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        setStatus("error");
        return;
      }
      setApp(result.data);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [session.userId]);

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    if (!app || !fileName.trim()) return;
    setSaving(true);
    const doc: UploadedDocument = {
      id: `doc-${crypto.randomUUID().slice(0, 8)}`,
      applicationId: app.id,
      ownerUserId: session.userId,
      category,
      fileName: fileName.trim(),
      fileType: "application/pdf",
      fileSizeBytes: 120_000,
      status: "uploaded",
      uploadedAt: new Date().toISOString(),
      previewUrl: null,
    };
    const result = await saveDraft({
      ownerUserId: session.userId,
      documents: [...app.documents, doc],
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setApp(result.data);
    setFileName("");
  }

  if (status === "loading") {
    return <p className="text-sm text-[var(--harbor-muted)]" role="status">Loading documents…</p>;
  }
  if (status === "error" || !app) {
    return <p className="portal-empty text-error" role="alert">{error ?? "Unable to load."}</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PortalCard className="space-y-3">
        <h2 className="portal-section-title">Uploaded documents</h2>
        {app.documents.length === 0 ? (
          <p className="portal-empty">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-3">
            {app.documents.map((doc) => (
              <li
                key={doc.id}
                className="rounded-xl border border-[var(--harbor-deep)]/10 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--harbor-ink)]">{doc.fileName}</p>
                  <PortalStatusBadge
                    tone={
                      doc.status === "accepted"
                        ? "success"
                        : doc.status === "rejected"
                          ? "danger"
                          : "info"
                    }
                  >
                    {doc.status}
                  </PortalStatusBadge>
                </div>
                <p className="text-sm text-[var(--harbor-muted)]">
                  {CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PortalCard>

      <PortalCard as="form" onSubmit={onUpload} className="space-y-3">
        <h2 className="portal-section-title">Mock upload</h2>
        <p className="text-sm text-[var(--harbor-muted)]">
          Demo only — enter a file name. No files are stored on a server.
        </p>
        <PortalField
          label="Category"
          as="select"
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
        >
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </PortalField>
        <PortalField
          label="File name"
          required
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="paystub-march.pdf"
        />
        <button type="submit" className="portal-btn portal-btn-primary portal-focus" disabled={saving}>
          {saving ? "Uploading…" : "Add document"}
        </button>
      </PortalCard>
    </div>
  );
}

export function FutureDocumentsPage() {
  return (
    <RequireFutureApplicant>
      {(session) => <DocumentsInner session={session} />}
    </RequireFutureApplicant>
  );
}
