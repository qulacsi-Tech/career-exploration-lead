import Link from "next/link";
import type { Metadata } from "next";
import { GraduationCap, ListChecks, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { CourseCard } from "@/components/colleges/course-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { Reveal } from "@/components/college/reveal";
import { appliedFilters, simple, type FilterGroup } from "@/components/colleges/filter-utils";
import { getCourses, type CourseCatalogue } from "@/lib/api";

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
  // Popularity: the priority set in the admin first (1 on top), then the courses taught at the most colleges.
  else out.sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity) || b.collegeCount - a.collegeCount || a.name.localeCompare(b.name));
  return out;
}

type Params = { [key: string]: string | string[] | undefined };
const pick = (params: Params, k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);

/** "MBA Finance Courses": the heading follows the filters picked, ending on the most specific one. */
function headingFor(p: { stream?: string; level?: string; mode?: string; exam?: string; course?: string; specialisation?: string }) {
  const subject = p.course && p.specialisation ? `${p.course} ${p.specialisation}` : (p.specialisation ?? p.course);
  const lead = [p.level, p.mode, p.stream].filter(Boolean).join(" ");
  const base = [lead, subject].filter(Boolean).join(" ").trim();
  const title = base ? `${base} Courses` : "Courses";
  return p.exam ? `${title} Accepting ${p.exam}` : title;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const params = await searchParams;
  const heading = headingFor({ stream: pick(params, "stream"), level: pick(params, "level"), mode: pick(params, "mode"), exam: pick(params, "exam"), course: pick(params, "course"), specialisation: pick(params, "specialisation") });
  return {
    title: heading === "Courses" ? "Courses: Degrees, Eligibility & Fees" : `${heading}: Eligibility, Fees & Colleges`,
    description: "Browse degree programmes and their specialisations across management, engineering, medical and more, with duration, eligibility, average fees and accepted entrance exams.",
  };
}

/**
 * The course directory, laid out like the college listing but opening straight on the list: an applied-filter
 * bar, a filter column, cards that scroll in, and FAQs at the foot (the heading is there for screen readers and search). Each card ends on the specialisations, since
 * that is the end of the path a student is choosing.
 *
 * The catalogue is small (one API page covers it), so facets are read from the data itself and applied here.
 */
export default async function CoursesIndexPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const str = (k: string) => pick(params, k);

  const { data: all } = await getCourses({ limit: 200 });

  const specNames = distinct(all.flatMap((c) => (c.specialisations ?? []).map((s) => s.name)));
  const groups: FilterGroup[] = [
    { id: "stream", label: "Category", options: simple("stream", distinct(all.map((c) => c.stream))) },
    { id: "course", label: "Course", options: simple("course", distinct(all.map((c) => c.name))) },
    { id: "specialisation", label: "Specialisation", options: simple("specialisation", specNames) },
    { id: "level", label: "Course Level", options: simple("level", distinct(all.map((c) => c.level))) },
    { id: "mode", label: "Mode of Study", options: simple("mode", distinct(all.flatMap((c) => c.modes))) },
    { id: "exam", label: "Exam accepted", options: simple("exam", distinct(all.flatMap((c) => c.examsAccepted))) },
  ].filter((g) => g.options.length > 0);

  const stream = str("stream");
  const course = str("course");
  const specialisation = str("specialisation");
  const level = str("level");
  const mode = str("mode");
  const exam = str("exam");
  const sort = str("sort") ?? "popularity";

  const courses = sortCourses(
    all.filter(
      (c) =>
        (!stream || c.stream === stream) &&
        (!course || c.name === course) &&
        (!specialisation || (c.specialisations ?? []).some((s) => s.name === specialisation)) &&
        (!level || c.level === level) &&
        (!mode || c.modes.includes(mode)) &&
        (!exam || c.examsAccepted.includes(exam)),
    ),
    sort,
  );

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string") search.set(k, v);
  const applied = appliedFilters("/courses", groups, search);

  const title = headingFor({ stream, level, mode, exam, course, specialisation });

  const list = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
  const shownSpecs = distinct(courses.flatMap((c) => (c.specialisations ?? []).map((s) => s.name)));
  const shownExams = distinct(courses.flatMap((c) => c.examsAccepted));
  const popular = sortCourses(courses, "popularity").slice(0, 3);
  const levelCounts = distinct(all.map((c) => c.level)).map((l) => [l, all.filter((c) => c.level === l).length] as const);

  const faqs = [
    popular.length > 0 && {
      question: `Which are the most popular ${title.toLowerCase()}?`,
      answer: `${list(popular.map((c) => `${c.name} (${c.collegeCount.toLocaleString("en-IN")} colleges)`))}.`,
    },
    shownSpecs.length > 0 && {
      question: `Which specialisations can I choose in ${title.toLowerCase()}?`,
      answer: `${list(shownSpecs.slice(0, 8))}${shownSpecs.length > 8 ? ` and ${shownSpecs.length - 8} more` : ""}. Open one to see the colleges that teach it.`,
    },
    shownExams.length > 0 && {
      question: "Which entrance exams are accepted?",
      answer: `${list(shownExams.slice(0, 8))}${shownExams.length > 8 ? " and others" : ""}, depending on the course and the college.`,
    },
  ].filter((f): f is { question: string; answer: string } => Boolean(f));

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-5 sm:px-6 lg:px-8">
      <h1 className="sr-only">{title}</h1>

      {/* Filter bar: applied filters on the left, what the catalogue holds on the right */}
      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
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
        <ul className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {levelCounts.map(([name, n]) => (
            <li key={name} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-brand-ink">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              {name} ({n})
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-gold">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            {specNames.length} specialisations
          </li>
        </ul>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 rounded-2xl bg-gradient-to-br from-brand-soft to-bg-alt px-4 py-3">
            <p className="font-display text-lg font-extrabold text-brand-ink">Filters</p>
            <p className="text-sm text-ink-soft">Narrow it down. We will keep the list tidy.</p>
          </div>
          <ListingFilters groups={groups} sorts={SORTS} sort={sort} />
        </aside>

        <div className="min-w-0 space-y-5">
          {courses.map((c) => (
            <Reveal key={c.slug} amount={0.12}>
              <CourseCard course={c} activeSpecialisation={specialisation} />
            </Reveal>
          ))}
          {courses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-6 py-14 text-center">
              <Sparkles className="tcp-float mx-auto h-12 w-12 text-brand/60" aria-hidden="true" />
              <p className="mt-4 font-display text-xl font-bold text-ink">Hmm, nothing here.</p>
              <p className="mx-auto mt-1 max-w-md text-base text-ink-soft">No courses match those filters. Loosen one and try again?</p>
              <Link href="/courses" className="tcp-wiggle mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark">
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </div>

      {faqs.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-ink">FAQs</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-line bg-surface px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink">
                  {faq.question}
                  <span className="text-ink-faint transition group-open:rotate-180">⌄</span>
                </summary>
                <p className="mt-3 text-sm text-ink-soft">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
