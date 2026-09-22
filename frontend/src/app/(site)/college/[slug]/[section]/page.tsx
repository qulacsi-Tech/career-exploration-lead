import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CourseCards } from "@/components/college/course-cards";
import { CutoffCards } from "@/components/college/cutoff-cards";
import { RecruiterMarquee } from "@/components/college/recruiter-marquee";
import { Reveal, RevealGroup, RevealItem } from "@/components/college/reveal";
import { ReviewWall } from "@/components/college/review-wall";
import { CollegeSectionPage } from "@/components/college/section-page";
import { RichText } from "@/components/rich-text";
import { collegePhotoSet } from "@/lib/college-images";
import { articlesFor, highlightsFor, tabBody, videosFor, videoEmbedUrl } from "@/lib/college-content";
import { TAB_SLUG_FOR_SECTION, sectionBySlug, sectionsFor } from "@/lib/college-sections";
import { colleges, type College } from "@/lib/mock-data";

/**
 * Every college section that is not the overview, on its own URL.
 *
 * ## One route rather than ten files
 *
 * The sections differ only in what they render — the routing, the 404 rule, the
 * metadata shape and the page frame are identical across all of them. Ten
 * near-identical files would mean the "does this college have this section"
 * check written out ten times, and it only has to be wrong once for a tab to
 * lead somewhere empty. Here it is written once, read from
 * `lib/college-sections`, and the same predicate drives the rail in the layout.
 *
 * The hero and the tab rail live in `layout.tsx`, so they persist across these
 * pages rather than re-rendering per tab.
 */

export function generateStaticParams() {
  /* The cross product of colleges and the sections each one actually has —
     so the build produces no page that its own rail does not link to. */
  return colleges.flatMap((college) =>
    sectionsFor(college)
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
    /* Each section owns its own URL, so each is its own canonical. The overview
       is not the canonical for all of them — they carry different content and
       answer different queries, which is the reason for splitting them up. */
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

  const section = sectionBySlug(sectionSlug);
  /*
    Two separate reasons to 404, both handled here: the segment is not a section
    at all, or it is one this college has no content for. The second is what
    stops `/college/horizon-school-of-business/hostel` resolving to an empty
    heading — that college's hostel document is deliberately blank.
  */
  if (!section || section.slug === "" || !section.has(college)) notFound();

  return (
    <CollegeSectionPage college={college} sectionSlug={section.slug}>
      <SectionBody college={college} sectionSlug={section.slug} />
    </CollegeSectionPage>
  );
}

function SectionBody({ college, sectionSlug }: { college: College; sectionSlug: string }) {
  switch (sectionSlug) {
    case "courses":
      return <CourseCards courses={college.courses} />;

    case "cutoffs":
      return <CutoffCards cutoffs={college.cutoffs} />;

    case "placements":
      return <Placements college={college} />;

    case "gallery":
      return <Gallery college={college} />;

    case "videos":
      return <Videos college={college} />;

    case "reviews":
      return <Reviews college={college} />;

    case "articles":
      return <Articles college={college} />;

    default: {
      /* The rich-text sections — Scholarships, Hostel & Facilities, Admission
         Process. All three render the same way; only the template differs. */
      const tabSlug = TAB_SLUG_FOR_SECTION[sectionSlug];
      if (!tabSlug) return null;
      return <RichText doc={tabBody(college.slug, tabSlug)} className="max-w-3xl" />;
    }
  }
}

/* ------------------------------------------------------------------ *
   Section bodies
 * ------------------------------------------------------------------ */

function Placements({ college }: { college: College }) {
  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl bg-brand-ink px-6 py-12 sm:px-10">
        {/* A soft brand bloom behind the figures, so the band is not a flat
            rectangle of one colour behind three numbers. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-brand/30 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-gold/15 blur-[120px]"
        />

        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
            Class of {college.placement.year}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            Where this degree takes you
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85">
            Verified packages from the most recent placement season, and the companies that
            hired on campus.
          </p>

          <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { label: "Average package", value: college.placement.average },
              { label: "Median package", value: college.placement.median },
              { label: "Highest package", value: college.placement.highest },
            ].map((figure) => (
              <RevealItem
                key={figure.label}
                className="rounded-2xl border border-white/15 bg-white/10 p-7 backdrop-blur-xl"
              >
                <p className="font-display text-4xl font-extrabold text-white">{figure.value}</p>
                <p className="mt-2 text-sm text-white/85">{figure.label}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>

      <div>
        <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
          Top recruiters on campus
        </p>
        <RecruiterMarquee recruiters={college.placement.topRecruiters} />
      </div>
    </div>
  );
}

function Gallery({ college }: { college: College }) {
  const highlights = highlightsFor(college.slug);
  /* Resolved once, not per tile: the set is deterministic for a slug, so
     recomputing it inside the map would hash the slug six times for one
     answer. */
  const photos = collegePhotoSet(college.slug, highlights.length);

  return (
    /*
      A mosaic rather than a uniform grid: the first frame runs two columns
      wide, so the eye has somewhere to land instead of reading six equal tiles
      left to right.
    */
    <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {highlights.map((image, i) => (
        <RevealItem key={image.id} className={i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}>
          <figure className="group relative h-full overflow-hidden rounded-2xl border border-line bg-bg-alt">
            <div className={i === 0 ? "aspect-[16/10]" : "aspect-[4/3]"}>
              <Image
                src={photos[i % photos.length]}
                alt={image.alt}
                fill
                sizes={
                  i === 0
                    ? "(max-width: 640px) 100vw, 66vw"
                    : "(max-width: 640px) 100vw, 33vw"
                }
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
              />
            </div>
            {/*
              The caption is always on, over a permanent scrim, rather than
              appearing on hover as it used to. A hover-only caption is
              unreachable on a touch screen and by keyboard, so on a phone the
              names simply did not exist.
            */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-4 text-sm font-semibold text-white">
              {image.name}
            </figcaption>
          </figure>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

function Videos({ college }: { college: College }) {
  const videos = videosFor(college.slug);

  return (
    /* Embedded rather than hosted. `loading="lazy"` matters here: an eager
       iframe pulls the provider's player on every page load, which is a large
       third-party cost for content below the fold. */
    <RevealGroup className="grid gap-6 sm:grid-cols-2">
      {videos.map((video) => (
        <RevealItem key={video.id}>
          <figure>
            <div className="aspect-video overflow-hidden rounded-2xl border border-line">
              <iframe
                src={videoEmbedUrl(video)}
                title={video.title}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
            <figcaption className="mt-2.5 text-sm font-medium text-ink-soft">
              {video.title}
            </figcaption>
          </figure>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

function Reviews({ college }: { college: College }) {
  const overall =
    college.ratingBreakdown.reduce((total, row) => total + row.score, 0) /
    college.ratingBreakdown.length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-soft">
          How students rate the place they actually studied.
        </p>
        <Reveal>
          <Link
            href="/enquiry"
            className="inline-block rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
          >
            Write a Review
          </Link>
        </Reveal>
      </div>

      <ReviewWall
        overall={overall}
        reviewCount={college.reviewCount}
        breakdown={college.ratingBreakdown}
        reviews={college.reviews}
      />
    </div>
  );
}

function Articles({ college }: { college: College }) {
  const articles = articlesFor(college.slug);

  return (
    <RevealGroup className="grid gap-5 lg:grid-cols-3">
      {articles.map((article) => (
        <RevealItem
          key={article.slug}
          as="article"
          className="group rounded-2xl border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
        >
          <p className="text-xs text-ink-faint">
            {article.publishedAt} &middot; {article.author}
          </p>
          <h3 className="mt-2 font-display text-lg font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {article.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{article.summary}</p>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
