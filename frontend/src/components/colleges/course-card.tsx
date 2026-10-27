import Link from "next/link";
import { ArrowRight, Building2, Clock, GraduationCap, IndianRupee, ListChecks, Sparkles } from "lucide-react";
import type { CourseCatalogue } from "@/lib/api";

/**
 * A row on the /courses listing, built like the college listing card: a bar down the left edge that grows
 * when the card is pointed at, a big figure on the left (how many colleges teach it), the name and a line
 * about it, labelled facts, and the buttons.
 *
 * What a visitor is really choosing is the end of the path (MBA, then Finance), so the specialisations get
 * a band of their own, each one a link to the colleges that teach exactly that. The specialisation picked
 * in the filters is drawn solid.
 */
export function CourseCard({ course, activeSpecialisation }: { course: CourseCatalogue; activeSpecialisation?: string }) {
  const href = `/courses/${course.slug}`;
  const colleges = `/colleges?course=${encodeURIComponent(course.name)}`;
  const specs = [...(course.specialisations ?? [])].sort((a, b) => {
    // The one picked first, then the most offered.
    if (activeSpecialisation) {
      if (a.name === activeSpecialisation) return -1;
      if (b.name === activeSpecialisation) return 1;
    }
    return b.collegeCount - a.collegeCount || a.name.localeCompare(b.name);
  });
  const exams = course.examsAccepted;
  const extra = Math.max(0, exams.length - 2);

  return (
    <article className="@container group relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_14px_32px_-14px_rgba(177,36,62,0.4)]">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-top scale-y-[0.35] bg-brand transition duration-300 group-hover:scale-y-100" />

      <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-xs font-bold tracking-wide text-white">{course.level}</span>

      <div className="flex gap-4 p-5 pl-6 @2xl:gap-5">
        <div className="hidden w-[6.25rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-brand-soft to-bg-alt px-2 py-3 text-center @lg:flex" aria-label={`Offered by ${course.collegeCount} colleges`}>
          <Building2 className="h-5 w-5 text-gold transition group-hover:-rotate-12" aria-hidden="true" />
          <span className="mt-0.5 bg-gradient-to-b from-brand to-brand-ink bg-clip-text font-display text-4xl font-extrabold leading-none tracking-tight text-transparent transition duration-300 group-hover:scale-110">
            {course.collegeCount.toLocaleString("en-IN")}
          </span>
          <span className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">{course.collegeCount === 1 ? "College" : "Colleges"}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4 pr-16">
            <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-line bg-brand-soft text-brand transition duration-300 group-hover:rotate-[-3deg] group-hover:scale-105 @2xl:h-[4.5rem] @2xl:w-[4.5rem]">
              <GraduationCap className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <Link href={href} className="font-display text-lg font-bold leading-snug text-ink transition hover:text-brand @2xl:text-xl">
                {course.name}
              </Link>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm italic text-brand-ink/80">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                {course.fullName}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <span className="rounded-full border border-line bg-bg-alt px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{course.stream}</span>
                {course.modes.length > 0 && <span className="text-ink-soft">{course.modes.join(" · ")}</span>}
              </div>
            </div>
          </div>

          {/* The end of the path: the specialisations, each opening the colleges that teach exactly that. */}
          <div className="mt-4 rounded-xl border border-brand/20 bg-gradient-to-r from-brand-soft/70 to-bg-alt/40 px-4 py-3">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">
              <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              Specialisations
              {specs.length > 0 && <span className="rounded-full bg-brand px-1.5 py-px text-[10px] text-white">{specs.length}</span>}
            </p>
            {specs.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {specs.map((s) => {
                  const on = s.name === activeSpecialisation;
                  return (
                    <li key={s.slug}>
                      <Link
                        href={`${colleges}&specialisation=${encodeURIComponent(s.name)}`}
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold transition hover:-translate-y-0.5 ${
                          on ? "border-brand bg-brand text-white shadow-sm" : "border-brand/40 bg-surface text-brand-ink hover:border-brand hover:bg-brand hover:text-white"
                        }`}
                      >
                        {s.name}
                        <span className={`text-xs font-semibold ${on ? "text-white/85" : "text-ink-soft"}`}>{s.collegeCount.toLocaleString("en-IN")}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">Offered as a single programme, with no specialisations.</p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
            {/* Only what was added in the admin: a figure that was never entered is not shown. */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm @2xl:flex @2xl:gap-x-10">
              {course.duration && <Stat icon={Clock} label="Duration">{course.duration}</Stat>}
              {course.averageFees && <Stat icon={IndianRupee} label="Average fees">{course.averageFees}</Stat>}
              {exams.length > 0 && (
                <Stat icon={GraduationCap} label="Exams accepted">
                  {exams.slice(0, 2).join(", ")}
                  {extra > 0 && <span className="font-medium text-brand">, +{extra}</span>}
                </Stat>
              )}
              {course.eligibility && <Stat icon={ListChecks} label="Eligibility">{course.eligibility}</Stat>}
            </dl>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={activeSpecialisation ? `${colleges}&specialisation=${encodeURIComponent(activeSpecialisation)}` : colleges}
                className="inline-flex items-center rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft"
              >
                View Colleges
              </Link>
              <Link href={href} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark">
                Details
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Stat({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="inline-flex items-center gap-1 text-xs text-ink-faint">
        <Icon className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 truncate font-medium text-ink">{children}</dd>
    </div>
  );
}
