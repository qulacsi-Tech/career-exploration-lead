"use client";

import { useSyncExternalStore } from "react";
import { countdown, daysUntil } from "@/lib/exam-insights";

/*
  "Today", read on the client. Exam pages are built ahead of time, so a countdown worked out on the server would
  go stale; this one is computed in the visitor's browser. The snapshot is the start of the current day, a number
  that stays the same all day, so React sees a stable value. The server snapshot is null and shows a neutral
  placeholder, which the browser replaces as it hydrates.
*/
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const subscribe = () => () => {};

const TONE = {
  urgent: "from-red-600 to-brand-ink",
  soon: "from-brand to-brand-ink",
  calm: "from-brand to-brand-ink",
  closed: "from-slate-500 to-slate-700",
  unknown: "from-slate-400 to-slate-600",
} as const;

/** The big "N days left" figure for a registration deadline. */
export function DeadlineCountdown({ date, size = "card" }: { date: string | undefined; size?: "card" | "hero" }) {
  const today = useSyncExternalStore(subscribe, startOfToday, () => null);
  const reading = today === null ? null : countdown(daysUntil(date, today));
  const big = size === "hero" ? "text-6xl" : "text-5xl";
  const word = reading && Number.isNaN(Number(reading.value)) ? (size === "hero" ? "text-4xl" : "text-2xl") : big;

  return (
    <span className="flex flex-col items-center text-center">
      <span
        className={`bg-gradient-to-b ${reading ? TONE[reading.tone] : TONE.unknown} bg-clip-text font-display ${word} font-extrabold leading-none tracking-tight text-transparent`}
      >
        {reading ? reading.value : "…"}
      </span>
      <span className={`mt-1.5 text-[11px] font-bold ${reading?.tone === "urgent" ? "text-red-600" : "text-brand"}`}>
        {reading ? reading.unit : "Registration"}
      </span>
    </span>
  );
}
