import Link from "next/link";
import { ArrowRight, Download, MapPin, Star, Trophy } from "lucide-react";
import type { College } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { CompareButton } from "@/components/colleges/compare-button";
import { ActionButton } from "@/components/college/college-actions";
import { collegeKey } from "@/lib/entity-url";

/** Shortcuts into the college's own pages (slugs from lib/college-sections.ts). */
const SHORTCUTS = [
  { label: "Courses", section: "courses" },
  { label: "Admissions", section: "admission-process" },
  { label: "Placements", section: "placements" },
  { label: "Cut-offs", section: "cutoffs" },
] as const;

/**
 * A college on an exam page's Colleges tab: the listing card's information in a compact row, sized for the narrower
 * tab column next to the exam's own sidebar. One header line (logo, name, place, rating, best ranking), one strip of
 * facts (courses, fees, average and highest package, exams), small Compare and Brochure buttons, and shortcuts.
 * `place` is the college's position in the tab's list, shown as a small number before the name.
 */
export function ExamCollegeCard({ college, place, examShort }: { college: College; place: number; examShort?: string }) {
  const href = `/college/${collegeKey(college)}`;
  const rankings = college.allRankings ?? [];
  const best = rankings[0] ?? (college.ranking?.rank ? { name: college.ranking.authority, rank: college.ranking.rank, shortName: college.ranking.authority } : undefined);
  const exams = college.examsAccepted ?? [];
  // The exam this page is about goes first in the list of exams accepted.
  const ordered = examShort ? [...exams].sort((a, b) => Number(b.toLowerCase() === examShort.toLowerCase()) - Number(a.toLowerCase() === examShort.toLowerCase())) : exams;
  const facts: { label: string; value: string; title?: string; strong?: boolean }[] = [
    { label: "Courses", value: college.coursesOffered ? String(college.coursesOffered) : "—" },
    { label: "Total fees", value: college.feesRange || "Ask the college" },
    { label: "Avg. package", value: (college.placementAverage ?? "").trim() || "—" },
    { label: "Highest package", value: (college.placementHighest ?? "").trim() || "—", strong: true },
    { label: "Exams accepted", value: ordered.join(", ") || "—", title: ordered.join(", ") },
  ];

  return (
    <article className="@container group relative rounded-2xl border border-line bg-surface p-4 transition duration-200 hover:border-brand/40 hover:shadow-[0_10px_24px_-14px_rgba(177,36,62,0.45)]">
      <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-brand opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {college.logo || college.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(college.logo || college.image || "")} alt={`${college.name} logo`} loading="lazy" className="h-14 w-14 rounded-xl border border-line bg-white object-cover" />
          ) : (
            <ImagePlaceholder label={`${college.name} logo`} rounded="rounded-xl" className="h-14 w-14" />
          )}
          <span className="absolute -left-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-brand-ink px-1.5 text-[11px] font-extrabold text-white shadow-sm" aria-label={`Number ${place} in this list`}>
            {place}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <Link href={href} className="min-w-0 font-display text-base font-bold leading-snug text-ink transition hover:text-brand @xl:text-lg">
              {college.name}
            </Link>
            {best && (
              <span
                title={rankings.map((r) => `${r.name}: #${r.rank}`).join("\n") || undefined}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-brand-ink"
              >
                <Trophy className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                <span className="max-w-[10rem] truncate">{best.shortName || best.name}</span>
                <span className="font-display text-sm font-extrabold text-brand">#{best.rank}</span>
                {rankings.length > 1 && <span className="text-[10px] text-ink-soft">+{rankings.length - 1}</span>}
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              {[college.city, college.state].filter(Boolean).join(", ")}
            </span>
            <span className="rounded-full border border-line bg-bg-alt px-2 py-px text-[11px] font-semibold">{college.ownership}</span>
            {college.established ? <span className="text-xs">Est. {college.established}</span> : null}
            {college.reviewCount > 0 && (
              <span className="inline-flex items-center gap-1" aria-label={`Rated ${college.rating.toFixed(1)} out of 5 from ${college.reviewCount} reviews`}>
                <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden="true" />
                <span className="font-bold text-ink">{college.rating.toFixed(1)}</span>
                <span className="text-xs">({college.reviewCount})</span>
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 @2xl:flex-row @2xl:items-center">
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-bg-alt/70 px-3 py-2.5 @md:grid-cols-3 @2xl:grid-cols-5">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="truncate text-[11px] font-semibold text-ink-faint">{f.label}</dt>
              <dd title={f.title ?? f.value} className={`truncate text-sm font-bold ${f.strong ? "text-brand" : "text-ink"}`}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex shrink-0 gap-2 @2xl:flex-col">
          <div className="flex-1 [&>button]:w-full [&>button]:justify-center [&>button]:py-1.5">
            <CompareButton slug={college.slug} name={college.name} />
          </div>
          <ActionButton
            kind="brochure"
            options={{ collegeSlug: college.slug, collegeName: college.name, brochureUrl: college.brochureUrl || "" }}
            fallbackHref={college.brochureUrl || "/enquiry"}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Brochure
          </ActionButton>
        </div>
      </div>

      <nav aria-label={`More about ${college.name}`} className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {SHORTCUTS.map((s) => (
          <Link key={s.section} href={`${href}/${s.section}`} className="font-semibold text-brand-ink transition hover:text-brand hover:underline">
            {s.label}
          </Link>
        ))}
        <Link href={href} className="ml-auto inline-flex items-center gap-1 font-bold text-brand hover:text-brand-dark">
          View college <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </nav>
    </article>
  );
}
