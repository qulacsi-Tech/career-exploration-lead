"use client";

import { RetakeCountdown } from "@/components/practice/retake-countdown";
import { humanWait } from "@/lib/exam-insights";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import type { AttemptsStatus } from "@/lib/practice-attempt";

/**
 * The message after every attempt: how many reattempts the student has left. It opens once for each submitted
 * attempt (reloading the result does not open it again) and is closed with the button, the backdrop or Escape.
 */
export function AttemptPopup({ testSlug, examSlug, attempts }: { testSlug: string; examSlug: string; attempts?: AttemptsStatus }) {
  const [open, setOpen] = useState(false);
  const key = attempts ? `tcp.practice.popup.${testSlug}.${attempts.used}` : "";

  useEffect(() => {
    if (!key) return;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* Storage blocked: the message simply shows each time the result opens. */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens once per submitted attempt
    setOpen(true);
  }, [key]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !attempts) return null;

  const { allowed, used, left } = attempts;
  const lastUsed = left === 0;
  const heading = lastUsed ? "That was your last attempt" : left === null ? "Attempt recorded" : `${left} ${left === 1 ? "reattempt" : "reattempts"} left`;
  const detail =
    left === null
      ? `This is attempt ${used}. There is no limit on this test, so you can take it again whenever you like.`
      : lastUsed
        ? `You have used all ${allowed} ${allowed === 1 ? "attempt" : "attempts"} allowed on this test. Review your result below to learn from it.`
        : `You have used ${used} of ${allowed} attempts on this test. Make the next one count.`;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 px-4" onClick={() => setOpen(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="attempt-popup-title" aria-describedby="attempt-popup-text" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <span className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${lastUsed ? "bg-red-50 text-red-600" : "bg-brand-soft text-brand"}`}>
          <RotateCcw className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 id="attempt-popup-title" className="mt-3 font-display text-xl font-bold text-ink">{heading}</h2>
        <p id="attempt-popup-text" className="mt-2 text-sm leading-relaxed text-ink-soft">{detail}</p>
        {!lastUsed && attempts.waitSeconds && attempts.nextAttemptAt ? (
          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <p className="font-semibold">You can re-attempt after {humanWait(attempts.waitSeconds)}</p>
            <div className="mt-1.5 flex justify-center">
              <RetakeCountdown until={attempts.nextAttemptAt} />
            </div>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" autoFocus onClick={() => setOpen(false)} className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark">
            See my result
          </button>
          {!lastUsed && !attempts.waitSeconds && (
            <Link href={`/exams/${examSlug}/practice/${testSlug}`} className="text-sm font-semibold text-ink-soft hover:text-brand">
              Take it again
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
