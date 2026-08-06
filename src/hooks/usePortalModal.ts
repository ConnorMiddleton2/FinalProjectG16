"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type RefObject,
} from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE)
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      el.tabIndex !== -1
  );
}

type Options = {
  open: boolean;
  onClose: () => void;
  /** Element to restore focus to when closed. Defaults to previously focused element. */
  restoreFocusRef?: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Focus trap + Escape + body scroll lock for portal dialogs and drawers.
 */
export function usePortalModal({
  open,
  onClose,
  restoreFocusRef,
  initialFocusRef,
}: Options) {
  const containerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const setContainerRef = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, []);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      restoreFocusRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusInitial = () => {
      const container = containerRef.current;
      if (!container) return;
      const preferred = initialFocusRef?.current;
      if (preferred && container.contains(preferred)) {
        preferred.focus();
        return;
      }
      const focusable = getFocusable(container);
      (focusable[0] ?? container).focus();
    };

    // Defer until dialog is painted.
    const frame = window.requestAnimationFrame(focusInitial);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const restore =
        restoreFocusRef?.current ?? previouslyFocused.current;
      restore?.focus();
    };
  }, [open, onClose, restoreFocusRef, initialFocusRef]);

  return { containerRef: setContainerRef, titleId, dialogRef: containerRef };
}
