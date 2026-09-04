import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { exams } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Entrance Exams: Dates, Registration & Cutoffs",
  description:
    "Entrance exam calendar with conducting bodies, registration deadlines and exam dates for national and state-level tests.",
};

/**
 * The exam index.
 *
 * National tests first, then state — the split is the first thing a candidate
 * filters on, and it is a stable property of the exam rather than a filter that
 * needs building.
 */
export default function ExamsIndexPage() {
  const national = exams.filter((exam) => exam.level === "National");
  const state = exams.filter((exam) => exam.level === "State");

  const groups = [
    { label: "National exams", items: national },
    { label: "State exams", items: state },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Exams" }]} />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Entrance Exams</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {exams.length} exams &middot; registration windows and dates for the current cycle
          </p>
        </div>
        <Link
          href="/enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Exam Alerts
        </Link>
      </div>

      <div className="mt-8 space-y-10">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="font-display text-xl font-bold text-ink">{group.label}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((exam) => (
                <Link
                  key={exam.slug}
                  href={`/exams/${exam.slug}`}
                  className="flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-brand"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-ink">{exam.name}</h3>
                    <Chip tone={exam.level === "National" ? "gold" : "neutral"}>{exam.level}</Chip>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">{exam.conductingBody}</p>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-soft">
                    {exam.description}
                  </p>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 border-t border-line-soft pt-3 text-sm">
                    <div className="min-w-0">
                      <dt className="text-xs text-ink-faint">Registration closes</dt>
                      <dd className="mt-0.5 truncate font-medium text-ink">
                        {exam.registrationCloses}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-ink-faint">Exam date</dt>
                      <dd className="mt-0.5 truncate font-medium text-ink">{exam.examDate}</dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
