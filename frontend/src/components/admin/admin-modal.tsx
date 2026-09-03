"use client";

import { ReactNode, useEffect, useRef } from "react";

/**
 * Dialog used across the admin panel — add forms, record detail, confirmations.
 *
 * Detail lives in here rather than expanded on the page: a college carries
 * courses, fees, rankings, placements, cutoffs and SEO, and rendering all of
 * that inline turns a list of twenty records into a page nobody can scan.
 *
 * Renders nothing when closed, so the content inside is unmounted rather than
 * hidden — no stale form state left behind between openings.
 */
export function AdminModal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  size?: "md" | "lg" | "full";
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={`relative flex w-full flex-col rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl ${
          size === "full"
            ? // Near-viewport: a record with eight tabs of fields needs the room.
              "h-[95vh] sm:h-[calc(100vh-2.5rem)] sm:max-w-[calc(100vw-2.5rem)]"
            : size === "lg"
              ? "max-h-[90vh] sm:max-w-3xl"
              : "max-h-[90vh] sm:max-w-lg"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="admin-modal-title" className="font-display text-base font-bold text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            autoFocus
            className="shrink-0 rounded-lg border border-line p-1.5 text-ink-faint transition hover:border-brand hover:text-brand"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
