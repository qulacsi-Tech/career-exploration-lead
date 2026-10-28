import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { Clock, IndianRupee, Layers, MessageSquarePlus } from "lucide-react";
import { ComparisonTable } from "@/components/comparison-table";
import { CutoffCards } from "@/components/college/cutoff-cards";
import {
  AlertCards,
  CounsellorBand,
  CuratedComparisons,
  FacultyShowcase,
  NewsTimeline,
  PressGrid,
  QaList,
  SectionSpotlight,
  VsDuel,
} from "@/components/college/fancy-sections";
import { docOutline } from "@/lib/college-outline";
import {
  BigFigure,
  CardLink,
  ColumnLabel,
  DetailCard,
  EmptyCard,
  IconStat,
  MeterList,
  PollStat,
  ReviewSnippet,
  ScoreBadge,
  Stars,
  type IconName,
} from "@/components/college/detail-ui";
import { RecruiterMarquee } from "@/components/college/recruiter-marquee";
import { PlacementBreakdownTable } from "@/components/college/placement-breakdown";
import { CollegeSectionPage } from "@/components/college/section-page";
import { RichText } from "@/components/rich-text";
import { Chip } from "@/components/ui/chip";
import { videoEmbedUrl } from "@/lib/college-content";
import { faqsOf, isRealPackage, longDate, lakhValue, overallScore, percentOf, rankingTable, shortFee, programmeTitle, cutoffLabel, cutoffProgramme } from "@/lib/college-insights";
import { plural } from "@/lib/college-rules";
import { TAB_SLUG_FOR_SECTION, collegeSections, sectionBySlug } from "@/lib/college-sections";
import { comparisonsFeaturing, compareUrl } from "@/lib/comparison-data";
import { collegesBySlugs, similarColleges } from "@/lib/comparison-resolve";
import {
  getCollegeOrNull,
  getColleges,
  getCollegeSlugs,
  type College as CollegeBase,
  type CollegeDetail as College,
} from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { emptyDoc, isRichTextEmpty } from "@/lib/rich-text";

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

export async function generateStaticParams() {
  /* Every college x every tab: the rail is fixed, so every tab is a page. */
  const slugs = await getCollegeSlugs();
  return slugs.flatMap((slug) =>
    collegeSections
      .filter((section) => section.slug !== "")
      .map((section) => ({ slug, section: section.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}): Promise<Metadata> {
  const { slug, section: sectionSlug } = await params;
  const college = await getCollegeOrNull(slug);
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

  const college = await getCollegeOrNull(slug);
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
      const doc = college.tabs?.[tabSlug] ?? emptyDoc();
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
      const label = sectionBySlug(sectionSlug)?.label ?? "";
      const outline = docOutline(doc);
      return (
        <>
          <SectionSpotlight
            icon={RICH_TEXT_ICON[sectionSlug] ?? "grad"}
            label={label}
            collegeName={college.name}
            topics={outline.topics}
            points={outline.points}
            words={outline.words}
          />
          <DetailCard
            title="Full Details"
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
          <CounsellorBand label={label} collegeName={college.name} />
        </>
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
  const onlineCount = college.courses.filter((course) => course.onlineOffered).length;
  const modes = [...new Set([...college.courses.map((course) => course.mode), ...(onlineCount > 0 ? ["Online"] : [])])];

  return (
    <>
      <DetailCard>
        <div className="grid gap-8 sm:grid-cols-2">
          <IconStat icon="book" value={college.courses.length} label="Programmes listed" />
          <IconStat icon="layers" value={modes.join(", ")} label="Study modes" />
          {onlineCount > 0 && <IconStat icon="grad" value={onlineCount} label={onlineCount === 1 ? "Programme also online" : "Programmes also online"} />}
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
          {college.courses.map((course, i) => (
            <li
              key={`${programmeTitle(course)}-${i}`}
              className="grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-ink">{programmeTitle(course)}</h3>
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
                {(course.eligibility || course.seats) && (
                  <p className="mt-2 text-sm text-ink-soft">
                    {course.eligibility && <span>Eligibility: {course.eligibility}</span>}
                    {course.eligibility && course.seats ? <span aria-hidden> &middot; </span> : null}
                    {course.seats ? <span>{course.seats.toLocaleString("en-IN")} seats</span> : null}
                  </p>
                )}
                <ul className="mt-3 flex flex-wrap gap-2">
                  {course.exams.map((exam) => (
                    <li key={exam}>
                      <Chip>{exam}</Chip>
                    </li>
                  ))}
                </ul>
                {course.onlineOffered && (
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                    <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Also online</span>
                    {course.onlineDuration && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {course.onlineDuration}
                      </span>
                    )}
                    {course.onlineFees && (
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <IndianRupee className="h-4 w-4" />
                        {shortFee(course.onlineFees).replace("₹", "")} total fees
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                <p className="inline-flex items-center font-display text-2xl font-extrabold text-ink">
                  <IndianRupee className="h-5 w-5" />
                  {shortFee(course.fees).replace("₹", "")}
                </p>
                <Link
                  href="/enquiry" data-track="cta_enquiry"
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
              {college.courses.flatMap((course, i) => [
                <tr key={`${programmeTitle(course)}-${i}`} className="border-b border-line-soft">
                  <th scope="row" className="py-4 pr-4 font-semibold text-ink">
                    {programmeTitle(course)}
                  </th>
                  <td className="py-4 pr-4 text-ink-soft">{course.duration}</td>
                  <td className="py-4 pr-4 text-ink-soft">{course.mode}</td>
                  <td className="py-4 text-right font-display font-bold text-ink">
                    {shortFee(course.fees)}
                  </td>
                </tr>,
                ...(course.onlineOffered
                  ? [
                      <tr key={`${programmeTitle(course)}-${i}-online`} className="border-b border-line-soft bg-sky-50/50">
                        <th scope="row" className="py-4 pr-4 font-semibold text-ink">
                          {programmeTitle(course)} <span className="ml-1 rounded-full bg-sky-600 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white">Online</span>
                        </th>
                        <td className="py-4 pr-4 text-ink-soft">{course.onlineDuration || "—"}</td>
                        <td className="py-4 pr-4 text-ink-soft">Online</td>
                        <td className="py-4 text-right font-display font-bold text-ink">{course.onlineFees ? shortFee(course.onlineFees) : "—"}</td>
                      </tr>,
                    ]
                  : []),
              ])}
            </tbody>
          </table>
        </div>
      </DetailCard>
    </>
  );
}

function Faculty({ college }: { college: College }) {
  const faculty = college.ratingBreakdown.find((row) => row.label === "Faculty");
  const roster = college.faculty;
  const hasStats = roster.count !== null || roster.studentRatio !== "" || roster.phdPercent !== null;
  const hasRoster = hasStats || roster.members.length > 0;

  return (
    <>
      {hasRoster && (
        <DetailCard title="Faculty at a Glance">
          <FacultyShowcase
            count={roster.count}
            ratio={roster.studentRatio}
            phdPercent={roster.phdPercent}
            members={roster.members}
          />
        </DetailCard>
      )}
      {faculty && (
        <DetailCard title="What Students Say About Faculty">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <PollStat
              fraction={faculty.score / 5}
              value={faculty.score}
              caption="out of 5 is how students rate the faculty."
              note={plural(college.reviewCount, "review")}
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
      {!hasRoster && (
        <EmptyCard
          icon="users"
          title="Faculty profiles coming soon"
          body={`${college.name} has not published its faculty list here yet. A counsellor can share department and teaching staff details.`}
        />
      )}
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
              {plural(college.reviewCount, "student review")}
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
            href="/enquiry" data-track="cta_enquiry"
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
  const placement = college.placement;
  if (!placement) {
    return (
      <EmptyCard icon="grad" title="No placement data" body={`${college.name} has not published placement figures.`} />
    );
  }
  const packages = [
    { label: "Average package", value: placement.average },
    { label: "Highest package", value: placement.highest },
  ].filter((p) => isRealPackage(p.value));
  const max = Math.max(...packages.map((p) => lakhValue(p.value) ?? 0), 1);
  const placementScore = college.ratingBreakdown.find((row) => row.label === "Placements");

  return (
    <>
      <DetailCard title={`Placement Statistics ${placement.year}`}>
        <div className="grid gap-8 sm:grid-cols-2">
          {packages.map((p) => (
            <BigFigure key={p.label} label={p.label} value={p.value} />
          ))}
        </div>
        {placement.placedPercent != null && (
          <div className="mt-8">
            <BigFigure label="Of the batch placed" value={`${placement.placedPercent}%`} />
          </div>
        )}
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

      {placement.topRecruiters.length > 0 && (
        <DetailCard title="Top Recruiters">
          <RecruiterMarquee recruiters={placement.topRecruiters} />
        </DetailCard>
      )}

      {(placement.breakdown?.length ?? 0) > 0 && (
        <DetailCard title={`By Course and Specialisation ${placement.year}`}>
          <PlacementBreakdownTable rows={placement.breakdown} />
        </DetailCard>
      )}

      {college.placements.length > 1 && (
        <DetailCard title="Earlier Years">
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="py-3 pr-4 font-semibold">Year</th>
                  <th scope="col" className="py-3 pr-4 font-semibold">Average</th>
                  <th scope="col" className="py-3 pr-4 font-semibold">Highest</th>
                  <th scope="col" className="py-3 text-right font-semibold">Placed</th>
                </tr>
              </thead>
              <tbody>
                {college.placements.slice(1).map((row) => (
                  <tr key={row.year} className="border-b border-line-soft">
                    <th scope="row" className="py-4 pr-4 font-semibold text-ink">{row.year}</th>
                    <td className="py-4 pr-4 text-ink-soft">{row.average}</td>
                    <td className="py-4 pr-4 text-ink-soft">{row.highest}</td>
                    <td className="py-4 text-right text-ink-soft">{row.placedPercent != null ? `${row.placedPercent}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {college.placements.slice(1).filter((row) => (row.breakdown?.length ?? 0) > 0).map((row) => (
            <details key={row.year} className="mt-4 rounded-lg border border-line">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink">{row.year}: by course and specialisation</summary>
              <div className="border-t border-line px-4 pb-2">
                <PlacementBreakdownTable rows={row.breakdown} />
              </div>
            </details>
          ))}
        </DetailCard>
      )}

      {placementScore && (
        <DetailCard title="What Students Say About Placements">
          <PollStat
            fraction={placementScore.score / 5}
            value={placementScore.score}
            caption="out of 5 is how students rate placement support."
            note={plural(college.reviewCount, "review")}
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
              label: cutoffLabel(cutoff),
              display: cutoff.score,
              fraction: percent === null ? null : percent / 100,
            };
          })}
        />
      </DetailCard>
      {/* One card for every programme (no course picked), then one for each course or specialisation. */}
      {[...new Set(college.cutoffs.map((cutoff) => cutoffProgramme(cutoff)))]
        .sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)))
        .map((programme) => (
          <DetailCard key={programme || "all"} title={programme ? `${programme}: by Exam and Caste` : "By Exam and Caste"}>
            <CutoffCards cutoffs={college.cutoffs.filter((cutoff) => cutoffProgramme(cutoff) === programme)} />
          </DetailCard>
        ))}
    </>
  );
}

async function Rankings({ college }: { college: College }) {
  // The colleges of this stream, from the directory, so the table is real ranks.
  let directory: Awaited<ReturnType<typeof getColleges>>["data"] = [];
  try {
    directory = (await getColleges({ stream: college.stream, limit: 100 })).data;
  } catch {
    directory = [];
  }
  const { rows, position, of } = rankingTable(college, directory);
  const best = Math.min(...rows.map((row) => row.ranking.rank), college.ranking.rank || 1);

  return (
    <>
      <DetailCard>
        <div className="grid gap-8 sm:grid-cols-3">
          {college.ranking.rank > 0 && (
            <BigFigure
              label={`${college.ranking.authority} rank`}
              value={`#${college.ranking.rank}`}
              note={`${college.stream} category`}
            />
          )}
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

      {rows.length > 0 && (
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
      )}
    </>
  );
}

function Gallery({ college }: { college: College }) {
  // Photos the editor flagged as highlights come first.
  const photos = [...college.gallery].sort((a, b) => Number(b.highlight) - Number(a.highlight));
  const videos = college.videos;
  if (photos.length === 0 && videos.length === 0) {
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
      {photos.length > 0 && (
        <DetailCard title={`Photos (${photos.length})`}>
          {/* The first frame runs two columns wide, so the eye has somewhere
              to land instead of reading equal tiles left to right. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((image, i) => (
              <figure
                key={image.src}
                className={`group relative overflow-hidden rounded-xl bg-bg-alt ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                  }`}
              >
                <div className={`relative ${i === 0 ? "aspect-[16/10] h-full" : "aspect-[4/3]"}`}>
                  <Image
                    src={mediaUrl(image.src)}
                    alt={image.alt}
                    fill
                    // An uploaded photo is served by the API on another origin, which the optimizer is not set up for.
                    unoptimized={mediaUrl(image.src).startsWith("http")}
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
                  {image.name || image.alt}
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
              <figure key={`${video.provider}-${video.videoId}`}>
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

async function Compare({ college }: { college: College }) {
  // Colleges the editor pinned as similar, else the nearest by stream and rank.
  let pinned: CollegeBase[] = [];
  try {
    pinned = college.similarSlugs.length > 0 ? await collegesBySlugs(college.similarSlugs.slice(0, 2)) : [];
  } catch {
    pinned = [];
  }
  let peers: CollegeBase[] = [];
  try {
    peers = pinned.length > 0 ? pinned : await similarColleges(college, 2);
  } catch {
    peers = [];
  }
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
          <VsDuel
            colleges={[college, ...peers].map((c) => ({
              slug: c.slug,
              name: c.name,
              location: `${c.city}, ${c.state}`,
              rank: c.ranking.rank,
              authority: c.ranking.authority,
              rating: c.rating,
              fees: c.feesRange ?? "",
            }))}
          />
          <div className="mt-8">
            <ComparisonTable colleges={[college, ...peers]} />
          </div>
        </DetailCard>
      )}

      {curated.length > 0 && (
        <DetailCard title="Which Should You Choose?">
          <CuratedComparisons
            items={curated.map((c) => ({ slug: c.slug, title: c.title, intro: c.intro }))}
          />
        </DetailCard>
      )}
    </>
  );
}

function QnA({ college }: { college: College }) {
  return <QaList faqs={faqsOf(college)} collegeName={college.name} />;
}

function News({ college }: { college: College }) {
  const articles = [...college.articles].sort((a, b) => b.date.localeCompare(a.date));
  const alerts = [...college.alerts].sort((a, b) => Number(b.isUrgent) - Number(a.isUrgent) || b.date.localeCompare(a.date));
  const press = [...college.media].sort((a, b) => b.date.localeCompare(a.date));
  if (articles.length === 0 && alerts.length === 0 && press.length === 0) {
    return (
      <EmptyCard
        icon="news"
        title="No news yet"
        body={`There are no news or updates about ${college.name} yet.`}
      />
    );
  }

  return (
    <>
      {alerts.length > 0 && (
        <DetailCard title="Alerts">
          <AlertCards
            alerts={alerts.map((a) => ({
              title: a.title,
              kind: a.kind,
              date: longDate(a.date),
              link: a.link,
              urgent: a.isUrgent,
            }))}
          />
        </DetailCard>
      )}

      {articles.length > 0 && (
        <DetailCard title="Latest News">
          <NewsTimeline
            articles={articles.map((a) => ({
              title: a.title,
              date: longDate(a.date),
              author: a.author,
              summary: a.summary,
              paragraphs: a.body ? a.body.split(/\n\s*\n/).filter(Boolean) : [],
            }))}
          />
        </DetailCard>
      )}

      {press.length > 0 && (
        <DetailCard title="In the Press">
          <PressGrid
            items={press.map((m) => ({
              title: m.title,
              meta: [m.publication, m.date && longDate(m.date)].filter(Boolean).join(" · "),
              link: m.link,
            }))}
          />
        </DetailCard>
      )}
    </>
  );
}
