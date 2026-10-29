"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DetailCard } from "@/components/college/detail-ui";
import type { Cutoff } from "@/lib/api";

/**
 * A short look at the cut-offs under the Admissions text, so someone reading how to apply can see what score
 * it takes without leaving the page. Filter by exam, caste category and programme; the first few rows show,
 * with the rest a click away and the full Cut-Offs tab one link further.
 */

const SHOWN = 6;

const programmeOf = (c: Cutoff) => [c.course, c.specialisation].filter((x) => x?.trim()).join(" · ");

/** A 0-100 reading, or null when the figure is not on that scale (a rank or raw marks has no denominator). */
function percentOf(score: string): number | null {
  if (!/percentile|percent|%/i.test(score)) return null;
  const n = Number(score.match(/[\d.]+/)?.[0]);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function Pills({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (next: string) => void }) {
  if (options.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-semibold text-ink-faint">{label}</span>
      {["", ...options].map((o) => (
        <button
          key={o || "all"}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${value === o ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"}`}
        >
          {o || "All"}
        </button>
      ))}
    </div>
  );
}

export function AdmissionCutoffs({ cutoffs, href }: { cutoffs: Cutoff[]; href: string }) {
  const [exam, setExam] = useState("");
  const [category, setCategory] = useState("");
  const [programme, setProgramme] = useState("");
  const [all, setAll] = useState(false);

  const exams = useMemo(() => [...new Set(cutoffs.map((c) => c.exam))], [cutoffs]);
  const categories = useMemo(() => [...new Set(cutoffs.map((c) => c.category))], [cutoffs]);
  const programmes = useMemo(() => [...new Set(cutoffs.map(programmeOf).filter(Boolean))], [cutoffs]);

  const rows = cutoffs.filter((c) => (!exam || c.exam === exam) && (!category || c.category === category) && (!programme || programmeOf(c) === programme));
  const visible = all ? rows : rows.slice(0, SHOWN);

  return (
    <DetailCard
      title="Cut-off Snapshot"
      action={
        <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          All cut-offs
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    >
      <div className="mb-5 space-y-2.5">
        <Pills label="Exam" value={exam} options={exams} onChange={setExam} />
        <Pills label="Category" value={category} options={categories} onChange={setCategory} />
        {programmes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="cutoff-programme" className="w-20 shrink-0 text-xs font-semibold text-ink-faint">
              Programme
            </label>
            <select
              id="cutoff-programme"
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
              className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-soft focus:border-brand focus:outline-none"
            >
              <option value="">All programmes</option>
              {programmes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">No cut-off matches these filters.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-faint">
                <th scope="col" className="py-2 pr-4 font-semibold">Exam</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Programme</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Category</th>
                <th scope="col" className="py-2 text-right font-semibold">Closing score</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => {
                const pct = percentOf(c.score);
                return (
                  <tr key={`${c.exam}-${c.category}-${programmeOf(c)}-${i}`} className="border-b border-line-soft">
                    <td className="py-3 pr-4 font-semibold text-ink">{c.exam}</td>
                    <td className="py-3 pr-4 text-ink-soft">{programmeOf(c) || "Every programme"}</td>
                    <td className="py-3 pr-4 text-ink-soft">{c.category}</td>
                    <td className="py-3 text-right">
                      <span className="font-display font-bold text-ink">{c.score}</span>
                      {pct !== null && (
                        <span aria-hidden className="mt-1.5 ml-auto block h-1.5 w-24 overflow-hidden rounded-full bg-line-soft">
                          <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > SHOWN && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-4 text-sm font-semibold text-brand hover:underline">
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </DetailCard>
  );
}
