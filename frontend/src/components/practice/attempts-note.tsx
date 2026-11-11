"use client";

import { RetakeCountdown } from "@/components/practice/retake-countdown";
import { gapLabel, humanWait } from "@/lib/exam-insights";
import { useEffect, useState } from "react";
import { loadAttemptStatus } from "@/lib/practice-actions";
import type { AttemptsStatus } from "@/lib/practice-attempt";

/**
 * On the instructions page: how many attempts the test allows and, for a signed-in student, how many they have left.
 * The page itself is built ahead of time, so the student's own count is read here once it opens.
 */
export function AttemptsNote({ testSlug, allowed, gapMinutes = null }: { testSlug: string; allowed: number | null; gapMinutes?: number | null }) {
  const [status, setStatus] = useState<AttemptsStatus | null>(null);

  useEffect(() => {
    let current = true;
    loadAttemptStatus(testSlug).then((s) => current && setStatus(s));
    return () => {
      current = false;
    };
  }, [testSlug]);

  const base =
    (allowed === null ? "You can take this test as many times as you like." : `This test allows ${allowed} ${allowed === 1 ? "attempt" : "attempts"} for each student.`) +
    (gapMinutes ? ` Leave ${gapLabel(gapMinutes)} between attempts.` : "");
  const waiting = status && status.left !== 0 && status.waitSeconds && status.nextAttemptAt ? status.nextAttemptAt : null;
  const mine =
    status && status.left !== null
      ? status.left === 0
        ? " You have used them all."
        : ` You have ${status.left} left.`
      : "";

  return (
    <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${status?.left === 0 ? "border-red-200 bg-red-50 text-red-800" : waiting ? "border-amber-200 bg-amber-50 text-amber-900" : "border-line bg-bg-alt/60 text-ink-soft"}`}>
      <strong className="font-semibold text-ink">Attempts. </strong>
      {base}
      {mine}
      {waiting && (
        <span className="mt-2 flex flex-wrap items-center gap-2 font-semibold text-ink">
          You can re-attempt after {humanWait(status?.waitSeconds ?? 0)}:
          <RetakeCountdown until={waiting} />
        </span>
      )}
    </p>
  );
}
