"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  IndianRupee,
  MessageSquarePlus,
  Newspaper,
  Phone,
  Sparkles,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CountUp, Reveal, RevealGroup, RevealItem } from "@/components/college/reveal";

/**
 * The livelier bodies for the Infrastructure, Scholarships, Faculty, Compare,
 * Q&A and News tabs.
 *
 * They take plain data, with dates already formatted on the server, so the
 * server and client render agree. Everything reveals with the same rise and
 * stagger as the cards on the other tabs, and every hover is a small lift, so
 * moving between tabs does not change how the page feels.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const TAB_ICON: Record<string, LucideIcon> = {
  building: Building2,
  award: Award,
  grad: GraduationCap,
};

/* ------------------------------------------------------------------ *
   Rich-text tabs: Infrastructure, Scholarships, Admissions
 * ------------------------------------------------------------------ */

/** Banner, topic chips and key-point tiles drawn from the section's own text. */
export function SectionSpotlight({
  icon,
  label,
  collegeName,
  topics,
  points,
  words,
}: {
  icon: string;
  label: string;
  collegeName: string;
  topics: string[];
  points: string[];
  words: number;
}) {
  const Icon = TAB_ICON[icon] ?? Sparkles;
  const minutes = Math.max(1, Math.round(words / 200));

  return (
    <>
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-soft via-bg-alt to-surface p-6 sm:p-9">
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brand/10"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-brand text-white shadow-lg shadow-brand/30">
              <Icon className="h-10 w-10" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{label}</p>
              <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Everything about {label.toLowerCase()} at {collegeName}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {topics.length > 0 && (
                  <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-brand-ink">
                    <CountUp value={topics.length} /> topics
                  </span>
                )}
                {points.length > 0 && (
                  <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-brand-ink">
                    <CountUp value={points.length} /> key points
                  </span>
                )}
                <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-brand-ink">
                  {minutes} min read
                </span>
              </div>
            </div>
          </div>

          {topics.length > 0 && (
            <RevealGroup className="relative mt-6 flex flex-wrap gap-2" stagger={0.05}>
              {topics.map((topic, i) => (
                <RevealItem key={topic}>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                      {i + 1}
                    </span>
                    {topic}
                  </span>
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </div>
      </Reveal>

      {points.length > 0 && (
        <Reveal>
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(28,33,40,0.06)] sm:p-9">
            <h2 className="mb-6 font-display text-xl font-bold tracking-tight text-brand sm:text-2xl">
              Key Highlights
            </h2>
            <RevealGroup className="grid gap-3 sm:grid-cols-2" stagger={0.06}>
              {points.map((point) => (
                <RevealItem key={point}>
                  <div className="group flex h-full items-start gap-3 rounded-xl bg-bg-alt p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-brand-soft hover:shadow-md">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-white transition-transform group-hover:scale-110">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm leading-relaxed text-ink">{point}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </Reveal>
      )}
    </>
  );
}

/** The band a section ends on: talk to a counsellor. */
export function CounsellorBand({ label, collegeName }: { label: string; collegeName: string }) {
  return (
    <Reveal>
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="font-display text-xl font-bold">Want the latest on {label.toLowerCase()}?</p>
          <p className="mt-1 text-sm text-white/80">
            A counsellor can get current details from {collegeName}, free.
          </p>
        </div>
        <Link
          href="/enquiry" data-track="cta_enquiry"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Phone className="h-4 w-4" />
          Request a Callback
        </Link>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ *
   Faculty
 * ------------------------------------------------------------------ */

const initials = (name: string) =>
  name
    .replace(/^(dr|prof|mr|ms|mrs)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export type FacultyMemberItem = { name: string; designation: string; department: string; qualification: string };

export function FacultyShowcase({
  count,
  ratio,
  phdPercent,
  members,
}: {
  count: number | null;
  ratio: string;
  phdPercent: number | null;
  members: FacultyMemberItem[];
}) {
  const tiles: { icon: LucideIcon; label: string; node: ReactNode }[] = [];
  if (count !== null)
    tiles.push({ icon: Users, label: "Faculty members", node: <CountUp value={count} /> });
  if (ratio) tiles.push({ icon: GraduationCap, label: "Student to faculty ratio", node: ratio });
  if (phdPercent !== null)
    tiles.push({ icon: Award, label: "Hold a PhD", node: <CountUp value={phdPercent} suffix="%" /> });

  return (
    <div className="space-y-8">
      {tiles.length > 0 && (
        <RevealGroup className="grid gap-4 sm:grid-cols-3" stagger={0.1}>
          {tiles.map(({ icon: Icon, label, node }) => (
            <RevealItem key={label}>
              <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-soft to-bg-alt p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                <Icon aria-hidden className="absolute -right-3 -top-3 h-24 w-24 text-brand/10" />
                <p className="relative font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
                  {node}
                </p>
                <p className="relative mt-2 text-sm font-medium text-brand-ink">{label}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      {members.length > 0 && (
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">Meet the faculty</p>
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
            {members.map((m) => (
              <RevealItem key={m.name}>
                <article className="group h-full rounded-2xl border border-line bg-surface p-5 transition duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_12px_28px_-14px_rgba(177,36,62,0.4)]">
                  <div className="flex items-center gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark font-display text-lg font-bold text-white transition-transform group-hover:rotate-3 group-hover:scale-105">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold text-ink">{m.name}</p>
                      <p className="truncate text-sm text-ink-soft">{m.designation || "Faculty"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {m.department && (
                      <span className="rounded-full bg-brand-soft px-2.5 py-1 font-medium text-brand-ink">
                        {m.department}
                      </span>
                    )}
                    {m.qualification && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-bg-alt px-2.5 py-1 font-medium text-ink-soft">
                        <GraduationCap className="h-3 w-3" />
                        {m.qualification}
                      </span>
                    )}
                  </div>
                </article>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Compare
 * ------------------------------------------------------------------ */

export type DuelCollege = {
  slug: string;
  name: string;
  location: string;
  rank: number;
  authority: string;
  rating: number;
  fees: string;
};

/** The colleges squared up: the one being viewed against its closest peers. */
export function VsDuel({ colleges }: { colleges: DuelCollege[] }) {
  const bestRating = Math.max(...colleges.map((c) => c.rating));

  return (
    <RevealGroup
      className={`grid gap-4 ${colleges.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}
      stagger={0.12}
    >
      {colleges.map((c, i) => (
        <RevealItem key={c.slug} className="relative">
          <article
            className={`group relative h-full overflow-hidden rounded-2xl border p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg ${
              i === 0 ? "border-brand/40 bg-brand-soft" : "border-line bg-surface"
            }`}
          >
            {i === 0 && (
              <span className="absolute right-0 top-0 rounded-bl-xl bg-brand px-3 py-1 text-[11px] font-bold tracking-wide text-white">
                Viewing
              </span>
            )}
            <span
              className={`grid h-12 w-12 place-items-center rounded-2xl font-display text-lg font-bold text-white ${
                i === 0 ? "bg-brand" : "bg-brand-ink"
              }`}
            >
              {initials(c.name)}
            </span>
            <Link
              href={`/college/${c.slug}`}
              className="mt-3 block font-display text-lg font-bold leading-snug text-ink hover:text-brand"
            >
              {c.name}
            </Link>
            <p className="mt-0.5 text-sm text-ink-soft">{c.location}</p>

            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/70 px-2 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-ink-faint">{c.authority}</dt>
                <dd className="mt-1 font-display text-xl font-extrabold text-ink">
                  {c.rank > 0 ? `#${c.rank}` : "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-white/70 px-2 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-ink-faint">Rating</dt>
                <dd className="mt-1 inline-flex items-center gap-1 font-display text-xl font-extrabold text-ink">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {c.rating.toFixed(1)}
                </dd>
                {c.rating === bestRating && colleges.length > 1 && (
                  <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-emerald-700">
                    <Trophy className="h-3 w-3" /> Top
                  </span>
                )}
              </div>
              <div className="rounded-xl bg-white/70 px-2 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-ink-faint">Fees</dt>
                <dd className="mt-1 flex items-center justify-center gap-0.5 text-sm font-bold text-ink">
                  <IndianRupee className="h-3 w-3 shrink-0" />
                  <span className="truncate">{c.fees.replace(/^₹\s*/, "") || "—"}</span>
                </dd>
              </div>
            </dl>
          </article>

          {i < colleges.length - 1 && (
            <span
              aria-hidden
              className="absolute -right-5 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-brand-ink text-[11px] font-black text-white shadow-md md:grid"
            >
              VS
            </span>
          )}
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

export type CuratedItem = { slug: string; title: string; intro: string };

export function CuratedComparisons({ items }: { items: CuratedItem[] }) {
  return (
    <RevealGroup className="grid gap-4 sm:grid-cols-2" stagger={0.08}>
      {items.map((c) => (
        <RevealItem key={c.slug}>
          <Link
            href={`/compare/${c.slug}`}
            className="group relative block h-full overflow-hidden rounded-2xl border border-line bg-bg-alt p-5 transition duration-200 hover:-translate-y-1 hover:border-brand/40 hover:bg-brand-soft hover:shadow-md"
          >
            <span className="mb-3 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-ink text-[10px] font-black text-white">
              VS
            </span>
            <h3 className="font-display text-lg font-bold text-ink group-hover:text-brand">{c.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">{c.intro}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
              Read the comparison
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

/* ------------------------------------------------------------------ *
   Q&A
 * ------------------------------------------------------------------ */

export function QaList({ faqs, collegeName }: { faqs: { question: string; answer: string }[]; collegeName: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-soft via-bg-alt to-surface p-5 sm:p-6">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
            <HelpCircle className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold text-ink">
              <CountUp value={faqs.length} /> questions answered
            </p>
            <p className="text-sm text-ink-soft">What students and parents ask most about {collegeName}.</p>
          </div>
        </div>
      </Reveal>

      <RevealGroup as="div" className="space-y-3" stagger={0.06}>
        {faqs.map((faq, i) => {
          const isOpen = open === i;
          return (
            <RevealItem key={faq.question}>
              <div
                className={`overflow-hidden rounded-2xl border transition duration-200 ${
                  isOpen ? "border-brand/40 bg-brand-soft/50 shadow-md" : "border-line bg-surface hover:border-brand/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-sm font-bold transition ${
                      isOpen ? "bg-brand text-white" : "bg-brand-soft text-brand"
                    }`}
                  >
                    Q{i + 1}
                  </span>
                  <span className="flex-1 text-base font-semibold text-ink">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-brand transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-4 px-4 pb-5 sm:px-5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white font-display text-sm font-bold text-brand shadow-sm">
                          A
                        </span>
                        <p className="pt-1.5 text-base leading-relaxed text-ink-soft">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </RevealItem>
          );
        })}
      </RevealGroup>

      <Reveal>
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand p-6 text-white sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-lg font-bold">Have a question that is not answered here?</p>
            <p className="mt-1 text-sm text-white/80">Ask us and a counsellor will get back to you.</p>
          </div>
          <Link
            href="/enquiry" data-track="cta_enquiry"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Ask a question
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ *
   News
 * ------------------------------------------------------------------ */

export type AlertItem = { title: string; kind: string; date: string; link: string; urgent: boolean };
export type ArticleItem = { title: string; date: string; author: string; summary: string; paragraphs: string[] };
export type PressItem = { title: string; meta: string; link: string };

export function AlertCards({ alerts }: { alerts: AlertItem[] }) {
  return (
    <RevealGroup className="grid gap-3 sm:grid-cols-2" stagger={0.07}>
      {alerts.map((a) => {
        const body = (
          <>
            <div className="flex items-center gap-2">
              {a.urgent && (
                <span aria-hidden className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  a.urgent ? "bg-brand text-white" : "bg-white text-brand-ink"
                }`}
              >
                {a.kind}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-faint">
                <CalendarDays className="h-3.5 w-3.5" />
                {a.date}
              </span>
            </div>
            <p className="mt-3 font-semibold leading-snug text-ink">{a.title}</p>
          </>
        );
        const cls = `block h-full rounded-2xl border-l-4 p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
          a.urgent ? "border-brand bg-brand-soft" : "border-line bg-bg-alt"
        }`;
        return (
          <RevealItem key={`${a.date}-${a.title}`}>
            {a.link ? (
              <Link href={a.link} className={cls}>
                {body}
              </Link>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}

/** Stories down a vertical rail, each behind a date bubble. */
export function NewsTimeline({ articles }: { articles: ArticleItem[] }) {
  return (
    <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-0.5 before:bg-gradient-to-b before:from-brand before:to-line">
      {articles.map((a) => (
        <Reveal as="li" key={`${a.date}-${a.title}`} className="relative pl-14">
          <span className="absolute left-0 top-1 grid h-10 w-10 place-items-center rounded-full border-4 border-surface bg-brand text-white shadow-md">
            <Newspaper className="h-4 w-4" />
          </span>
          <details className="group rounded-2xl border border-line bg-surface p-5 transition duration-200 open:border-brand/40 open:shadow-md hover:border-brand/40">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  {a.date}
                  {a.author && <span className="text-ink-faint"> &middot; {a.author}</span>}
                </p>
                <h3 className="mt-1.5 font-display text-lg font-bold leading-snug text-ink group-hover:text-brand sm:text-xl">
                  {a.title}
                </h3>
                {a.summary && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{a.summary}</p>}
              </div>
              {a.paragraphs.length > 0 && (
                <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-brand transition-transform duration-300 group-open:rotate-180" />
              )}
            </summary>
            {a.paragraphs.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-line-soft pt-4 text-sm leading-relaxed text-ink-soft">
                {a.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </details>
        </Reveal>
      ))}
    </ol>
  );
}

export function PressGrid({ items }: { items: PressItem[] }) {
  return (
    <RevealGroup className="grid gap-3 sm:grid-cols-2" stagger={0.06}>
      {items.map((p) => {
        const inner = (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">{p.meta || "Press"}</p>
            <p className="mt-1.5 font-medium leading-snug text-ink">{p.title}</p>
            {p.link && (
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                Read <ExternalLink className="h-3 w-3" />
              </span>
            )}
          </>
        );
        const cls =
          "block h-full rounded-2xl border border-line bg-bg-alt p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-soft hover:shadow-md";
        return (
          <RevealItem key={`${p.meta}-${p.title}`}>
            {p.link ? (
              <a href={p.link} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
                {inner}
              </a>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
