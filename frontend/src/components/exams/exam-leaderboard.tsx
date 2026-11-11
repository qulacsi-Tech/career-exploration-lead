"use client";

import { useEffect, useState } from "react";
import { Medal, Trophy } from "lucide-react";
import type { ExamLeaderboard as Board, LeaderboardEntry } from "@/lib/api";
import { loadExamLeaderboard } from "@/lib/practice-actions";

const MEDAL = ["text-amber-400", "text-slate-400", "text-orange-500"];

function Row({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl px-3 py-2 ${entry.isYou ? "bg-brand text-white shadow-sm" : "odd:bg-bg-alt"}`}>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold ${entry.isYou ? "bg-white/20" : "bg-surface text-ink"}`}>
        {entry.rank <= 3 ? <Medal className={`h-4 w-4 ${entry.isYou ? "text-amber-300" : MEDAL[entry.rank - 1]}`} aria-label={`Rank ${entry.rank}`} /> : entry.rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{entry.isYou ? `${entry.name} (you)` : entry.name}</span>
        <span className={`block text-[11px] ${entry.isYou ? "text-white/80" : "text-ink-faint"}`}>
          {entry.attempts} {entry.attempts === 1 ? "attempt" : "attempts"}
        </span>
      </span>
      <span className={`font-display text-lg font-extrabold ${entry.isYou ? "" : "text-brand"}`}>{Math.round(entry.bestPercent)}%</span>
    </li>
  );
}

/** The top ten on an exam's mock tests by best score, with the student's own row highlighted (and added below when lower). */
export function ExamLeaderboard({ examSlug }: { examSlug: string }) {
  const [board, setBoard] = useState<Board | null | undefined>(undefined);

  useEffect(() => {
    let current = true;
    loadExamLeaderboard(examSlug).then((b) => current && setBoard(b));
    return () => {
      current = false;
    };
  }, [examSlug]);

  if (board === undefined) return <div className="h-72 animate-pulse rounded-2xl border border-line bg-surface" aria-label="Loading the leaderboard" />;
  if (!board || board.total === 0) return null;

  return (
    <section aria-labelledby="leaderboard-title" className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="leaderboard-title" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Trophy className="h-5 w-5 text-gold" aria-hidden="true" /> Leaderboard
        </h2>
        <span className="text-xs font-semibold text-ink-faint">{board.total} {board.total === 1 ? "student" : "students"}</span>
      </div>
      <p className="mt-0.5 text-xs italic text-brand-ink/80">Best score per student. May the best prep win.</p>
      <ol className="mt-4 space-y-1">
        {board.top.map((e) => (
          <Row key={`${e.rank}-${e.name}-${e.isYou}`} entry={e} />
        ))}
      </ol>
      {board.you && (
        <>
          <p className="my-1 text-center text-xs text-ink-faint" aria-hidden="true">⋯</p>
          <ol>
            <Row entry={board.you} />
          </ol>
        </>
      )}
    </section>
  );
}
