"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Target, TrendingUp, Users } from "lucide-react";
import type { ExamStats } from "@/lib/api";
import { loadExamStats } from "@/lib/practice-actions";
import { compactCount } from "@/lib/exam-insights";
import { SESSION_CHANGED_EVENT } from "@/lib/user-session-cookie";

/** A line that cheers the student on, from where they stand. */
function standingLine(topShare: number): string {
  if (topShare <= 1) return "Top of the class. Take a bow!";
  if (topShare <= 10) return "Elite territory. Keep it up!";
  if (topShare <= 25) return "Comfortably ahead of the pack.";
  if (topShare <= 50) return "Above average. A push away from the top.";
  return "Plenty of room to climb. One more mock?";
}

/**
 * The right-hand card on an exam page: how everyone did on this exam's practice tests and, once the student has
 * sat one, where they stand among them. Read in the browser, so the page itself can stay built ahead of time, and
 * read again when the visitor signs in or out.
 */
export function ExamStatsCard({ examSlug, shortName, hasTests }: { examSlug: string; shortName: string; hasTests: boolean }) {
  const [stats, setStats] = useState<ExamStats | null | undefined>(undefined);

  const load = useCallback(() => {
    void loadExamStats(examSlug).then(setStats);
  }, [examSlug]);

  useEffect(() => {
    load();
    window.addEventListener(SESSION_CHANGED_EVENT, load);
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, load);
  }, [load]);

  const practise = `/exams/${examSlug}/practice`;

  if (stats === undefined) {
    return <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" aria-label="Loading the practice statistics" />;
  }
  if (!stats || stats.students === 0) {
    if (!hasTests) return null;
    return (
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="flex items-center gap-2 text-xs font-bold text-brand"><Target className="h-4 w-4" aria-hidden="true" /> Practice leaderboard</p>
        <p className="mt-2 font-display text-lg font-bold text-ink">Be the first to set the bar</p>
        <p className="mt-1 text-sm text-ink-soft">Nobody has sat a {shortName} mock yet. Take one and you lead the board.</p>
        <Link href={practise} className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-brand-dark">
          Take a mock test
        </Link>
      </div>
    );
  }

  const you = stats.you;
  const peak = Math.max(1, ...stats.bands);
  const topShare = you ? Math.max(1, Math.round(100 - you.percentile)) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {you ? (
        <div className="bg-gradient-to-br from-brand to-brand-ink p-5 text-white">
          <p className="flex items-center gap-2 text-xs font-bold text-white/80"><Crown className="h-4 w-4 text-amber-300" aria-hidden="true" /> Where you stand</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-5xl font-extrabold leading-none">#{you.rank}</span>
            <span className="text-sm text-white/80">of {compactCount(stats.students)} {stats.students === 1 ? "student" : "students"}</span>
          </p>
          <p className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            {stats.students === 1 ? "Only you so far" : `Top ${topShare}% · ahead of ${Math.round(you.percentile)}%`}
          </p>
          <p className="mt-3 text-sm italic text-white/90">{standingLine(topShare)}</p>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/10 px-2 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-white/70">Best</dt>
              <dd className="font-display text-xl font-extrabold">{Math.round(you.bestPercent)}%</dd>
            </div>
            <div className="rounded-xl bg-white/10 px-2 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-white/70">Latest</dt>
              <dd className="font-display text-xl font-extrabold">{you.latestMax ? Math.round((you.latestScore / you.latestMax) * 100) : 0}%</dd>
            </div>
            <div className="rounded-xl bg-white/10 px-2 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-white/70">Attempts</dt>
              <dd className="font-display text-xl font-extrabold">{you.attempts}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-brand-soft to-bg-alt p-5">
          <p className="flex items-center gap-2 text-xs font-bold text-brand"><Target className="h-4 w-4" aria-hidden="true" /> Practice leaderboard</p>
          <p className="mt-2 font-display text-lg font-bold text-ink">Where would you rank?</p>
          <p className="mt-1 text-sm text-ink-soft">Sit a {shortName} mock and see exactly where you stand among everyone who has.</p>
          {hasTests && (
            <Link href={practise} className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">
              Find my rank
            </Link>
          )}
        </div>
      )}

      <div className="p-5">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-bg-alt px-3 py-2.5">
            <dt className="flex items-center gap-1 text-[11px] font-bold text-ink-faint"><Users className="h-3.5 w-3.5" aria-hidden="true" /> Students</dt>
            <dd className="font-display text-2xl font-extrabold text-ink">{compactCount(stats.students)}</dd>
          </div>
          <div className="rounded-xl bg-bg-alt px-3 py-2.5">
            <dt className="flex items-center gap-1 text-[11px] font-bold text-ink-faint"><TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Attempts</dt>
            <dd className="font-display text-2xl font-extrabold text-ink">{compactCount(stats.attempts)}</dd>
          </div>
          <div className="rounded-xl bg-bg-alt px-3 py-2.5">
            <dt className="text-[11px] font-bold text-ink-faint">Average score</dt>
            <dd className="font-display text-2xl font-extrabold text-brand">{Math.round(stats.averagePercent)}%</dd>
          </div>
          <div className="rounded-xl bg-bg-alt px-3 py-2.5">
            <dt className="text-[11px] font-bold text-ink-faint">Top score</dt>
            <dd className="font-display text-2xl font-extrabold text-brand">{Math.round(stats.topPercent)}%</dd>
          </div>
        </dl>

        <p className="mt-5 text-xs font-bold text-ink-faint">How everyone scored</p>
        <div className="mt-2 flex h-24 items-end gap-1" role="img" aria-label={`Score spread of ${stats.students} students${you ? `; your best is in the ${you.band * 10}–${you.band * 10 + 10}% band` : ""}`}>
          {stats.bands.map((n, i) => {
            const mine = you?.band === i;
            return (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end" title={`${i * 10}–${i * 10 + 10}%: ${n} ${n === 1 ? "student" : "students"}`}>
                {mine && <span className="mb-1 rounded bg-brand-ink px-1 text-[9px] font-bold text-white">You</span>}
                <div
                  className={`w-full rounded-t-md transition-all ${mine ? "bg-brand" : n > 0 ? "bg-brand/25" : "bg-line"}`}
                  style={{ height: `${Math.max(n > 0 ? 8 : 3, (n / peak) * 100)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-ink-faint">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>

        {you && hasTests && (
          <Link href={practise} className="mt-4 block rounded-lg border border-brand px-4 py-2 text-center text-sm font-bold text-brand transition hover:bg-brand-soft">
            Climb higher: take another mock
          </Link>
        )}
      </div>
    </div>
  );
}
