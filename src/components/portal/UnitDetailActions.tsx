"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bookmark,
  CalendarDays,
  Check,
  FileText,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useSavedUnits } from "@/hooks/useSavedUnits";

export function UnitDetailActions({
  unitId,
  unitLabel,
}: {
  unitId: string;
  unitLabel: string;
}) {
  const { isSaved, toggle, loading } = useSavedUnits();
  const saved = isSaved(unitId);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  async function shareUnit() {
    const shareData = {
      title: `${unitLabel} | Harborline`,
      text: `Take a look at ${unitLabel} from Harborline.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Shared");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareStatus("Link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("Could not share");
    }
    window.setTimeout(() => setShareStatus(null), 2500);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Link
          href={`/portal/tours?unit=${unitId}`}
          className="btn btn-neutral gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          Schedule a Tour
        </Link>
        <Link
          href={`/portal/apply?unit=${unitId}`}
          className="btn bg-[var(--harbor-mid)] text-white hover:bg-[var(--harbor-deep)]"
        >
          <FileText className="h-4 w-4" />
          Start Application
        </Link>
        <button
          type="button"
          onClick={() => toggle(unitId)}
          className="btn btn-outline gap-2"
          disabled={loading}
        >
          {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {saved ? "Unit Saved" : "Save Unit"}
        </button>
        <button
          type="button"
          onClick={() => void shareUnit()}
          className="btn btn-outline gap-2"
        >
          <Share2 className="h-4 w-4" />
          {shareStatus ?? "Share Unit"}
        </button>
        <Link
          href={`/portal/messages?unit=${unitId}`}
          className="btn btn-ghost gap-2 sm:col-span-2 lg:col-span-1"
        >
          <MessageCircle className="h-4 w-4" />
          Contact Leasing
        </Link>
      </div>
      <p className="text-center text-xs text-[var(--harbor-ink)]/55">
        Saved units stay in this browser for signed-out visitors.{" "}
        <Link href="/portal/units/saved" className="link">
          View shortlist
        </Link>
      </p>
    </div>
  );
}
