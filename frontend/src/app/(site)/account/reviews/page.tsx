import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Star } from "lucide-react";
import { getMyReviews } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";
import { formatFull } from "@/lib/lead-labels";

export const metadata: Metadata = {
  title: "My reviews — TopCollegePath",
  robots: { index: false, follow: false },
};

const AREAS = [
  ["ratingPlacements", "Placements"],
  ["ratingFaculty", "Faculty"],
  ["ratingInfrastructure", "Infrastructure"],
  ["ratingCampusLife", "Campus life"],
] as const;

/** The reviews the student has written, and whether each one is live on the college's page or still with our team. */
export default async function ReviewsPage() {
  const token = await getUserToken();
  const items = token ? await getMyReviews(token).catch(() => null) : [];

  if (items === null) {
    return <p className="text-sm text-red-700">We could not load your reviews just now. Please refresh in a moment.</p>;
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="font-display text-lg font-bold text-ink">No reviews yet</p>
        <p className="mt-1 text-sm text-ink-soft">Studied somewhere? Write a review from the Reviews tab on that college&apos;s page.</p>
        <Link href="/colleges" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">Browse colleges</Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((r) => (
        <li key={r.id} className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/college/${r.collegeSlug}/reviews`} className="font-display text-lg font-bold text-ink hover:text-brand">{r.collegeName}</Link>
              <p className="text-xs text-ink-faint">{r.course} · batch {r.batch} · {formatFull(r.createdAt)}</p>
            </div>
            {r.approved ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> Live on the site</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900"><Clock className="h-3.5 w-3.5" /> Waiting for approval</span>
            )}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Star className="h-4 w-4 fill-gold text-gold" /> {r.rating.toFixed(1)} / 5
          </p>
          <p className="mt-2 text-sm text-ink">{r.body}</p>

          <ul className="mt-3 flex flex-wrap gap-2">
            {AREAS.map(([key, label]) =>
              r[key] ? (
                <li key={key} className="rounded-full bg-bg-alt px-3 py-1 text-xs text-ink-soft">
                  {label} <strong className="text-ink">{(r[key] as number).toFixed(1)}</strong>
                </li>
              ) : null,
            )}
          </ul>
        </li>
      ))}
    </ul>
  );
}
