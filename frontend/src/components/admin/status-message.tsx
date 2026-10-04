"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
  One place for "did that work?" on admin screens that save as you click.

  A success message fades after a few seconds so it does not pile up while someone
  ticks a dozen rows. An error stays until the next action, because a failure that
  disappears on its own is one nobody reads.
*/

export type Flash = { kind: "ok" | "error"; text: string } | null;

const OK_VISIBLE_MS = 5000;

export function useFlash(): [Flash, (kind: "ok" | "error", text: string) => void, () => void] {
  const [flash, setFlash] = useState<Flash>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setFlash(null);
  }, []);

  const show = useCallback((kind: "ok" | "error", text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setFlash({ kind, text });
    if (kind === "ok") timer.current = setTimeout(() => setFlash(null), OK_VISIBLE_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return [flash, show, clear];
}

export function StatusMessage({ flash }: { flash: Flash }) {
  // The live region is always in the page, so a screen reader announces the text when it appears.
  return (
    <div aria-live="polite" className="min-h-0">
      {flash && (
        <p
          role={flash.kind === "error" ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-sm ${
            flash.kind === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {flash.text}
        </p>
      )}
    </div>
  );
}
