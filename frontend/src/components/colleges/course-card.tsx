import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { CourseCatalogue } from "@/lib/api";

/** A row on the /courses listing, styled to match the college listing card. */
export function CourseCard({ course }: { course: CourseCatalogue }) {
  const href = `/courses/${course.slug}`;
  const exams = course.examsAccepted;
  const extra = Math.max(0, exams.length - 2);

  return (
    <article className="@container relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_24px_-12px_rgba(177,36,62,0.35)]">
      <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-[11px] font-bold tracking-wide text-white">
        {course.level}
      </span>

      <div className="p-5">
        <div className="flex items-start gap-4 pr-20">
          <span
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-line bg-brand-soft text-brand @2xl:h-16 @2xl:w-16"
          >
            <GraduationCap className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <Link
              href={href}
              className="font-display text-base font-semibold leading-snug text-ink hover:text-brand @2xl:text-lg"
            >
              {course.name}
            </Link>
            <p className="mt-1 text-sm text-ink-soft">{course.fullName}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
              <span>{course.stream}</span>
              {course.modes.length > 0 && <span>{course.modes.join(" · ")}</span>}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm @2xl:flex @2xl:gap-x-10">
            <Stat label="Duration">{course.duration}</Stat>
            <Stat label="Average Fees">{course.averageFees || "—"}</Stat>
            <Stat label="Colleges">
              <Link
                href={`/colleges?course=${encodeURIComponent(course.name)}`}
                className="font-medium text-brand hover:underline"
              >
                {course.collegeCount.toLocaleString()} colleges
              </Link>
            </Stat>
            <Stat label="Exams Accepted">
              {exams.length ? (
                <>
                  {exams.slice(0, 2).join(", ")}
                  {extra > 0 && <span className="font-medium text-brand">, +{extra}</span>}
                </>
              ) : (
                "—"
              )}
            </Stat>
          </dl>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/colleges?course=${encodeURIComponent(course.name)}`}
              className="inline-flex items-center rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft"
            >
              View Colleges
            </Link>
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-1 truncate font-medium text-ink">{children}</dd>
    </div>
  );
}
