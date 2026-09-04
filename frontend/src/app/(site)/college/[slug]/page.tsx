import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CollegeCard } from "@/components/college-card";
import { Chip } from "@/components/ui/chip";
import { RatingPill } from "@/components/ui/rating";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { colleges } from "@/lib/mock-data";
import {
  activeTabTemplates,
  tabBody,
  articlesFor,
  alertsFor,
  highlightsFor,
  videosFor,
  videoEmbedUrl,
} from "@/lib/college-content";
import { isRichTextEmpty } from "@/lib/rich-text";
import { RichText } from "@/components/rich-text";
import { ComparisonTable } from "@/components/comparison-table";
import {
  comparisonsFeaturing,
  similarColleges,
  compareUrl,
} from "@/lib/comparison-data";

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

  /**
   * Comparison, at the bottom of the page and not on the homepage (MOM §1.6).
   *
   * `peers` are same-program colleges nearest by rank, so the inline table
   * compares like with like rather than whatever happens to be next in the
   * directory. `curatedPairs` are the hand-written pages this college appears
   * in — the versions with an actual verdict.
   */
  const peers = similarColleges(college, 2);
  const curatedPairs = comparisonsFeaturing(college.slug);

  const alerts = [...alertsFor(college.slug)].sort(
    (a, b) => Number(b.isUrgent) - Number(a.isUrgent),
  );
  const articles = articlesFor(college.slug);
  const highlights = highlightsFor(college.slug);
  const videos = videosFor(college.slug);

  /**
   * Configurable tabs, filtered to the ones this college has actually written
   * something into — the MOM's "tabs should only appear on the frontend when
   * content is available" (§1.2).
   *
   * `isRichTextEmpty` rather than a length check: an editor who opens the field
   * and closes it leaves one empty paragraph behind, which is structurally
   * non-empty. Without that distinction every untouched tab would render as a
   * heading over nothing.
   */
  const customTabs = activeTabTemplates()
    .map((template) => ({ template, body: tabBody(college.slug, template.slug) }))
    .filter(({ body }) => !isRichTextEmpty(body));

  /**
   * The in-page nav. Built from what exists rather than hard-coded, so a
   * college with no videos gets no dead "Videos" link.
   */
  const sections = [
    { id: "about", label: "Overview" },
    { id: "courses", label: "Courses & Fees" },
    { id: "cutoffs", label: "Cutoffs" },
    { id: "placements", label: "Placements" },
    ...(highlights.length > 0 ? [{ id: "gallery", label: "Gallery" }] : []),
    ...(videos.length > 0 ? [{ id: "videos", label: "Videos" }] : []),
    ...customTabs.map(({ template }) => ({ id: template.slug, label: template.label })),
    ...(articles.length > 0 ? [{ id: "articles", label: "Articles" }] : []),
    { id: "reviews", label: "Reviews" },
  ];

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

      {/* Alerts sit above the fold: an application deadline is the most
          time-sensitive thing on the page, and burying it below the fees table
          makes it useless. */}
      {alerts.length > 0 && (
        <ul className="mt-6 space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${
                alert.isUrgent
                  ? "border-brand/40 bg-brand-soft text-brand-ink"
                  : "border-line bg-surface text-ink-soft"
              }`}
            >
              <Chip tone={alert.isUrgent ? "brand" : undefined}>{alert.kind}</Chip>
              <span className="font-medium">{alert.title}</span>
              <span className="ml-auto shrink-0 text-xs opacity-70">{alert.date}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Section nav. Anchors rather than JS-switched panels: every section
          stays in the document, so all of it is indexable and a shared link to
          #placements lands in the right place. */}
      <nav
        aria-label="On this page"
        className="sticky top-[68px] z-20 -mx-4 mt-6 overflow-x-auto border-b border-line bg-surface/95 px-4 backdrop-blur sm:-mx-6 sm:px-6"
      >
        <ul className="flex gap-1">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

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

          {/* Gallery highlights — the capped selection from the admin. */}
          {highlights.length > 0 && (
            <section id="gallery">
              <h2 className="font-display text-xl font-bold text-ink">Campus Gallery</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {highlights.map((image) => (
                  <figure key={image.id}>
                    <ImagePlaceholder
                      label={image.name}
                      rounded="rounded-xl"
                      className="aspect-[4/3] w-full"
                    />
                    <figcaption className="mt-1.5 text-xs text-ink-faint">{image.name}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* Videos, embedded rather than hosted. `loading="lazy"` matters here:
              an eager iframe pulls the provider's player on every page load,
              which is a large third-party cost for content below the fold. */}
          {videos.length > 0 && (
            <section id="videos">
              <h2 className="font-display text-xl font-bold text-ink">Videos</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {videos.map((video) => (
                  <figure key={video.id}>
                    <div className="aspect-video overflow-hidden rounded-xl border border-line">
                      <iframe
                        src={videoEmbedUrl(video)}
                        title={video.title}
                        loading="lazy"
                        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                    <figcaption className="mt-1.5 text-sm text-ink-soft">{video.title}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* Configurable tabs. Already filtered to non-empty above, so there is
              no empty-heading case to guard here. */}
          {customTabs.map(({ template, body }) => (
            <section key={template.slug} id={template.slug}>
              <h2 className="font-display text-xl font-bold text-ink">{template.label}</h2>
              <RichText doc={body} className="mt-3" />
            </section>
          ))}

          {/* Articles */}
          {articles.length > 0 && (
            <section id="articles">
              <h2 className="font-display text-xl font-bold text-ink">
                Articles about {college.name}
              </h2>
              <div className="mt-4 space-y-3">
                {articles.map((article) => (
                  <article key={article.slug} className="rounded-2xl border border-line bg-surface p-5">
                    <p className="text-xs text-ink-faint">
                      {article.publishedAt} &middot; {article.author}
                    </p>
                    <h3 className="mt-1 font-display text-base font-bold text-ink">
                      {article.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-ink-soft">{article.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

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

      {/* Comparison against peers. Inline rather than behind a click: the
          comparison IS the answer to "is this the right college", and hiding it
          behind a link loses the visitors who would not take the extra step. */}
      {peers.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-xl font-bold text-ink">
            {college.name} vs similar colleges
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Compared with the {college.stream.toLowerCase()} colleges closest to it by ranking.
          </p>
          <div className="mt-5">
            <ComparisonTable colleges={[college, ...peers]} />
          </div>
          <Link
            href={compareUrl([college.slug, ...peers.map((c) => c.slug)])}
            className="mt-5 inline-block rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
          >
            Open full comparison
          </Link>
        </section>
      )}

      {curatedPairs.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-ink">Which should you choose?</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {curatedPairs.map((comparison) => (
              <Link
                key={comparison.slug}
                href={`/compare/${comparison.slug}`}
                className="rounded-2xl border border-line bg-surface p-5 transition hover:border-brand"
              >
                <h3 className="font-display text-base font-bold text-ink">{comparison.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{comparison.intro}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related colleges */}
      <section className="mt-16">
        <h2 className="font-display text-xl font-bold text-ink">Similar Colleges You May Like</h2>
        {/* Two-up, not three: at three the cards are ~400px and every stat
            label wraps. Two gives each card ~630px, which is enough for the
            values to read on one line. */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {related.map((c) => (
            <CollegeCard key={c.slug} college={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
