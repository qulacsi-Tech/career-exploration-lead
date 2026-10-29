"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpenCheck, Check, ChevronDown, ClipboardList, Clock, Phone, Search, Target } from "lucide-react";
import { TAB_ICONS } from "@/lib/tab-icons";
import type { Cutoff } from "@/lib/api";

/**
 * The Admissions tab laid out to be read at a glance: a compact banner, then each course as its own card with
 * its key points up front (and the full text one click away), and a column down the side with the facts that
 * apply to every course: the exams accepted, a jump list, the cut-offs in brief and a way to ask for help.
 *
 * It replaces a banner plus one long list of every point from every course, where the same line ("Final-year
 * students may apply...") appeared again and again with nothing to say which course it was about. Here a point
 * sits under the course it belongs to. The sections are cut at the text's headings on the server and arrive with
 * their HTML already made, so what is shown is exactly what the editor wrote.
 */

export type AdmissionCourse = { id: string; title: string; html: string; text: string; points: string[] };

export function AdmissionOverview({
  icon,
  label,
  heading,
  collegeName,
  courses,
  words,
  exams,
  cutoffs,
  children,
}: {
  icon: string;
  label: string;
  heading: string;
  collegeName: string;
  courses: AdmissionCourse[];
  words: number;
  exams: string[];
  cutoffs: Cutoff[];
  /** What goes under the course cards: the cut-off snapshot. */
  children?: ReactNode;
}) {
  const Icon = (TAB_ICONS[icon] ?? TAB_ICONS.grad).Icon;
  const [active, setActive] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();

  const shown = courses.filter((c) => (active === "all" || c.id === active) && (!q || `${c.title} ${c.text}`.toLowerCase().includes(q)));
  const totalPoints = courses.reduce((n, c) => n + c.points.length, 0);
  const minutes = Math.max(1, Math.round(words / 200));
  const allOpen = shown.length > 0 && shown.every((c) => open[c.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-soft via-bg-alt to-surface p-5 sm:p-7">
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-brand/10" />
          <div className="relative flex items-center gap-4 sm:gap-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30 sm:h-16 sm:w-16">
              <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand">{label}</p>
              <p className="mt-0.5 font-display text-xl font-extrabold leading-tight tracking-tight text-ink sm:text-2xl">{heading}</p>
            </div>
          </div>
          <ul className="relative mt-4 flex flex-wrap gap-2 text-sm">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 font-medium text-brand-ink">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              {courses.length} {courses.length === 1 ? "course" : "courses"}
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 font-medium text-brand-ink">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              {totalPoints} key points
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 font-medium text-brand-ink">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {minutes} min read
            </li>
          </ul>
        </div>

        {/* Pick a course, or search the text */}
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search eligibility, documents, dates…"
              aria-label="Search the admission details"
              className="w-full rounded-full border border-line bg-bg py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            />
          </div>
          <div role="tablist" aria-label="Admission details by course" className="flex flex-wrap items-center gap-2">
            {[{ id: "all", title: "All courses" }, ...courses].map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active === c.id}
                onClick={() => setActive(c.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${active === c.id ? "border-brand bg-brand text-white" : "border-line bg-bg text-ink-soft hover:border-brand hover:text-brand"}`}
              >
                {c.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(Object.fromEntries(shown.map((c) => [c.id, !allOpen])))}
              className="ml-auto text-sm font-semibold text-brand hover:underline"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>
        </div>

        {/* One card for each course */}
        {shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-soft">Nothing matches &ldquo;{query}&rdquo;. Clear the search or choose another course.</p>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2">
            {shown.map((c, i) => {
              const expanded = !!open[c.id];
              return (
                <article key={c.id} id={`adm-${c.id}`} className={`scroll-mt-48 rounded-2xl border bg-surface p-5 shadow-[0_1px_3px_rgba(28,33,40,0.06)] transition ${expanded ? "border-brand/40 md:col-span-2" : "border-line hover:border-brand/30"}`}>
                  <header className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-sm font-extrabold text-brand-ink">{i + 1}</span>
                    <h3 className="min-w-0 font-display text-lg font-bold leading-snug text-ink">{c.title}</h3>
                  </header>

                  {c.points.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {c.points.slice(0, expanded ? c.points.length : 3).map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                            <Check className="h-3 w-3" aria-hidden="true" />
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {expanded && (
                    <div className="mt-5 border-t border-line-soft pt-4">
                      <div className="rich-text max-w-3xl" dangerouslySetInnerHTML={{ __html: c.html }} />
                    </div>
                  )}

                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen((o) => ({ ...o, [c.id]: !expanded }))}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                  >
                    {expanded ? "Show less" : c.points.length > 3 ? `Full details (${c.points.length - 3} more)` : "Full details"}
                    <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {children}
      </div>

      {/* The facts that hold for every course */}
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-52 lg:self-start">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(28,33,40,0.06)]">
          <h3 className="font-display text-base font-bold text-brand">At a glance</h3>
          <p className="mt-0.5 text-xs text-ink-faint">Admissions at {collegeName}</p>

          {exams.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-ink">Exams accepted</p>
              <ul className="flex flex-wrap gap-1.5">
                {exams.map((e) => (
                  <li key={e} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-ink">Jump to a course</p>
            <ul className="space-y-1">
              {courses.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive("all");
                      setQuery("");
                      requestAnimationFrame(() => document.getElementById(`adm-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-ink-soft transition hover:bg-bg-alt hover:text-brand"
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 text-xs text-ink-faint">{c.points.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {cutoffs.length > 0 && (
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(28,33,40,0.06)]">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-brand">
              <Target className="h-4 w-4" aria-hidden="true" />
              Cut-offs in brief
            </h3>
            <ul className="mt-3 space-y-2">
              {cutoffs.slice(0, 3).map((c, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink-soft">
                    {c.exam} · {c.category}
                  </span>
                  <span className="shrink-0 font-display font-bold text-ink">{c.score}</span>
                </li>
              ))}
            </ul>
            <a href="#cutoff-snapshot" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
              See the full snapshot
            </a>
          </section>
        )}

        <section className="rounded-2xl bg-brand p-5 text-white shadow-lg shadow-brand/20">
          <p className="font-display text-base font-bold">Not sure where to start?</p>
          <p className="mt-1 text-sm text-white/85">A counsellor can match a course to your score and budget. Free, and no spam.</p>
          <Link href="/enquiry" data-track="cta_enquiry" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-brand-ink transition hover:-translate-y-0.5">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Request a callback
          </Link>
        </section>
      </aside>
    </div>
  );
}
