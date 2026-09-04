import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { courses, homeStreams } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Courses: Degrees, Eligibility & Fees",
  description:
    "Browse degree programmes across management, engineering, medical and more — with duration, eligibility, average fees and accepted entrance exams.",
};

/**
 * The course directory, grouped by stream.
 *
 * Grouped rather than one flat A–Z list because that is how the choice is
 * actually made: nobody is deciding between an MBA and an MBBS, so a list that
 * interleaves them makes the reader do the sorting the page should have done.
 */
export default function CoursesIndexPage() {
  const byStream = homeStreams
    .map((stream) => ({
      stream,
      items: courses.filter((course) => course.stream === stream.name),
    }))
    // Streams with no courses in the directory yet are dropped rather than
    // rendered as an empty heading.
    .filter((group) => group.items.length > 0);

  const ungrouped = courses.filter(
    (course) => !homeStreams.some((stream) => stream.name === course.stream),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Courses" }]} />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Courses</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {courses.length} programmes across {byStream.length} streams
          </p>
        </div>
        <Link
          href="/enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Free Counselling
        </Link>
      </div>

      <div className="mt-8 space-y-10">
        {[...byStream, ...(ungrouped.length ? [{ stream: { slug: "other", name: "Other", count: ungrouped.length }, items: ungrouped }] : [])].map(
          ({ stream, items }) => (
            <section key={stream.slug}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-ink">{stream.name}</h2>
                <Link
                  href={`/${stream.slug}/colleges`}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Browse {stream.name.toLowerCase()} colleges →
                </Link>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((course) => (
                  <Link
                    key={course.slug}
                    href={`/courses/${course.slug}`}
                    className="rounded-2xl border border-line bg-surface p-5 transition hover:border-brand"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-ink">
                        {course.name}
                      </h3>
                      <Chip>{course.level}</Chip>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{course.fullName}</p>

                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="min-w-0">
                        <dt className="text-xs text-ink-faint">Duration</dt>
                        <dd className="mt-0.5 truncate font-medium text-ink">{course.duration}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-ink-faint">Average fees</dt>
                        <dd className="mt-0.5 truncate font-medium text-ink">
                          {course.averageFees}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-ink-faint">Colleges</dt>
                        <dd className="mt-0.5 truncate font-medium text-ink">
                          {course.collegeCount.toLocaleString()}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-ink-faint">Exams</dt>
                        <dd className="mt-0.5 truncate font-medium text-ink">
                          {course.examsAccepted.slice(0, 2).join(", ") || "—"}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
