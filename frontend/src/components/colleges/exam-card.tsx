import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarDays, CheckCircle2, ClipboardList, IndianRupee, Lock, MessagesSquare, Monitor } from "lucide-react";
import type { Exam } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { ExamStatusBadge, examBadgeTone } from "@/components/exam-status-badge";
import { DeadlineCountdown } from "@/components/exams/deadline-countdown";
import { compactCount, daysUntil, examShortName, parseExamDate } from "@/lib/exam-insights";
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
/** The corner chip for each stage that is not "open" (an open exam shows its level there). */
const STATUS = {
  upcoming: { label: "Upcoming", tone: "bg-amber-500", icon: CalendarClock },
  open: null,
  closed: { label: "Registration closed", tone: "bg-slate-600", icon: Lock },
  over: { label: "Exam over", tone: "bg-slate-500", icon: CheckCircle2 },
} as const;

export function ExamCard({
  exam,
  tests = 0,
  students = 0,
  now,
  community,
}: {
  exam: Exam;
  /** The exam's community counts. Absent: the strip shows without them. */
  community?: { members: number; posts: number };
  /** How many published practice tests the exam has. */
  tests?: number;
  /** How many students have practised for it. */
  students?: number;
  /** The time the page was read: where the exam stands (open, closed, over) is worked out against it. */
  now: number;
}) {
  const href = `/exams/${examKey(exam)}`;
  const short = examShortName(exam);
  const days = daysUntil(exam.registrationCloses, now);
  const examDays = daysUntil(exam.examDate, now);
  const examAt = parseExamDate(exam.examDate);
  // Where the exam stands, read from its dates. Open: the registration countdown on the left, the level in the corner.
  // Otherwise the corner says the status (as a chip) and the level moves beside the name; once registration has
  // closed, the left block shows the exam date instead of a countdown that has run out.
  const stage: "upcoming" | "open" | "closed" | "over" =
    days === null ? "upcoming" : days >= 0 ? "open" : examDays !== null && examDays < 0 ? "over" : "closed";
  const status = STATUS[stage];
  // The admin's preset badges (Upcoming, Live, Expired) can contradict the dates, so the card shows the status the
  // dates give instead; words of the admin's own ("Results out") are kept.
  const adminBadge = examBadgeTone(exam.statusLabel ?? "") === "custom";
  // While registration is open, a chip beside the name says so (closing soon in the last week).
  const openChip = stage === "open" ? (days !== null && days <= 7 ? { label: "Closing soon", tone: "bg-red-600" } : { label: "Registration open", tone: "bg-emerald-600" }) : null;

  return (
    <article className="@container group relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_14px_32px_-14px_rgba(177,36,62,0.4)]">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-top scale-y-[0.35] bg-brand transition duration-300 group-hover:scale-y-100" />
      {status ? (
        <span className={`absolute right-0 top-0 inline-flex items-center gap-1 rounded-bl-xl px-3 py-1 text-[11px] font-bold tracking-wide text-white ${status.tone}`}>
          <status.icon className="h-3.5 w-3.5" aria-hidden="true" />
          {status.label}
        </span>
      ) : (
        <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-[11px] font-bold tracking-wide text-white">{exam.level}</span>
      )}

      <div className="flex gap-4 p-5 pl-6 @2xl:gap-5">
        {/* While registration is open: the countdown to its deadline, the number a student cares about most. */}
        {stage === "open" && (
          <div className="hidden w-[6.5rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-brand-soft to-bg-alt px-2 py-3 @lg:flex">
            <CalendarClock className="mb-1 h-5 w-5 text-gold transition group-hover:-rotate-12" aria-hidden="true" />
            <span className="transition duration-300 group-hover:scale-110">
              <DeadlineCountdown date={exam.registrationCloses} />
            </span>
          </div>
        )}
        {/* Registration closed: the exam date takes its place, with how far away it is. */}
        {(stage === "closed" || stage === "over") && (
          <div className="hidden w-[6.5rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-brand-soft to-bg-alt px-2 py-3 text-center @lg:flex">
            <CalendarDays className="mb-1 h-5 w-5 text-gold transition group-hover:-rotate-12" aria-hidden="true" />
            {examAt !== null ? (
              <span className="flex flex-col items-center transition duration-300 group-hover:scale-110">
                <span className="bg-gradient-to-b from-brand to-brand-ink bg-clip-text font-display text-4xl font-extrabold leading-none text-transparent">
                  {new Date(examAt).getDate()}
                </span>
                <span className="mt-0.5 text-xs font-bold text-brand-ink">
                  {new Date(examAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>
              </span>
            ) : (
              <span className="font-display text-sm font-extrabold leading-tight text-brand-ink">{exam.examDate || "Date soon"}</span>
            )}
            <span className="mt-1.5 text-[11px] font-bold text-brand">
              {stage === "over" ? "Exam held" : examDays === 0 ? "Exam today" : examDays !== null ? `Exam in ${examDays} ${examDays === 1 ? "day" : "days"}` : "Exam date"}
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
                {openChip && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white ${openChip.tone}`}>{openChip.label}</span>}
                {adminBadge && <ExamStatusBadge label={exam.statusLabel} />}
                {status && <span className="rounded-full bg-brand-ink px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white">{exam.level}</span>}
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">
                Conducted by <span className="font-semibold text-ink">{exam.conductingBody}</span>
                {exam.stream && <span className="ml-2 rounded-full border border-line bg-bg-alt px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{exam.stream}</span>}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 @2xl:flex-row @2xl:items-stretch @2xl:justify-between">
            <dl className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 @md:grid-cols-2 @3xl:grid-cols-4">
              <Fact icon={CalendarClock} label="Registration closes" accent title={exam.registrationCloses}>
                {exam.registrationCloses || "Upcoming"}
              </Fact>
              <Fact icon={CalendarDays} label="Exam date" title={exam.examDate}>
                {exam.examDate || "Upcoming"}
              </Fact>
              <Fact icon={IndianRupee} label="Application fee" title={exam.applicationFee}>
                {exam.applicationFee || "—"}
              </Fact>
              <Fact icon={Monitor} label="Mode">
                {exam.mode || "—"}
              </Fact>
            </dl>

            <div className="flex shrink-0 gap-2 @2xl:w-36 @2xl:flex-col @2xl:justify-center">
              <Link
                href={href}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md @2xl:flex-none"
              >
                View details
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Mock tests are what most students come back for: when the exam has any, they get a strip of their own. */}
          {tests > 0 && (
            <Link
              href={`${href}/practice`}
              className="group/practice mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-gradient-to-r from-gold-soft via-amber-50 to-surface px-3.5 py-3 transition hover:border-gold hover:shadow-sm"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-amber-300 to-gold text-brand-ink shadow-sm">
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-extrabold text-ink">
                  {tests} free {tests === 1 ? "mock test" : "mock tests"}
                  <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white">Practice</span>
                </span>
                <span className="block text-sm text-ink-soft">
                  Real exam interface, solutions and your rank{students > 0 ? ` · ${compactCount(students)} ${students === 1 ? "student has" : "students have"} practised` : ""}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition group-hover/practice:bg-brand-dark">
                Start practice
                <ArrowRight className="h-4 w-4 transition group-hover/practice:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          )}

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
function Fact({ icon: Icon, label, accent = false, title, children }: { icon: typeof CalendarClock; label: string; accent?: boolean; title?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-bg-alt px-3 py-2.5 transition group-hover:bg-brand-soft/50">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-brand shadow-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold text-ink-faint">{label}</dt>
        <dd title={title || undefined} className={`mt-0.5 line-clamp-2 break-words font-display text-base font-extrabold leading-tight ${accent ? "text-brand" : "text-ink"}`}>{children}</dd>
      </div>
    </div>
  );
}
