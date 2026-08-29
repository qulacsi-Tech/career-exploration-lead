"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, defaultTheme, themes } from "@/lib/themes";

/*
  The applied palette lives on <html data-theme>, not in React state: the
  pre-paint script in layout.tsx writes it before any component exists, and
  CSS reads it from there. So the attribute is the source of truth and this is
  the external store the picker subscribes to — which is also what lets the
  first client render pick up a restored theme without a hydration mismatch.
*/
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => void listeners.delete(onChange);
}

const getTheme = () => document.documentElement.dataset.theme || defaultTheme;
/* The server cannot know the reviewer's pick; the script corrects it on load. */
const getServerTheme = () => defaultTheme;

function setTheme(key: string) {
  document.documentElement.dataset.theme = key;
  listeners.forEach((l) => l());
}

/**
 * Live palette picker for client review.
 *
 * A demo tool, not product chrome: it exists so the seven red-family variants
 * can be walked through in front of the client without a rebuild or a branch
 * switch. Applying a theme is one attribute write on <html> — every colour on
 * the page is a custom property, so the swap is instant and needs no re-render
 * of the page below.
 *
 * Mounted on the homepage only. The choice is persisted, and layout.tsx
 * re-applies it before first paint so a refresh mid-conversation does not
 * flash back to the default.
 *
 * Remove this component (and its mount in app/page.tsx) once a palette is
 * signed off; the winning variant then becomes the :root block in globals.css.
 */
export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const active = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const apply = useCallback((key: string) => {
    setTheme(key);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, key);
    } catch {
      // Private-mode or blocked storage: the switch still works for this
      // session, it just will not survive a reload. Not worth failing over.
    }
  }, []);

  // Close on Escape, and on a click outside the popup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const activeTheme = themes.find((t) => t.key === active) ?? themes[0];

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-50 print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Choose a colour palette"
          className="mb-3 w-64 rounded-2xl border border-line bg-surface p-4 shadow-xl"
        >
          <p className="font-display text-sm font-bold text-ink">Colour palette</p>
          <p className="mt-1 text-xs text-ink-soft">
            Seven variants for review. The page recolours instantly.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {themes.map((theme) => {
              const isActive = theme.key === active;
              return (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => apply(theme.key)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                    isActive
                      ? "border-ink/40 bg-bg-alt"
                      : "border-line hover:border-ink/25 hover:bg-bg-alt"
                  }`}
                >
                  {/* Two-tone chip: the accent over the light band, which is
                      the pairing that actually distinguishes the variants. */}
                  <span
                    aria-hidden
                    className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-black/10"
                    style={{ background: theme.band }}
                  >
                    <span className="block h-3 w-6" style={{ background: theme.brand }} />
                  </span>
                  <span className="min-w-0 text-[11px] font-medium leading-tight text-ink">
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="ml-auto flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 shadow-lg transition hover:border-ink/25"
      >
        <span
          aria-hidden
          className="h-4 w-4 rounded-full border border-black/10"
          style={{ background: activeTheme.brand }}
        />
        <span className="text-xs font-semibold text-ink">{activeTheme.name}</span>
      </button>
    </div>
  );
}
