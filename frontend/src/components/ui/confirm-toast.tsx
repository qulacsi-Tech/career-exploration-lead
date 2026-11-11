"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";

/**
 * The site's own "are you sure?", in place of the browser's grey confirm box: a card that slides in at the top of
 * the screen with the question and two buttons. It never blocks the page the way the browser's box does.
 *
 *   if (!(await confirmToast("Delete this review?", { tone: "danger", confirmLabel: "Delete" }))) return;
 *
 * One host (<ConfirmToastHost />, in the root layout) draws whichever question is waiting. Asking again while one is
 * open answers the first with "no", so a question is never left hanging.
 */

export type ConfirmOptions = {
  /** The bold first line. Without it the message stands alone. */
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for something that cannot be undone: a red card and button. */
  tone?: "default" | "danger";
};

type Pending = ConfirmOptions & { id: number; message: string; resolve: (ok: boolean) => void };

let current: Pending | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Asks the question and resolves true for the confirm button, false for cancel, Escape or the close button. */
export function confirmToast(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...options, id: nextId++, message, resolve };
    emit();
  });
}

function settle(ok: boolean) {
  if (!current) return;
  const { resolve } = current;
  current = null;
  emit();
  resolve(ok);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Draws the waiting question. Mounted once, at the root. */
export function ConfirmToastHost() {
  const shown = useSyncExternalStore(subscribe, () => current, () => null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const pending = shown;

  useEffect(() => {
    if (!pending) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        settle(false);
      }
    };
    // Captured first, so Escape answers this question instead of also closing a dialog underneath.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pending]);

  if (!shown) return null;
  const danger = shown.tone === "danger";
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[300] flex justify-center px-4" aria-live="assertive">
      <div
        role="alertdialog"
        aria-modal="false"
        aria-labelledby="confirm-toast-title"
        aria-describedby="confirm-toast-message"
        key={shown.id}
        className={`pointer-events-auto w-full max-w-md animate-[confirm-toast-in_220ms_cubic-bezier(0.2,0.9,0.3,1.2)] overflow-hidden rounded-2xl border bg-surface shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] motion-reduce:animate-none ${
          danger ? "border-red-200" : "border-line"
        }`}
      >
        <div className={`h-1 ${danger ? "bg-red-500" : "bg-brand"}`} aria-hidden="true" />
        <div className="flex gap-3 p-4">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${danger ? "bg-red-50 text-red-600" : "bg-brand-soft text-brand"}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p id="confirm-toast-title" className="font-display text-base font-bold text-ink">
              {shown.title ?? (danger ? "Are you sure?" : "Please confirm")}
            </p>
            <p id="confirm-toast-message" className="mt-0.5 text-sm leading-relaxed text-ink-soft">
              {shown.message}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold text-ink-soft transition hover:border-ink-faint hover:text-ink"
              >
                {shown.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => settle(true)}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 ${
                  danger ? "bg-red-600 hover:bg-red-700" : "bg-brand hover:bg-brand-dark"
                }`}
              >
                {shown.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
          <button type="button" onClick={() => settle(false)} aria-label="Close" className="-mr-1 -mt-1 h-7 w-7 shrink-0 rounded-md text-ink-faint transition hover:bg-bg-alt hover:text-ink">
            <X className="mx-auto h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
