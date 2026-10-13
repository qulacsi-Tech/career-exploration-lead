import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { Exam } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { ExamStatusBadge } from "@/components/exam-status-badge";

/** A row on the /exams listing, styled to match the college and course cards. */
export function ExamCard({ exam }: { exam: Exam }) {
  const href = `/exams/${exam.slug}`;

  return (
    <article className="@container relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_24px_-12px_rgba(177,36,62,0.35)]">
      <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-[11px] font-bold tracking-wide text-white">
        {exam.level}
      </span>

      <div className="p-5">
        <div className="flex items-start gap-4 pr-20">
          {exam.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(exam.image)}
              alt={`${exam.name}`}
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover @2xl:h-16 @2xl:w-16"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-line bg-brand-soft text-brand @2xl:h-16 @2xl:w-16"
            >
              <FileText className="h-7 w-7" />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                href={href}
                className="font-display text-base font-semibold leading-snug text-ink hover:text-brand @2xl:text-lg"
              >
                {exam.name}
              </Link>
              <ExamStatusBadge label={exam.statusLabel} />
            </div>
            <p className="mt-1 text-sm text-ink-soft">{exam.conductingBody}</p>
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-ink-soft">{exam.description}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm @2xl:flex @2xl:gap-x-10">
            <Stat label="Registration Closes">
              <span className="text-brand">{exam.registrationCloses || "—"}</span>
            </Stat>
            <Stat label="Exam Date">{exam.examDate || "—"}</Stat>
            <Stat label="Mode">{exam.mode || "—"}</Stat>
            <Stat label="Stream">{exam.stream || "—"}</Stat>
          </dl>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`${href}/practice`}
              className="inline-flex items-center rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft"
            >
              Practice
            </Link>
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              View Details
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
