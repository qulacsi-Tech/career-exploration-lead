import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarDays, ClipboardList, IndianRupee, MessagesSquare, Monitor, Sparkles, Users } from "lucide-react";
import type { Exam } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { ExamStatusBadge, examBadgeTone } from "@/components/exam-status-badge";
import { DeadlineCountdown } from "@/components/exams/deadline-countdown";
import { compactCount, daysUntil, examShortName, examVibe } from "@/lib/exam-insights";
import { examKey } from "@/lib/entity-url";

/** Where a shortcut at the foot of the card goes: a tab of the exam's page. */
const SHORTCUTS = [
  { label: "Eligibility", tab: "eligibility" },
  { label: "Pattern & syllabus", tab: "pattern" },
  { label: "Cut-offs", tab: "cutoffs" },
  { label: "FAQs", tab: "faqs" },
] as const;

/**
 * A row on the /exams listing, in the same mould as the college listing card: the registration countdown as the big
 * figure on the left, the name and a friendly line, labelled fact tiles whose values are the stars, and the actions
 * on the right. All the motion is CSS (`group-hover`), so the card stays a server component.
 */
export function ExamCard({
  exam,
  tests = 0,
  students = 0,
  now,
  community,
}: {
  exam: Exam;
  /** The exam's community, when someone has started it. Absent: the card offers to start one. */
  community?: { members: number; posts: number };
  /** How many published practice tests the exam has. */
  tests?: number;
  /** How many students have practised for it. */
  students?: number;
  /** The time the page was read, for the friendly line. */
  now: number;
}) {
  const href = `/exams/${examKey(exam)}`;
  const short = examShortName(exam);
  const days = daysUntil(exam.registrationCloses, now);
  // No registration date yet: no countdown to show. The card says "Upcoming" in its corner instead, and the level
  // it usually shows there moves beside the name.
  const upcoming = days === null;

  return (
    <article className="@container group relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_14px_32px_-14px_rgba(177,36,62,0.4)]">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-top scale-y-[0.35] bg-brand transition duration-300 group-hover:scale-y-100" />
      {upcoming ? (
        <span className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-bl-xl bg-amber-500 px-3 py-1 text-[11px] font-bold tracking-wide text-white">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          Upcoming
        </span>
      ) : (
        <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-[11px] font-bold tracking-wide text-white">{exam.level}</span>
      )}

      <div className="flex gap-4 p-5 pl-6 @2xl:gap-5">
        {/* The countdown to the registration deadline: the number a student cares about most. Left out until there is a date. */}
        {!upcoming && (
          <div className="hidden w-[6.5rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-brand-soft to-bg-alt px-2 py-3 @lg:flex">
            <CalendarClock className="mb-1 h-5 w-5 text-gold transition group-hover:-rotate-12" aria-hidden="true" />
            <span className="transition duration-300 group-hover:scale-110">
              <DeadlineCountdown date={exam.registrationCloses} />
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4 pr-16">
            {exam.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(exam.image)}
                alt=""
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-xl border border-line bg-white object-cover transition duration-300 group-hover:rotate-[-3deg] group-hover:scale-105"
              />
            ) : (
              <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-line bg-brand-soft font-display text-lg font-extrabold text-brand transition duration-300 group-hover:rotate-[-3deg]">
                {short.slice(0, 4)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={href} className="font-display text-lg font-bold leading-snug text-ink transition hover:text-brand @2xl:text-xl">
                  {exam.name}
                </Link>
                {/* The corner already says Upcoming; the admin's own "Upcoming" badge would only repeat it. */}
                {!(upcoming && examBadgeTone(exam.statusLabel ?? "") === "upcoming") && <ExamStatusBadge label={exam.statusLabel} />}
                {upcoming && <span className="rounded-full bg-brand-ink px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white">{exam.level}</span>}
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">
                Conducted by <span className="font-semibold text-ink">{exam.conductingBody}</span>
                {exam.stream && <span className="ml-2 rounded-full border border-line bg-bg-alt px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{exam.stream}</span>}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm italic text-brand-ink/80">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                {examVibe(exam, days, students)}
              </p>
              {(tests > 0 || students > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tests > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold">
                      <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                      {tests} {tests === 1 ? "mock test" : "mock tests"}
                    </span>
                  )}
                  {students > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {compactCount(students)} practised
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 @2xl:flex-row @2xl:items-stretch @2xl:justify-between">
            <dl className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 @md:grid-cols-2 @3xl:grid-cols-4">
              <Fact icon={CalendarClock} label="Registration closes" hint="Mark your calendar" accent>
                {exam.registrationCloses || "Upcoming"}
              </Fact>
              <Fact icon={CalendarDays} label="Exam date" hint="The big day">
                {exam.examDate || "Upcoming"}
              </Fact>
              <Fact icon={IndianRupee} label="Application fee" hint="Your entry ticket">
                {exam.applicationFee || "—"}
              </Fact>
              <Fact icon={Monitor} label="Mode" hint={exam.mode === "Online" ? "From a test centre PC" : exam.mode === "Offline" ? "Pen and paper" : undefined}>
                {exam.mode || "—"}
              </Fact>
            </dl>

            <div className="flex shrink-0 gap-2 @2xl:w-36 @2xl:flex-col @2xl:justify-center">
              {tests > 0 && (
                <Link
                  href={`${href}/practice`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand px-3 py-2 text-sm font-bold text-brand transition hover:bg-brand-soft @2xl:flex-none"
                >
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  Practice
                </Link>
              )}
              <Link
                href={href}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md @2xl:flex-none"
              >
                View details
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <Link
            href={`${href}/community`}
            className="group/comm mt-4 flex items-center gap-3 rounded-xl border border-dashed border-brand/30 bg-brand-soft/40 px-3.5 py-2.5 text-sm transition hover:border-brand hover:bg-brand-soft"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-brand shadow-sm">
              <MessagesSquare className="h-4 w-4" aria-hidden="true" />
            </span>
            {community ? (
              <span className="min-w-0 flex-1 text-ink-soft">
                <strong className="font-semibold text-ink">{short} Community</strong>
                <span className="ml-2">
                  {compactCount(community.members)} {community.members === 1 ? "member" : "members"} · {compactCount(community.posts)} {community.posts === 1 ? "post" : "posts"}
                </span>
              </span>
            ) : (
              <span className="min-w-0 flex-1 text-ink-soft">
                <strong className="font-semibold text-ink">{short} Community</strong>
                <span className="ml-2">Ask, share and celebrate with other aspirants.</span>
              </span>
            )}
            <span className="inline-flex shrink-0 items-center gap-1 font-bold text-brand">
              Join
              <ArrowRight className="h-4 w-4 transition group-hover/comm:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>

          <nav aria-label={`More about ${short}`} className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-line-soft pt-3 text-sm">
            <span className="mr-1 text-ink-faint">Peek inside:</span>
            {SHORTCUTS.map((s, i) => (
              <span key={s.tab} className="inline-flex items-center gap-1">
                {i > 0 && <span aria-hidden="true" className="text-line">&middot;</span>}
                <Link href={`${href}#${s.tab}`} className="group/link inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium text-brand-ink transition hover:bg-brand-soft hover:text-brand">
                  {s.label}
                  <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition group-hover/link:translate-x-0 group-hover/link:opacity-100" aria-hidden="true" />
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </article>
  );
}

/** One fact tile: a small label, the value large in the display face, and a playful line under it. */
function Fact({ icon: Icon, label, hint, accent = false, children }: { icon: typeof CalendarClock; label: string; hint?: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-bg-alt px-3 py-2.5 transition group-hover:bg-brand-soft/50">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-brand shadow-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold text-ink-faint">{label}</dt>
        <dd className={`mt-0.5 truncate font-display text-base font-extrabold leading-tight ${accent ? "text-brand" : "text-ink"}`}>{children}</dd>
        {hint && <p className="mt-0.5 truncate text-xs italic text-brand-ink/70">{hint}</p>}
      </div>
    </div>
  );
}
