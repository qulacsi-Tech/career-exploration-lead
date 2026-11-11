"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BellRing, X } from "lucide-react";

/**
 * The exam listing's side information (closing deadlines, streams, alerts), kept out of the way so the list can use
 * the full width. An alert button with a count opens it as a panel from the right; the backdrop, the close button
 * or Escape shut it.
 */
export function ExamInfoPanel({ count, children }: { /** Shown on the button: how many deadlines are close. */ count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // The page behind should not scroll while the panel is open.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Deadlines and alerts"
        className="group relative inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-4 py-2 text-sm font-bold text-brand-ink transition hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
      >
        <BellRing className={`h-4 w-4 text-brand ${count > 0 ? "origin-top animate-[wiggle_1.2s_ease-in-out_infinite] group-hover:animate-none" : ""}`} aria-hidden="true" />
        Deadlines &amp; alerts
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-extrabold text-white shadow ring-2 ring-white">
            {count}
          </span>
        )}
      </button>

      <div className={`fixed inset-0 z-[90] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Deadlines and alerts"
          className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-bg shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <BellRing className="h-5 w-5 text-brand" aria-hidden="true" /> Deadlines &amp; alerts
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg border border-line p-1.5 text-ink-soft transition hover:border-brand hover:text-brand">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
            {children}
          </div>
        </aside>
      </div>
    </>
  );
}
