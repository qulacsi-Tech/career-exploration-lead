import Link from "next/link";
import type { Metadata } from "next";
import { Cog, SlidersHorizontal, X } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CourseCard } from "@/components/colleges/course-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { appliedFilters, simple, type FilterGroup } from "@/components/colleges/filter-utils";
import { getCourses, getHomeData, type CourseCatalogue } from "@/lib/api";

export const metadata: Metadata = {
  title: "Courses: Degrees, Eligibility & Fees",
  description:
    "Browse degree programmes across management, engineering, medical and more — with duration, eligibility, average fees and accepted entrance exams.",
};

const SORTS = [
  { key: "popularity", label: "Popularity" },
  { key: "name", label: "Name (A–Z)" },
  { key: "duration", label: "Shortest duration" },
];

/** "24 Months" / "2 Years" -> months, for sorting. Unparseable sorts last. */
function months(duration: string) {
  const m = duration.match(/(\d+(?:\.\d+)?)\s*(year|yr|month)/i);
  if (!m) return Number.POSITIVE_INFINITY;
  return /^y/i.test(m[2]) ? Number(m[1]) * 12 : Number(m[1]);
}

const distinct = (values: string[]) => [...new Set(values.filter(Boolean))].sort();

function sortCourses(list: CourseCatalogue[], sort: string) {
  const out = [...list];
  if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "duration") out.sort((a, b) => months(a.duration) - months(b.duration));
  else out.sort((a, b) => b.collegeCount - a.collegeCount);
  return out;
}

/**
 * The course directory, laid out like the college listing: an applied-filter
 * bar, an accordion filter column, rows with a corner level badge, and a tinted
 * rail.
 *
 * The catalogue is small (one API page covers it), so facets are read from the
 * data itself and applied here rather than as more API parameters.
 */
export default async function CoursesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);

  const [{ data: all }, home] = await Promise.all([getCourses({ limit: 200 }), getHomeData()]);

  const groups: FilterGroup[] = [
    { id: "stream", label: "Stream", options: simple("stream", distinct(all.map((c) => c.stream))) },
    { id: "level", label: "Course Level", options: simple("level", distinct(all.map((c) => c.level))) },
    { id: "mode", label: "Mode of Study", options: simple("mode", distinct(all.flatMap((c) => c.modes))) },
    { id: "exam", label: "Exam accepted", options: simple("exam", distinct(all.flatMap((c) => c.examsAccepted))) },
  ];

  const stream = str("stream");
  const level = str("level");
  const mode = str("mode");
  const exam = str("exam");
  const sort = str("sort") ?? "popularity";

  const courses = sortCourses(
    all.filter(
      (c) =>
        (!stream || c.stream === stream) &&
        (!level || c.level === level) &&
        (!mode || c.modes.includes(mode)) &&
        (!exam || c.examsAccepted.includes(exam)),
    ),
    sort,
  );

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string") search.set(k, v);
  const applied = appliedFilters("/courses", groups, search);

  const streamCounts = distinct(all.map((c) => c.stream)).map((name) => ({
    name,
    count: all.filter((c) => c.stream === name).length,
    slug: home.streams.find((s) => s.name === name)?.slug,
  }));
  const popular = sortCourses(all, "popularity").slice(0, 5);
  const levelCounts = distinct(all.map((c) => c.level)).map(
    (level) => [level, all.filter((c) => c.level === level).length] as const,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Courses" }]} />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Courses</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {courses.length} {courses.length === 1 ? "programme" : "programmes"}
            {courses.length !== all.length && ` of ${all.length}`}
          </p>
        </div>
        <Link
          href="/enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Free Counselling
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 pr-2 text-sm font-medium text-ink">
            <SlidersHorizontal className="h-4 w-4 text-brand" />
            Filters
          </span>
          {applied.map((f) => (
            <Link
              key={f.id}
              href={f.clear}
              scroll={false}
              aria-label={`Remove filter ${f.label}`}
              className="inline-flex items-center gap-2 rounded-lg bg-bg-alt px-3 py-1.5 text-sm text-ink-soft transition hover:bg-brand-soft hover:text-brand-ink"
            >
              {f.label}
              <X className="h-3.5 w-3.5" />
            </Link>
          ))}
          {applied.length === 0 && <span className="text-sm text-ink-faint">None applied</span>}
          {applied.length > 1 && (
            <Link href="/courses" className="text-sm font-medium text-brand hover:underline">
              Clear all
            </Link>
          )}
        </div>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
          {levelCounts.map(([name, n]) => (
            <li key={name} className="inline-flex items-center gap-1.5">
              <Cog className="h-4 w-4 text-brand" />
              {name} ({n})
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ListingFilters groups={groups} sorts={SORTS} sort={sort} />
        </aside>

        <div className="min-w-0 space-y-4">
          {courses.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
          {courses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-6 py-14 text-center">
              <p className="text-sm text-ink-soft">No courses match these filters.</p>
              <Link href="/courses" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
                Clear filters
              </Link>
            </div>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Browse by stream</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {streamCounts.map((s) => (
                <Link
                  key={s.name}
                  href={`/courses?stream=${encodeURIComponent(s.name)}`}
                  className="rounded-lg bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-ink transition hover:bg-white hover:shadow-sm"
                >
                  {s.name}
                  <span className="ml-1 text-brand">({s.count})</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Most colleges</p>
            <p className="mt-1 font-display text-lg font-semibold text-brand-ink">Popular Courses</p>
            <ul className="mt-4 space-y-2.5 text-sm text-brand-ink/80">
              {popular.map((c) => (
                <li key={c.slug} className="flex justify-between gap-3">
                  <Link href={`/courses/${c.slug}`} className="min-w-0 truncate hover:text-brand">
                    {c.name}
                  </Link>
                  <span className="shrink-0 font-medium">{c.collegeCount.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Not sure which course?</p>
            <p className="mt-2 text-sm text-brand-ink/80">
              Free guidance on eligibility, fees and which colleges to target.
            </p>
            <Link
              href="/enquiry"
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Request a Callback
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
