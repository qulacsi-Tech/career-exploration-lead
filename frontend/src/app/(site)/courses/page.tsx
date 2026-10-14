import Link from "next/link";
import type { Metadata } from "next";
import { Cog, SlidersHorizontal, X } from "lucide-react";
import { ListingHero, introOf } from "@/components/colleges/listing-hero";
import { CourseCard } from "@/components/colleges/course-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { appliedFilters, simple, type FilterGroup } from "@/components/colleges/filter-utils";
import { getCourses, getHomeData, getListingHeader, type CourseCatalogue } from "@/lib/api";

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

  const [{ data: all }, home, header] = await Promise.all([getCourses({ limit: 200 }), getHomeData(), getListingHeader("courses").catch(() => null)]);

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

  const list = (items: string[]) =>
    items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  const topStreams = [...streamCounts].sort((a, b) => b.count - a.count).slice(0, 3).map((s) => s.name);
  const topExams = distinct(all.flatMap((c) => c.examsAccepted)).slice(0, 4);
  const written = [
    `Explore ${all.length} programmes across ${streamCounts.length} streams on Top College Path.` +
      (popular[0] ? ` The most offered is ${popular[0].name}, available at ${popular[0].collegeCount.toLocaleString()} colleges.` : "") +
      (topStreams.length ? ` Most programmes are in ${list(topStreams)}.` : ""),
    `Each course lists its duration, average fees, study modes and the entrance exams accepted${topExams.length ? `, such as ${list(topExams)}` : ""}. Use the filters to narrow by stream, level, mode or exam, then open a course to see the colleges that offer it.`,
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ListingHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Courses" }]}
        title="Courses"
        countLabel={`${courses.length} ${courses.length === 1 ? "programme" : "programmes"}${courses.length !== all.length ? ` of ${all.length}` : ""}`}
        intro={introOf(header, written)}
        author={header}
      />

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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
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
      </div>
    </div>
  );
}
