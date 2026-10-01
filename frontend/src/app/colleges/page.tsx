import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CollegeCard } from "@/components/college-card";
import { Chip } from "@/components/ui/chip";
import { getColleges } from "@/lib/api";

// Static FAQ data — remains hardcoded until a CMS FAQ endpoint is built
const faqs = [
  {
    question: "What is the eligibility criteria for pursuing an MBA?",
    answer:
      "For most full-time MBA programmes, candidates need a bachelor's degree with at least 50% aggregate marks (45% for reserved categories) from a recognised university, along with a valid CAT, XAT, GMAT or equivalent score.",
  },
  {
    question: "What are the best government MBA colleges in India?",
    answer:
      "Government-run and centrally funded MBA programmes are offered through the IIMs, FMS Delhi, and several state-run university departments, each with its own entrance exam and cutoff.",
  },
  {
    question: "How much does an MBA typically cost in India?",
    answer:
      "Total fees range from roughly ₹2L at government institutes to ₹25L+ at top private and deemed universities, depending on ranking, mode of study, and specialisation.",
  },
];

const filterGroups = [
  { label: "Location", options: ["Bangalore", "Hyderabad", "Pune", "Mumbai", "Delhi NCR"] },
  { label: "Course", options: ["MBA", "PGDM", "Executive MBA", "Ph.D."] },
  { label: "Specialisation", options: ["Finance", "Marketing", "Analytics", "HR", "Operations"] },
  { label: "Fees", options: ["Under ₹5L", "₹5L - 10L", "₹10L - 20L", "Above ₹20L"] },
  { label: "Approval", options: ["AICTE", "UGC", "NAAC A++"] },
  { label: "Ranking", options: ["NIRF Top 25", "NIRF Top 50", "NIRF Top 100"] },
  { label: "Exam Accepted", options: ["CAT", "XAT", "GMAT", "MAT", "CMAT"] },
  { label: "Mode of Study", options: ["Full Time", "Executive / Weekend", "Online"] },
  { label: "Ownership", options: ["Private", "Government", "Deemed"] },
];

export default async function CollegesListingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const activeFilters = Object.entries(params).filter(([, v]) => v);

  // Read pagination / sort from query params
  const page = params.page ? Number(params.page) : 1;
  const sort = typeof params.sort === "string" ? params.sort : "popularity";
  const q = typeof params.q === "string" ? params.q : undefined;

  // Fetch from live API
  const { data: colleges, meta } = await getColleges({ page, limit: 20, sort, q });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Courses", href: "/courses" },
          { label: "Business & Management Studies" },
        ]}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            Business &amp; Management Studies Colleges
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{meta.total} Results</p>
        </div>
        <Link
          href="/enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Free Counselling
        </Link>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => (
            <Chip key={key} tone="brand">
              {String(value)}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr_280px]">
        {/* Filters sidebar */}
        <aside className="space-y-1">
          <p className="mb-2 text-sm font-semibold text-ink">Filters</p>
          {filterGroups.map((group) => (
            <details key={group.label} className="group rounded-lg border border-line-soft px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink">
                {group.label}
                <span className="text-ink-faint transition group-open:rotate-180">⌄</span>
              </summary>
              <ul className="mt-2 space-y-1.5 pb-1">
                {group.options.map((opt) => (
                  <li key={opt}>
                    <label className="flex items-center gap-2 text-sm text-ink-soft">
                      <input type="checkbox" className="rounded border-line accent-[var(--color-brand)]" />
                      {opt}
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-sm">
            <span className="font-medium text-ink-soft">Sort by:</span>
            <div className="flex flex-wrap gap-2">
              {(["popularity", "rating", "views"] as const).map((s) => (
                <Link
                  key={s}
                  href={`?sort=${s}`}
                  className={`rounded-full border px-3 py-1 ${
                    sort === s
                      ? "border-brand bg-brand-soft text-brand-ink"
                      : "border-line text-ink-soft hover:border-brand hover:text-brand"
                  }`}
                >
                  {s === "popularity" ? "Popularity" : s === "rating" ? "Top Rated" : "Most Viewed"}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {colleges.map((college) => (
              <CollegeCard key={college.slug} college={college} />
            ))}

            {colleges.length === 0 && (
              <p className="py-12 text-center text-sm text-ink-faint">No colleges found.</p>
            )}
          </div>

          {/* Pagination */}
          {meta.pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2 text-sm">
              {Array.from({ length: Math.min(meta.pages, 5) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`?page=${p}&sort=${sort}`}
                  className={`rounded-full border px-3 py-1.5 ${
                    p === page
                      ? "border-brand bg-brand-soft text-brand-ink"
                      : "border-line text-ink-soft hover:border-brand"
                  }`}
                >
                  {p}
                </Link>
              ))}
              {page < meta.pages && (
                <Link
                  href={`?page=${page + 1}&sort=${sort}`}
                  className="rounded-full border border-line px-3 py-1.5 text-ink-soft hover:border-brand"
                >
                  Next &rarr;
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display font-semibold text-ink">View colleges in budget of</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["< ₹5L", "₹5L - 10L", "₹10L - 20L", "> ₹20L"].map((b) => (
                <Chip key={b}>{b}</Chip>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display font-semibold text-ink">Upcoming Admission Deadlines</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li className="flex justify-between"><span>Eastwind Institute</span><span>15 Sep</span></li>
              <li className="flex justify-between"><span>Horizon School of Business</span><span>28 Sep</span></li>
              <li className="flex justify-between"><span>BIMS</span><span>3 Oct</span></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display font-semibold text-ink">Most Preferred Locations</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li className="flex justify-between"><span>Bangalore</span><span>214</span></li>
              <li className="flex justify-between"><span>Mumbai</span><span>241</span></li>
              <li className="flex justify-between"><span>Delhi NCR</span><span>302</span></li>
            </ul>
          </div>
        </aside>
      </div>

      {/* FAQs */}
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
    </div>
  );
}
