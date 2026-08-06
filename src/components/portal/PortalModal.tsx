"use client";

import type { ReactNode } from "react";
import { usePortalModal } from "@/hooks/usePortalModal";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** alertdialog for destructive confirms */
  role?: "dialog" | "alertdialog";
  className?: string;
  size?: "md" | "lg" | "xl";
};

const SIZE_CLASS = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
} as const;

/**
 * Accessible portal modal with focus trap, Escape, and restored focus.
 */
export function PortalModal({
  open,
  onClose,
  title,
  children,
  footer,
  role = "dialog",
  className = "",
  size = "lg",
}: Props) {
  const { containerRef, titleId } = usePortalModal({ open, onClose });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--harbor-ink)]/40 p-3 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full ${SIZE_CLASS[size]} flex-col rounded-2xl border border-[var(--harbor-deep)]/15 bg-white shadow-xl outline-none ${className}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--harbor-deep)]/10 px-4 py-4 sm:px-5">
          <h2
            id={titleId}
            className="min-w-0 text-lg font-semibold text-[var(--harbor-ink)]"
          >
            {title}
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-square min-h-11 min-w-11 portal-focus"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="flex flex-wrap gap-2 border-t border-[var(--harbor-deep)]/10 px-4 py-4 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
