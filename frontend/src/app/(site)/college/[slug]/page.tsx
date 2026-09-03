import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CollegeCard } from "@/components/college-card";
import { Chip } from "@/components/ui/chip";
import { RatingPill } from "@/components/ui/rating";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { colleges } from "@/lib/mock-data";

export function generateStaticParams() {
  return colleges.map((c) => ({ slug: c.slug }));
}

function getCollege(slug: string) {
  return colleges.find((c) => c.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const college = getCollege(slug);
  if (!college) return { title: "College not found" };
  return {
    title: `${college.name}: Courses, Fees, Placements & Reviews`,
    description: college.about,
  };
}

export default async function CollegeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const college = getCollege(slug);
  if (!college) notFound();

  const overall =
    college.ratingBreakdown.reduce((sum, r) => sum + r.score, 0) / college.ratingBreakdown.length;

  const related = colleges.filter((c) => c.slug !== college.slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Colleges", href: "/colleges" },
          { label: college.city, href: `/location/${college.city.toLowerCase()}` },
          { label: college.name },
        ]}
      />

      {/* Header */}
      <div className="mt-4 flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <ImagePlaceholder
            label={`${college.name} logo`}
            rounded="rounded-2xl"
            className="h-16 w-16 shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{college.name}</h1>
              <Chip tone="gold">#{college.ranking.rank} {college.ranking.authority} {new Date().getFullYear()}</Chip>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {college.city}, {college.state} &middot; {college.ownership} &middot; Est. {college.established}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {college.approvals.map((a) => (
                <Chip key={a}>{a}</Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3">
          <Link
            href="/enquiry"
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
          >
            Download Brochure
          </Link>
          <Link
            href="/enquiry"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Apply Now
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-12">
          {/* About */}
          <section id="about">
            <h2 className="font-display text-xl font-bold text-ink">About {college.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{college.about}</p>
          </section>

          {/* Ratings */}
          <section id="ratings">
            <h2 className="font-display text-xl font-bold text-ink">Student Ratings</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-brand/30 bg-brand-soft p-4 text-center">
                <p className="font-display text-2xl font-extrabold text-brand-ink">{overall.toFixed(1)}</p>
                <p className="text-xs text-brand-ink/80">Overall ({college.reviewCount} reviews)</p>
              </div>
              {college.ratingBreakdown.map((r) => (
                <div key={r.label} className="rounded-2xl border border-line bg-surface p-4 text-center">
                  <p className="font-display text-2xl font-extrabold text-ink">{r.score.toFixed(1)}</p>
                  <p className="text-xs text-ink-faint">{r.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Courses & fees */}
          <section id="courses">
            <h2 className="font-display text-xl font-bold text-ink">Courses &amp; Fees</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-bg-alt text-left text-ink-faint">
                  <tr>
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Fees</th>
                    <th className="px-4 py-3 font-medium">Exams Accepted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {college.courses.map((c) => (
                    <tr key={c.name}>
                      <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                      <td className="px-4 py-3 text-ink-soft">{c.duration}</td>
                      <td className="px-4 py-3 text-ink-soft">{c.mode}</td>
                      <td className="px-4 py-3 text-ink-soft">{c.fees}</td>
                      <td className="px-4 py-3 text-ink-soft">{c.exams.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Cutoffs */}
          <section id="cutoffs">
            <h2 className="font-display text-xl font-bold text-ink">Cutoffs</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {college.cutoffs.map((c, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-xs text-ink-faint">{c.exam} &middot; {c.category}</p>
                  <p className="mt-1 font-display font-semibold text-ink">{c.score}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Placements */}
          <section id="placements">
            <h2 className="font-display text-xl font-bold text-ink">Placements {college.placement.year}</h2>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-line bg-surface p-4 text-center">
                <p className="font-display text-lg font-bold text-ink">{college.placement.average}</p>
                <p className="text-xs text-ink-faint">Average Package</p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4 text-center">
                <p className="font-display text-lg font-bold text-ink">{college.placement.median}</p>
                <p className="text-xs text-ink-faint">Median Package</p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4 text-center">
                <p className="font-display text-lg font-bold text-ink">{college.placement.highest}</p>
                <p className="text-xs text-ink-faint">Highest Package</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {college.placement.topRecruiters.map((r) => (
                <Chip key={r}>{r}</Chip>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section id="reviews">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">
                Student Reviews &amp; Ratings ({college.reviewCount})
              </h2>
              <Link href="#" className="text-sm font-semibold text-brand hover:underline">
                Write a Review
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              {college.reviews.map((r, i) => (
                <article key={i} className="rounded-2xl border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{r.author}</p>
                      {r.verified && <Chip tone="brand">Verified</Chip>}
                    </div>
                    <RatingPill score={r.rating} />
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">
                    {r.course} &middot; Batch {r.batch} &middot; Reviewed on {r.date}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{r.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display font-semibold text-ink">Quick Facts</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-faint">Established</dt>
                <dd className="font-medium text-ink">{college.established}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Ownership</dt>
                <dd className="font-medium text-ink">{college.ownership}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Total Fees</dt>
                <dd className="font-medium text-ink">{college.feesRange}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Exams Accepted</dt>
                <dd className="font-medium text-ink">{college.examsAccepted.join(", ")}</dd>
              </div>
            </dl>
          </div>

          <form className="rounded-2xl border border-brand/30 bg-brand-soft p-5">
            <p className="font-display font-semibold text-brand-ink">Get a Callback</p>
            <p className="mt-1 text-xs text-brand-ink/80">Talk to an admission counsellor about {college.name}.</p>
            <div className="mt-4 space-y-3">
              <input
                required
                placeholder="Full name"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              <input
                required
                type="tel"
                placeholder="Mobile number"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Request Callback
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display font-semibold text-ink">Contact Information</p>
            <p className="mt-2 text-sm text-ink-soft">
              {college.city}, {college.state}
            </p>
            <p className="mt-1 text-sm text-ink-soft">admissions@{college.slug.split("-")[0]}.example</p>
          </div>
        </aside>
      </div>

      {/* Related colleges */}
      <section className="mt-16">
        <h2 className="font-display text-xl font-bold text-ink">Similar Colleges You May Like</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((c) => (
            <CollegeCard key={c.slug} college={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
