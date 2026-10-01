import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { BellRing, Headset, MessagesSquare, PhoneCall, Sparkles } from "lucide-react";
import {
  BigFigure,
  CardLink,
  ColumnLabel,
  DataList,
  DetailCard,
  FaqAccordion,
  IconStat,
  MeterList,
  PeerGrid,
  PollStat,
  ReviewSnippet,
  ScoreRow,
} from "@/components/college/detail-ui";
import { Chip } from "@/components/ui/chip";
import { alertsFor } from "@/lib/college-content";
import {
  faqsFor,
  lakhValue,
  monogram,
  overallScore,
  percentOf,
  shortFee,
} from "@/lib/college-insights";
import { sectionHref } from "@/lib/college-sections";
import { getCollege, getCollegeSlugs, getSimilarColleges } from "@/lib/api";
import type { College } from "@/lib/api";

export async function generateStaticParams() {
  try {
    const slugs = await getCollegeSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    // Backend unavailable at build time — pages render on-demand
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const college = await getCollege(slug);
    return {
      title: `${college.name}: Courses, Fees, Placements & Reviews`,
      description: college.about,
      alternates: { canonical: `/college/${college.slug}` },
    };
  } catch {
    return { title: "College not found" };
  }
}

export default async function CollegeOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let college: College;
  try {
    college = await getCollege(slug);
  } catch {
    notFound();
  }

  // college-insights helpers accept the same College shape (structural compat)
  const short = monogram(college.name);
  const href  = (section: string) => sectionHref(college.slug, section);

  const alerts = [...alertsFor(college.slug)].sort(
    (a, b) => Number(b.isUrgent) - Number(a.isUrgent),
  );

  // Fees as bars against the dearest programme, dearest first
  const feeRows = (college.courses ?? [])
    .map((course) => ({ course, lakh: lakhValue(course.fees) }))
    .sort((a, b) => (b.lakh ?? 0) - (a.lakh ?? 0));
  const maxFee = Math.max(...feeRows.map((row) => row.lakh ?? 0), 1);

  // Package spread
  const placement = college.placement;
  const packages = placement
    ? [
        { label: "Median package",  value: placement.median  },
        { label: "Average package", value: placement.average },
        { label: "Highest package", value: placement.highest },
      ]
    : [];
  const maxPackage = Math.max(...packages.map((p) => lakhValue(p.value) ?? 0), 1);

  // Peer grid — similar colleges from API
  let peers: College[] = [];
  try {
    peers = await getSimilarColleges(slug, 8);
  } catch {
    peers = [];
  }

  const reviews = [...(college.reviews ?? [])]
    .sort((a, b) => b.rating - a.rating || b.body.length - a.body.length)
    .slice(0, 2);

  // faqsFor needs placement — guard for missing data
  const faqs = college.placement
    ? faqsFor(college as Parameters<typeof faqsFor>[0])
    : [];
  const overall = overallScore(college as Parameters<typeof overallScore>[0]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {college.name} Overview
      </h2>

      {/* What's new */}
      {alerts.length > 0 && (
        <DetailCard
          title="What's new?"
          action={
            <span className="inline-flex items-center gap-1.5 text-sm text-ink-faint">
              <BellRing className="h-4 w-4" />
              For all courses
            </span>
          }
        >
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5 ${
                  alert.isUrgent ? "bg-brand-soft" : "bg-bg-alt"
                }`}
              >
                {alert.isUrgent && (
                  <span aria-hidden className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                  </span>
                )}
                <Chip tone={alert.isUrgent ? "brand" : undefined}>{alert.kind}</Chip>
                <span className="min-w-0 flex-1 font-medium text-ink">{alert.title}</span>
                <span className="shrink-0 text-sm text-ink-faint">{alert.date}</span>
              </li>
            ))}
          </ul>
        </DetailCard>
      )}

      {/* Snapshot */}
      <DetailCard>
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-6">
            {(college.ratingBreakdown ?? []).map((row) => (
              <ScoreRow key={row.label} score={row.score} label={row.label} />
            ))}
          </div>
          <div className="space-y-6">
            <IconStat
              icon="trophy"
              value={`#${college.ranking.rank}`}
              label={`${college.ranking.authority} ${college.stream} ranking`}
            />
            <IconStat icon="rupee" value={college.feesRange} label="Total fees, all programmes" />
            {placement && (
              <IconStat
                icon="trend"
                value={placement.average}
                label={`Average package, ${placement.year}`}
              />
            )}
            {college.established && (
              <IconStat
                icon="calendar"
                value={`${college.established}`}
                label={`Established · ${college.ownership}`}
              />
            )}
          </div>
        </div>
      </DetailCard>

      {/* About */}
      {college.about && (
        <DetailCard
          title={`About ${short}`}
          footer={
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-semibold text-ink">Approved by</span>
              {(college.approvals ?? []).map((approval) => (
                <Chip key={approval} tone="brand">{approval}</Chip>
              ))}
            </div>
          }
        >
          <p className="max-w-3xl text-lg leading-relaxed text-ink-soft">{college.about}</p>
          <div className="mt-9 grid gap-8 sm:grid-cols-3">
            <BigFigure label="Programmes" value={`${college.coursesOffered}`} note="Degrees on offer" />
            <BigFigure
              label="Student rating"
              value={college.rating.toFixed(1)}
              note={`From ${college.reviewCount.toLocaleString("en-IN")} reviews`}
            />
            {college.established && (
              <BigFigure
                label="Years running"
                value={`${new Date().getFullYear() - college.established}`}
                note={`Since ${college.established}`}
              />
            )}
          </div>
        </DetailCard>
      )}

      {/* Courses & fees */}
      {feeRows.length > 0 && (
        <DetailCard
          title="Courses & Fees"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-semibold text-ink">Exams accepted</span>
                {(college.examsAccepted ?? []).map((exam) => (
                  <Chip key={exam}>{exam}</Chip>
                ))}
              </div>
              <CardLink href={href("courses")}>All courses &amp; fees</CardLink>
            </div>
          }
        >
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <ColumnLabel>Total fees by programme</ColumnLabel>
              <MeterList
                rows={feeRows.map(({ course, lakh }) => ({
                  label: course.name,
                  display: shortFee(course.fees),
                  fraction: lakh === null ? null : lakh / maxFee,
                }))}
              />
            </div>
            <div>
              <ColumnLabel>Programmes offered</ColumnLabel>
              <DataList
                rows={(college.courses ?? []).map((course) => ({
                  label: course.name,
                  value: (
                    <>
                      <span className="font-display text-base font-bold text-ink">
                        {course.duration.replace(" Months", "")}
                      </span>{" "}
                      months &middot; {course.mode}
                    </>
                  ),
                }))}
              />
            </div>
          </div>
        </DetailCard>
      )}

      {/* Placements */}
      {placement && (
        <DetailCard
          title={`${short} Placements ${placement.year}`}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-ink-soft">
                <span className="font-semibold text-ink">Top recruiters:</span>{" "}
                {placement.topRecruiters.slice(0, 5).join(", ")}
              </p>
              <CardLink href={href("placements")}>Full placement report</CardLink>
            </div>
          }
        >
          <div className="grid gap-10 md:grid-cols-2">
            <BigFigure
              label="Average package"
              value={placement.average}
              note={`Highest ${placement.highest} · median ${placement.median}`}
            />
            <div>
              <ColumnLabel>Package spread</ColumnLabel>
              <MeterList
                rows={packages.map((p) => {
                  const lakh = lakhValue(p.value);
                  return {
                    label: p.label,
                    display: p.value,
                    fraction: lakh === null ? null : lakh / maxPackage,
                    highlight: p.label === "Average package",
                  };
                })}
              />
            </div>
          </div>
        </DetailCard>
      )}

      {/* Counsellor call-out */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(28,33,40,0.06)] sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="font-display text-2xl font-extrabold tracking-tight text-brand sm:text-3xl">
              Confused about {short}?
            </p>
            <p className="mt-2 text-base text-ink-soft">
              Talk to an admission counsellor about fees, cut-offs and your chances — free.
            </p>
            <Link
              href="/enquiry"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              <PhoneCall className="h-4 w-4" />
              Get a free callback
            </Link>
          </div>
          <div aria-hidden className="relative mx-auto h-32 w-40 shrink-0 sm:mx-0">
            <span className="absolute inset-4 rotate-6 rounded-3xl bg-brand-soft" />
            <span className="absolute inset-4 -rotate-3 rounded-3xl border-2 border-brand/30 bg-surface" />
            <Headset className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-brand" />
            <Sparkles className="absolute right-0 top-0 h-6 w-6 text-gold" />
            <Sparkles className="absolute bottom-1 left-0 h-4 w-4 text-brand/60" />
          </div>
        </div>
      </section>

      {/* What students say */}
      {(college.ratingBreakdown ?? []).length > 0 && (
        <DetailCard
          title="What Students Say"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">
                Overall <strong className="text-ink">{overall.toFixed(1)} / 5</strong> across{" "}
                {college.reviewCount.toLocaleString("en-IN")} reviews
              </p>
              <CardLink href={href("reviews")}>Read all reviews</CardLink>
            </div>
          }
        >
          <div className="grid gap-10 sm:grid-cols-2">
            {(college.ratingBreakdown ?? []).map((row) => (
              <PollStat
                key={row.label}
                fraction={row.score / 5}
                value={row.score}
                caption={`out of 5 for ${row.label.toLowerCase()}.`}
                note={`${college.reviewCount.toLocaleString("en-IN")} reviews`}
              />
            ))}
          </div>
        </DetailCard>
      )}

      {/* Cutoffs */}
      {(college.cutoffs ?? []).length > 0 && (
        <DetailCard
          title={`${short} Cut-Offs`}
          action={<CardLink href={href("cutoffs")}>All cut-offs</CardLink>}
        >
          <MeterList
            rows={(college.cutoffs ?? []).map((cutoff) => {
              const percent = percentOf(cutoff.score);
              return {
                label: `${cutoff.exam} · ${cutoff.category}`,
                display: cutoff.score,
                fraction: percent === null ? null : percent / 100,
              };
            })}
          />
        </DetailCard>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <DetailCard
          title={`Reviews about ${short}`}
          action={<CardLink href={href("reviews")}>All reviews</CardLink>}
        >
          <div className="space-y-5">
            {reviews.map((review, i) => (
              <ReviewSnippet key={`${review.author}-${i}`} review={review} clamp />
            ))}
          </div>
        </DetailCard>
      )}

      {/* Similar colleges — live from API */}
      {peers.length > 0 && (
        <DetailCard
          title={`Explore Colleges Similar to ${short}`}
          action={<CardLink href={href("compare")}>Compare</CardLink>}
        >
          <PeerGrid
            peers={peers.map((peer) => ({
              slug: peer.slug,
              name: peer.name,
              score: peer.rating,
              ownership: peer.ownership,
              city: peer.city,
              state: peer.state,
              reviewCount: peer.reviewCount,
            }))}
          />
        </DetailCard>
      )}

      {/* Q&A */}
      {faqs.length > 0 && (
        <DetailCard footer={<CardLink href={href("qna")}>See all questions</CardLink>}>
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
            <span
              aria-hidden
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"
            >
              <MessagesSquare className="h-8 w-8" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-brand sm:text-2xl">
                What do students ask about {college.name}?
              </h2>
              <p className="mt-2 text-base leading-relaxed text-ink-soft">
                Quick answers on fees, admissions, cut-offs and placements at{" "}
                <strong className="text-ink">{college.name}</strong>.
              </p>
            </div>
          </div>
          <FaqAccordion faqs={faqs.slice(0, 3)} />
        </DetailCard>
      )}
    </div>
  );
}
