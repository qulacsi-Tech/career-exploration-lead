import Link from "next/link";
import { ArrowRight, CheckCircle2, Rocket, Target } from "lucide-react";
import type { ExamCutoffRow } from "@/lib/api";
import { mediaUrl } from "@/lib/media";

type Match = { slug: string; name: string; city: string; image: string; needed: number; score: string; category: string; course: string };

/** One row per college: the lowest percentile it asks for (the most reachable of its cut-offs). */
function byCollege(rows: ExamCutoffRow[]): Match[] {
  const best = new Map<string, Match>();
  for (const r of rows) {
    if (r.percentile === null) continue;
    const had = best.get(r.slug);
    if (!had || r.percentile < had.needed) {
      best.set(r.slug, { slug: r.slug, name: r.name, city: r.city, image: r.image, needed: r.percentile, score: r.score, category: r.category, course: r.course });
    }
  }
  return [...best.values()];
}

/** A note to keep going, from how far the nearest college is. */
function encouragement(gap: number | null): string {
  if (gap === null) return "Every mock makes the real paper feel more familiar. Keep going!";
  if (gap <= 5) return "You're knocking on the door. A few more right answers and you're in.";
  if (gap <= 15) return "Close! A focused week of practice could close this gap.";
  return "Every topper started somewhere. Work on your weak topics and climb.";
}

function CollegeTile({ m, percentile, eligible }: { m: Match; percentile: number; eligible: boolean }) {
  return (
    <li>
      <Link
        href={`/college/${m.slug}`}
        className={`group flex h-full items-center gap-3 rounded-2xl border bg-surface p-3 transition hover:-translate-y-0.5 hover:shadow-md ${eligible ? "border-emerald-200 hover:border-emerald-400" : "border-line hover:border-brand/40"}`}
      >
        {m.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(m.image)} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl border border-line object-cover" />
        ) : (
          <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft font-display font-extrabold text-brand">{m.name.charAt(0)}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink group-hover:text-brand" title={m.name}>{m.name}</span>
          <span className="block truncate text-xs text-ink-soft">
            {m.city}
            {m.course ? ` · ${m.course}` : ""} · {m.category}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block font-display text-xl font-extrabold leading-none ${eligible ? "text-emerald-600" : "text-brand"}`}>{Math.round(m.needed)}</span>
          <span className="block text-[10px] font-bold text-ink-faint">
            {eligible ? "cut-off" : `+${Math.max(1, Math.ceil(m.needed - percentile))} to go`}
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Below a result: the colleges whose cut-off for this exam the score clears, and the ones just out of reach. With
 * none cleared, a word of encouragement and the nearest targets, so the page always points somewhere.
 */
export function EligibleColleges({ rows, percentile, examSlug, shortName }: { rows: ExamCutoffRow[]; percentile: number; examSlug: string; shortName: string }) {
  const colleges = byCollege(rows).sort((a, b) => b.needed - a.needed);
  const eligible = colleges.filter((c) => c.needed <= percentile);
  const reach = colleges.filter((c) => c.needed > percentile).sort((a, b) => a.needed - b.needed).slice(0, 6);
  const gap = reach.length ? reach[0].needed - percentile : null;

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-line bg-surface">
      <div className={`p-6 ${eligible.length ? "bg-gradient-to-br from-emerald-50 to-surface" : "bg-gradient-to-br from-brand-soft to-surface"}`}>
        <p className="flex items-center gap-2 text-xs font-bold text-brand">
          <Target className="h-4 w-4" aria-hidden="true" /> Where this score can take you
        </p>
        {eligible.length > 0 ? (
          <>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">
              You clear the cut-off at <span className="text-emerald-600">{eligible.length}</span> {eligible.length === 1 ? "college" : "colleges"}!
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              At <span className="font-display font-extrabold text-ink">{percentile}</span> percentile, these {shortName} cut-offs are within your reach. Shortlist them now.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold text-ink">
              <Rocket className="h-6 w-6 text-brand" aria-hidden="true" /> Not there yet, and that&apos;s okay.
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              At <span className="font-display font-extrabold text-ink">{percentile}</span> percentile, no listed {shortName} cut-off is cleared yet. {encouragement(gap)}
            </p>
          </>
        )}
      </div>

      <div className="space-y-6 p-6">
        {eligible.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> You&apos;re eligible
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {eligible.slice(0, 9).map((m) => (
                <CollegeTile key={m.slug} m={m} percentile={percentile} eligible />
              ))}
            </ul>
          </div>
        )}

        {reach.length > 0 && (
          <div>
            <p className="text-sm font-bold text-ink">{eligible.length ? "Stretch targets" : "Your next targets"}</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {reach.map((m) => (
                <CollegeTile key={m.slug} m={m} percentile={percentile} eligible={false} />
              ))}
            </ul>
          </div>
        )}

        {colleges.length === 0 && (
          <p className="rounded-2xl bg-bg-alt px-5 py-4 text-sm text-ink-soft">
            No college has published a {shortName} cut-off with us yet. {encouragement(null)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-5">
          <Link href={`/exams/${examSlug}/practice`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">
            Practise more <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href={`/exams/${examSlug}#colleges`} className="text-sm font-semibold text-brand hover:text-brand-dark">
            All colleges accepting {shortName}
          </Link>
        </div>
      </div>
    </section>
  );
}
