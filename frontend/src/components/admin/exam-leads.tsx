"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { ExamLeadDetail, ExamLeadRow, PaginationMeta } from "@/lib/api";

const pageButton = "inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 font-medium";
const BASE = "/admin/leads/exams";

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function duration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

function hrefFor(query: string, exam: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (exam) params.set("exam", exam);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

const Consent = ({ ok }: { ok: boolean }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-bg-alt text-ink-soft"}`}>{ok ? "Yes" : "No"}</span>
);

/**
 * The students who sat practice tests, as a table a page at a time: one row for each student and exam with their
 * attempts, best and latest score. The server does the search, the exam filter and the paging.
 */
export function ExamLeadsTable({
  rows,
  meta,
  exams,
  query,
  exam,
}: {
  rows: ExamLeadRow[];
  meta: PaginationMeta;
  exams: { slug: string; name: string }[];
  query: string;
  exam: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(query);
  const first = (meta.page - 1) * meta.limit;
  const link = (page: number, label: React.ReactNode, enabled: boolean) =>
    enabled ? (
      <Link href={hrefFor(query, exam, page)} className={`${pageButton} text-ink-soft hover:border-brand hover:text-brand`}>{label}</Link>
    ) : (
      <span className={`${pageButton} opacity-40`}>{label}</span>
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Exam leads</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Students who sat a practice test, one row for each student and exam. Open a row for every attempt and score. To pass them to a sponsored college, use the Practice test type in Sponsored leads.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <select
            value={exam}
            onChange={(e) => router.push(hrefFor(query, e.target.value, 1))}
            aria-label="Filter by exam"
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">All exams</option>
            {exams.map((x) => (
              <option key={x.slug} value={x.slug}>{x.name}</option>
            ))}
          </select>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push(hrefFor(text.trim(), exam, 1));
            }}
            className="relative w-full max-w-xs"
            role="search"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search name, email, phone or city"
              aria-label="Search exam leads"
              className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-9 text-sm text-ink focus:border-brand focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  router.push(hrefFor("", exam, 1));
                }}
                aria-label="Clear the search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </form>
        </div>
      </header>

      {meta.total === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-soft">
          {query || exam ? "No student matches this search." : "No student has sat a practice test yet. They appear here after their first attempt."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-alt/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-12 px-4 py-3">#</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3 text-right">Tests</th>
                  <th className="px-4 py-3 text-right">Attempts</th>
                  <th className="px-4 py-3">Best</th>
                  <th className="px-4 py-3">Latest</th>
                  <th className="px-4 py-3">May be contacted</th>
                  <th className="px-4 py-3">Last attempt</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.userId}-${r.examSlug}`} className="border-b border-line last:border-0 hover:bg-bg-alt/40">
                    <td className="px-4 py-3 text-ink-faint">{first + i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{r.name}</p>
                      <p className="text-xs text-ink-soft">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{r.phone || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{r.city || "—"}</td>
                    <td className="px-4 py-3 text-ink">{r.examName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{r.tests}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{r.attempts}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-ink">{num(r.bestScore)}/{num(r.bestMax)}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-soft" title={r.lastTest}>{num(r.lastScore)}/{num(r.lastMax)}</td>
                    <td className="px-4 py-3"><Consent ok={r.contactOk} /></td>
                    <td className="px-4 py-3 text-ink-soft">{formatDate(r.lastAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`${BASE}/${encodeURIComponent(r.userId)}/${encodeURIComponent(r.examSlug)}`} className="inline-flex rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-soft">
            <span>
              Showing {(first + 1).toLocaleString("en-IN")}–{(first + rows.length).toLocaleString("en-IN")} of {meta.total.toLocaleString("en-IN")}
            </span>
            {meta.pages > 1 && (
              <nav className="flex items-center gap-2" aria-label="Pages">
                {link(meta.page - 1, <><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</>, meta.page > 1)}
                <span>Page {meta.page} of {meta.pages}</span>
                {link(meta.page + 1, <>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></>, meta.page < meta.pages)}
              </nav>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** One student's attempts on one exam: their details, then each test with every attempt and its section scores. */
export function ExamLeadDetailView({ detail }: { detail: ExamLeadDetail }) {
  const { student, attempts } = detail;
  const best = attempts.reduce((top, a) => ((a.maxScore ? a.score / a.maxScore : 0) > (top.maxScore ? top.score / top.maxScore : 0) ? a : top), attempts[0]);
  const byTest = new Map<string, typeof attempts>();
  for (const a of attempts) byTest.set(a.testSlug, [...(byTest.get(a.testSlug) ?? []), a]);

  return (
    <div className="space-y-6">
      <Link href={BASE} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All exam leads
      </Link>

      <header>
        <h1 className="font-display text-2xl font-extrabold text-ink">{student.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{detail.examName}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Student</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-ink-faint">Email</dt>
            <dd className="text-ink">{student.email}</dd>
            <dt className="text-ink-faint">Phone</dt>
            <dd className="text-ink">{student.phone || "—"}</dd>
            <dt className="text-ink-faint">Location</dt>
            <dd className="text-ink">{[student.city, student.state].filter(Boolean).join(", ") || "—"}</dd>
            <dt className="text-ink-faint">May be contacted</dt>
            <dd><Consent ok={student.contactOk} /></dd>
          </dl>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Summary</h2>
          <dl className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-[11px] font-semibold text-ink-faint">Attempts</dt>
              <dd className="font-display text-2xl font-bold text-ink">{attempts.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold text-ink-faint">Tests</dt>
              <dd className="font-display text-2xl font-bold text-ink">{byTest.size}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold text-ink-faint">Best score</dt>
              <dd className="font-display text-2xl font-bold text-ink">{num(best.score)}<span className="text-sm font-medium text-ink-faint">/{num(best.maxScore)}</span></dd>
            </div>
          </dl>
        </section>
      </div>

      {[...byTest.entries()].map(([slug, rows]) => (
        <section key={slug} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line px-5 py-3">
            <h2 className="font-semibold text-ink">{rows[0].testTitle}</h2>
            <p className="text-xs text-ink-soft">{rows.length} {rows.length === 1 ? "attempt" : "attempts"}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="bg-bg-alt/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Score</th>
                  <th className="px-4 py-2.5">Right / wrong / skipped</th>
                  <th className="px-4 py-2.5">Accuracy</th>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Sections</th>
                  <th className="px-4 py-2.5">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a, i) => (
                  <tr key={a.id} className="border-t border-line align-top">
                    <td className="px-4 py-2.5 text-ink-faint">{rows.length - i}</td>
                    <td className="px-4 py-2.5 font-semibold text-ink">{num(a.score)}/{num(a.maxScore)}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{a.correct} / {a.incorrect} / {a.skipped}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{a.accuracy.toFixed(0)}%</td>
                    <td className="px-4 py-2.5 text-ink-soft">{duration(a.totalSeconds)}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-soft">
                      {a.sections.length === 0 ? "—" : a.sections.map((s) => `${s.label} ${num(s.score)}/${num(s.maxScore)}`).join(" · ")}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">{formatDate(a.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
