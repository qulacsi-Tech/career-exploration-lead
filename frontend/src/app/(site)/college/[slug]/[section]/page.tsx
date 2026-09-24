import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { Clock, IndianRupee, Layers, MessageSquarePlus } from "lucide-react";
import { ComparisonTable } from "@/components/comparison-table";
import { CutoffCards } from "@/components/college/cutoff-cards";
import {
  BigFigure,
  CardLink,
  ColumnLabel,
  DetailCard,
  EmptyCard,
  FaqAccordion,
  IconStat,
  MeterList,
  PollStat,
  ReviewSnippet,
  ScoreBadge,
  Stars,
  type IconName,
} from "@/components/college/detail-ui";
import { RecruiterMarquee } from "@/components/college/recruiter-marquee";
import { CollegeSectionPage } from "@/components/college/section-page";
import { RichText } from "@/components/rich-text";
import { Chip } from "@/components/ui/chip";
import { collegePhotoSet } from "@/lib/college-images";
import {
  articlesFor,
  highlightsFor,
  tabBody,
  videoEmbedUrl,
  videosFor,
} from "@/lib/college-content";
import {
  faqsFor,
  lakhValue,
  overallScore,
  percentOf,
  rankingTable,
  shortFee,
} from "@/lib/college-insights";
import { TAB_SLUG_FOR_SECTION, collegeSections, sectionBySlug } from "@/lib/college-sections";
import { comparisonsFeaturing, compareUrl, similarColleges } from "@/lib/comparison-data";
import { colleges, type College } from "@/lib/mock-data";
import { isRichTextEmpty } from "@/lib/rich-text";

/**
 * Every college section that is not the overview, on its own URL.
 *
 * ## One route rather than a file per section
 *
 * The sections differ only in what they render — the routing, the 404 rule, the
 * metadata shape and the page frame are identical across all of them. Here the
 * "does this college have this section" check is written once, read from
 * `lib/college-sections`, and the same predicate drives the rail in the layout.
 *
 * Each body is a column of `DetailCard`s built from the primitives in
 * `components/college/detail-ui`, so every tab reads in the same visual
 * language as the overview: figures, bars and badges first, prose last.
 */

export function generateStaticParams() {
  /* Every college x every tab: the rail is fixed, so every tab is a page. */
  return colleges.flatMap((college) =>
    collegeSections
      .filter((section) => section.slug !== "")
      .map((section) => ({ slug: college.slug, section: section.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}): Promise<Metadata> {
  const { slug, section: sectionSlug } = await params;
  const college = colleges.find((entry) => entry.slug === slug);
  const section = sectionBySlug(sectionSlug);
  if (!college || !section) return { title: "Page not found" };

  return {
    title: `${college.name} ${section.label}: Details & Updates`,
    description: section.blurb(college),
    /* Each section owns its own URL, so each is its own canonical. */
    alternates: { canonical: `/college/${college.slug}/${section.slug}` },
  };
}

export default async function CollegeSectionRoute({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug, section: sectionSlug } = await params;

  const college = colleges.find((entry) => entry.slug === slug);
  if (!college) notFound();

  /* Videos used to be a tab of its own; it now shares the Gallery page. The
     old URL is linked from outside, so it forwards rather than 404s. */
  if (sectionSlug === "videos") permanentRedirect(`/college/${college.slug}/gallery`);

  const section = sectionBySlug(sectionSlug);
  /* Only a segment that is not a section at all 404s. A section this college
     has nothing for renders its empty state instead — the rail is fixed. */
  if (!section || section.slug === "") notFound();

  return (
    <CollegeSectionPage college={college} sectionSlug={section.slug}>
      <SectionBody college={college} sectionSlug={section.slug} />
    </CollegeSectionPage>
  );
}

const RICH_TEXT_ICON: Record<string, IconName> = {
  scholarships: "award",
  hostel: "building",
  "admission-process": "grad",
};

function SectionBody({ college, sectionSlug }: { college: College; sectionSlug: string }) {
  switch (sectionSlug) {
    case "courses":
      return <Courses college={college} />;
    case "fees":
      return <Fees college={college} />;
    case "faculty":
      return <Faculty college={college} />;
    case "reviews":
      return <Reviews college={college} />;
    case "placements":
      return <Placements college={college} />;
    case "cutoffs":
      return <Cutoffs college={college} />;
    case "rankings":
      return <Rankings college={college} />;
    case "gallery":
      return <Gallery college={college} />;
    case "compare":
      return <Compare college={college} />;
    case "qna":
      return <QnA college={college} />;
    case "articles":
      return <News college={college} />;
    default: {
      /* The rich-text sections — Admissions, Infrastructure, Scholarships.
         All three render the same way; only the template differs. */
      const tabSlug = TAB_SLUG_FOR_SECTION[sectionSlug];
      if (!tabSlug) return null;
      const doc = tabBody(college.slug, tabSlug);
      if (isRichTextEmpty(doc)) {
        const label = sectionBySlug(sectionSlug)?.label.toLowerCase() ?? "these";
        return (
          <EmptyCard
            icon={RICH_TEXT_ICON[sectionSlug] ?? "grad"}
            title={`No ${label} details yet`}
            body={`${college.name} has not published ${label} information here yet. A counsellor can get you the latest from the college.`}
          />
        );
      }
      return (
        <DetailCard
          footer={
            sectionSlug === "admission-process" && college.examsAccepted.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-semibold text-ink">Exams accepted</span>
                {college.examsAccepted.map((exam) => (
                  <Chip key={exam} tone="brand">
                    {exam}
                  </Chip>
                ))}
              </div>
            ) : undefined
          }
        >
          <RichText doc={doc} className="max-w-3xl" />
        </DetailCard>
      );
    }
  }
}

/* ------------------------------------------------------------------ *
   Section bodies
 * ------------------------------------------------------------------ */

function Courses({ college }: { college: College }) {
  if (college.courses.length === 0) {
    return (
      <EmptyCard
        icon="book"
        title="No programmes listed yet"
        body={`${college.name} has not published its programme list here yet.`}
      />
    );
  }
  const modes = [...new Set(college.courses.map((course) => course.mode))];

  return (
    <>
      <DetailCard>
        <div className="grid gap-8 sm:grid-cols-2">
          <IconStat icon="book" value={college.courses.length} label="Programmes listed" />
          <IconStat icon="layers" value={modes.join(", ")} label="Study modes" />
          <IconStat
            icon="grad"
            value={college.examsAccepted.join(", ")}
            label="Entrance exams accepted"
          />
          <IconStat icon="rupee" value={college.feesRange} label="Total fee range" />
        </div>
      </DetailCard>

      <DetailCard title="All Programmes">
        <ul className="divide-y divide-line border-y border-line">
          {college.courses.map((course) => (
            <li
              key={course.name}
              className="grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-ink">{course.name}</h3>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-brand" />
                    {course.duration}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-brand" />
                    {course.mode}
                  </span>
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {course.exams.map((exam) => (
                    <li key={exam}>
                      <Chip>{exam}</Chip>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                <p className="inline-flex items-center font-display text-2xl font-extrabold text-ink">
                  <IndianRupee className="h-5 w-5" />
                  {shortFee(course.fees).replace("₹", "")}
                </p>
                <Link
                  href="/enquiry"
                  className="rounded-full border-2 border-brand px-4 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
                >
                  Apply
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </DetailCard>
    </>
  );
}

function Fees({ college }: { college: College }) {
  if (college.courses.length === 0) {
    return (
      <EmptyCard
        icon="rupee"
        title="No fee details yet"
        body={`${college.name} has not published its fee structure here yet.`}
      />
    );
  }
  const rows = college.courses
    .map((course) => ({ course, lakh: lakhValue(course.fees) }))
    .sort((a, b) => (b.lakh ?? 0) - (a.lakh ?? 0));
  const maxFee = Math.max(...rows.map((row) => row.lakh ?? 0), 1);
  const lowest = rows[rows.length - 1];
  const highest = rows[0];

  return (
    <>
      <DetailCard>
        <div className="grid gap-8 sm:grid-cols-3">
          <BigFigure label="Fee range" value={college.feesRange} note="Total, across all programmes" />
          <BigFigure label="Lowest" value={shortFee(lowest.course.fees)} note={lowest.course.name} />
          <BigFigure label="Highest" value={shortFee(highest.course.fees)} note={highest.course.name} />
        </div>
      </DetailCard>

      <DetailCard
        title="Total Fees by Programme"
        footer={
          <p className="text-sm text-ink-soft">
            Total programme fees as published by the college. Hostel and mess charges are covered
            under Infrastructure.
          </p>
        }
      >
        <MeterList
          rows={rows.map(({ course, lakh }) => ({
            label: course.name,
            display: shortFee(course.fees),
            fraction: lakh === null ? null : lakh / maxFee,
          }))}
        />
      </DetailCard>

      <DetailCard title="Fee Structure">
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                <th scope="col" className="py-3 pr-4 font-semibold">
                  Programme
                </th>
                <th scope="col" className="py-3 pr-4 font-semibold">
                  Duration
                </th>
                <th scope="col" className="py-3 pr-4 font-semibold">
                  Mode
                </th>
                <th scope="col" className="py-3 text-right font-semibold">
                  Total fees
                </th>
              </tr>
            </thead>
            <tbody>
              {college.courses.map((course) => (
                <tr key={course.name} className="border-b border-line-soft">
                  <th scope="row" className="py-4 pr-4 font-semibold text-ink">
                    {course.name}
                  </th>
                  <td className="py-4 pr-4 text-ink-soft">{course.duration}</td>
                  <td className="py-4 pr-4 text-ink-soft">{course.mode}</td>
                  <td className="py-4 text-right font-display font-bold text-ink">
                    {shortFee(course.fees)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>
    </>
  );
}

function Faculty({ college }: { college: College }) {
  const faculty = college.ratingBreakdown.find((row) => row.label === "Faculty");

  return (
    <>
      {faculty && (
        <DetailCard title="What Students Say About Faculty">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <PollStat
              fraction={faculty.score / 5}
              value={faculty.score}
              caption="out of 5 is how students rate the faculty."
              note={`${college.reviewCount.toLocaleString("en-IN")} reviews`}
            />
            <div>
              <ColumnLabel>Faculty against the other categories</ColumnLabel>
              <MeterList
                rows={college.ratingBreakdown.map((row) => ({
                  label: row.label,
                  display: `${row.score.toFixed(1)} / 5`,
                  fraction: row.score / 5,
                  highlight: row.label === "Faculty",
                }))}
              />
            </div>
          </div>
        </DetailCard>
      )}
      {/* No faculty roster in the data yet — said plainly, not padded out. */}
      <EmptyCard
        icon="users"
        title="Faculty profiles coming soon"
        body={`${college.name} has not published its faculty list here yet. A counsellor can share department and teaching staff details.`}
      />
    </>
  );
}

function Reviews({ college }: { college: College }) {
  if (college.reviews.length === 0) {
    return (
      <EmptyCard
        icon="star"
        title="No reviews yet"
        body={`Be the first to review ${college.name} — or ask a counsellor what current students say.`}
      />
    );
  }
  const overall = overallScore(college);

  return (
    <>
      <DetailCard>
        <div className="grid gap-10 md:grid-cols-[240px_minmax(0,1fr)] md:items-center">
          <div className="text-center md:text-left">
            <p className="font-display text-7xl font-extrabold leading-none text-ink">
              {overall.toFixed(1)}
            </p>
            <div className="mt-3 flex justify-center md:justify-start">
              <Stars score={overall} className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {college.reviewCount.toLocaleString("en-IN")} student reviews
            </p>
          </div>
          <div>
            <ColumnLabel>Rating by category</ColumnLabel>
            <MeterList
              rows={college.ratingBreakdown.map((row) => ({
                label: row.label,
                display: `${row.score.toFixed(1)} / 5`,
                fraction: row.score / 5,
              }))}
            />
          </div>
        </div>
      </DetailCard>

      <DetailCard
        title={`Reviews from ${college.name} Students`}
        action={
          <Link
            href="/enquiry"
            className="inline-flex items-center gap-2 rounded-full border-2 border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Write a review
          </Link>
        }
      >
        <div className="space-y-5">
          {college.reviews.map((review, i) => (
            <ReviewSnippet key={`${review.author}-${i}`} review={review} />
          ))}
        </div>
      </DetailCard>
    </>
  );
}

function Placements({ college }: { college: College }) {
  const packages = [
    { label: "Median package", value: college.placement.median },
    { label: "Average package", value: college.placement.average },
    { label: "Highest package", value: college.placement.highest },
  ];
  const max = Math.max(...packages.map((p) => lakhValue(p.value) ?? 0), 1);
  const placementScore = college.ratingBreakdown.find((row) => row.label === "Placements");

  return (
    <>
      <DetailCard title={`Placement Statistics ${college.placement.year}`}>
        <div className="grid gap-8 sm:grid-cols-3">
          {packages.map((p) => (
            <BigFigure key={p.label} label={p.label} value={p.value} />
          ))}
        </div>
        <div className="mt-10">
          <ColumnLabel>Package spread</ColumnLabel>
          <MeterList
            rows={packages.map((p) => {
              const lakh = lakhValue(p.value);
              return {
                label: p.label,
                display: p.value,
                fraction: lakh === null ? null : lakh / max,
                highlight: p.label === "Average package",
              };
            })}
          />
        </div>
      </DetailCard>

      <DetailCard title="Top Recruiters">
        <RecruiterMarquee recruiters={college.placement.topRecruiters} />
      </DetailCard>

      {placementScore && (
        <DetailCard title="What Students Say About Placements">
          <PollStat
            fraction={placementScore.score / 5}
            value={placementScore.score}
            caption="out of 5 is how students rate placement support."
            note={`${college.reviewCount.toLocaleString("en-IN")} reviews`}
          />
        </DetailCard>
      )}
    </>
  );
}

function Cutoffs({ college }: { college: College }) {
  if (college.cutoffs.length === 0) {
    return (
      <EmptyCard
        icon="trend"
        title="No cut-offs published yet"
        body={`${college.name} has not published entrance cut-offs here yet.`}
      />
    );
  }
  return (
    <>
      <DetailCard title="Cut-Off Summary">
        <MeterList
          rows={college.cutoffs.map((cutoff) => {
            const percent = percentOf(cutoff.score);
            return {
              label: `${cutoff.exam} · ${cutoff.category}`,
              display: cutoff.score,
              fraction: percent === null ? null : percent / 100,
            };
          })}
        />
      </DetailCard>
      <DetailCard title="By Exam and Category">
        <CutoffCards cutoffs={college.cutoffs} />
      </DetailCard>
    </>
  );
}

function Rankings({ college }: { college: College }) {
  const { rows, position, of } = rankingTable(college);
  const best = Math.min(...rows.map((row) => row.ranking.rank));

  return (
    <>
      <DetailCard>
        <div className="grid gap-8 sm:grid-cols-3">
          <BigFigure
            label={`${college.ranking.authority} rank`}
            value={`#${college.ranking.rank}`}
            note={`${college.stream} category`}
          />
          <BigFigure
            label="Among colleges listed here"
            value={`${position} of ${of}`}
            note={`${college.stream} colleges on this site`}
          />
          <div>
            <p className="text-base text-ink">Student rating</p>
            <div className="mt-2 flex items-center gap-3">
              <ScoreBadge score={college.rating} size="lg" />
              <Stars score={college.rating} className="h-5 w-5" />
            </div>
          </div>
        </div>
      </DetailCard>

      <DetailCard title={`${college.ranking.authority} Rank Among ${college.stream} Peers`}>
        <p className="mb-5 text-sm text-ink-soft">
          Longer bars rank higher. Bars are drawn relative to the best-ranked college shown.
        </p>
        <MeterList
          rows={rows.map((row) => ({
            label: row.name,
            display: `#${row.ranking.rank}`,
            fraction: best / row.ranking.rank,
            highlight: row.slug === college.slug,
            href: row.slug === college.slug ? undefined : `/college/${row.slug}/rankings`,
          }))}
        />
      </DetailCard>
    </>
  );
}

function Gallery({ college }: { college: College }) {
  const highlights = highlightsFor(college.slug);
  const photos = collegePhotoSet(college.slug, highlights.length);
  const videos = videosFor(college.slug);
  if (highlights.length === 0 && videos.length === 0) {
    return (
      <EmptyCard
        icon="images"
        title="No photos or videos yet"
        body={`${college.name} has not published campus photos or videos here yet.`}
      />
    );
  }

  return (
    <>
      {highlights.length > 0 && (
        <DetailCard title={`Photos (${highlights.length})`}>
          {/* The first frame runs two columns wide, so the eye has somewhere
              to land instead of reading equal tiles left to right. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((image, i) => (
              <figure
                key={image.id}
                className={`group relative overflow-hidden rounded-xl bg-bg-alt ${
                  i === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                }`}
              >
                <div className={i === 0 ? "aspect-[16/10] h-full" : "aspect-[4/3]"}>
                  <Image
                    src={photos[i % photos.length]}
                    alt={image.alt}
                    fill
                    sizes={i === 0 ? "(max-width: 640px) 100vw, 66vw" : "(max-width: 640px) 100vw, 33vw"}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                {/* Always-on caption: a hover-only one is unreachable on touch. */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
                />
                <figcaption className="absolute inset-x-0 bottom-0 p-3.5 text-sm font-semibold text-white">
                  {image.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </DetailCard>
      )}

      {videos.length > 0 && (
        <DetailCard title={`Videos (${videos.length})`}>
          {/* Lazy iframes: an eager one pulls the provider's player on every
              page load, for content below the fold. */}
          <div className="grid gap-6 sm:grid-cols-2">
            {videos.map((video) => (
              <figure key={video.id}>
                <div className="aspect-video overflow-hidden rounded-xl bg-bg-alt">
                  <iframe
                    src={videoEmbedUrl(video)}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
                <figcaption className="mt-2.5 text-sm font-medium text-ink">{video.title}</figcaption>
              </figure>
            ))}
          </div>
        </DetailCard>
      )}
    </>
  );
}

function Compare({ college }: { college: College }) {
  const peers = similarColleges(college, 2);
  const curated = comparisonsFeaturing(college.slug);
  if (peers.length === 0 && curated.length === 0) {
    return (
      <EmptyCard
        icon="compare"
        title="No comparisons yet"
        body={`There are no similar colleges to compare ${college.name} with yet.`}
      />
    );
  }

  return (
    <>
      {peers.length > 0 && (
        <DetailCard
          title={`${college.name} vs Similar Colleges`}
          footer={
            <CardLink href={compareUrl([college.slug, ...peers.map((c) => c.slug)])}>
              Open full comparison
            </CardLink>
          }
        >
          <ComparisonTable colleges={[college, ...peers]} />
        </DetailCard>
      )}

      {curated.length > 0 && (
        <DetailCard title="Which Should You Choose?">
          <ul className="grid gap-4 sm:grid-cols-2">
            {curated.map((comparison) => (
              <li key={comparison.slug}>
                <Link
                  href={`/compare/${comparison.slug}`}
                  className="group block h-full rounded-xl bg-bg-alt p-5 transition hover:bg-brand-soft"
                >
                  <h3 className="font-display text-lg font-bold text-ink group-hover:text-brand">
                    {comparison.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                    {comparison.intro}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </DetailCard>
      )}
    </>
  );
}

function QnA({ college }: { college: College }) {
  return (
    <DetailCard
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">Have a question that is not answered here?</p>
          <Link
            href="/enquiry"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Ask a question
          </Link>
        </div>
      }
    >
      <FaqAccordion faqs={faqsFor(college)} />
    </DetailCard>
  );
}

function News({ college }: { college: College }) {
  const articles = articlesFor(college.slug);
  if (articles.length === 0) {
    return (
      <EmptyCard
        icon="news"
        title="No news yet"
        body={`There are no news or updates about ${college.name} yet.`}
      />
    );
  }

  return (
    <DetailCard>
      <ul className="divide-y divide-line">
        {articles.map((article) => (
          <li key={article.slug} className="py-6 first:pt-0 last:pb-0">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              {article.publishedAt} &middot; {article.author}
            </p>
            <h3 className="mt-2 font-display text-xl font-bold leading-snug text-ink">
              {article.title}
            </h3>
            <p className="mt-2 text-base leading-relaxed text-ink-soft">{article.summary}</p>
          </li>
        ))}
      </ul>
    </DetailCard>
  );
}
