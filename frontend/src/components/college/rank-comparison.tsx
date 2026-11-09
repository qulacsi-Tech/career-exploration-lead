import Link from "next/link";
import { Trophy } from "lucide-react";

export type RankPeer = { slug: string; name: string; rank: number };

/**
 * How a college stands among others by rank, drawn so it reads at a glance: a ring that fills the closer the college
 * is to the top, with its place in the middle ("2 of 6"), and a leaderboard beside it. The college itself is
 * highlighted, the leader wears a trophy, and every other college links to its own Rankings page.
 */
export function RankComparison({ peers, currentSlug }: { peers: RankPeer[]; currentSlug: string }) {
  const sorted = [...peers].sort((a, b) => a.rank - b.rank);
  const place = Math.max(1, sorted.findIndex((p) => p.slug === currentSlug) + 1);
  const total = sorted.length;
  const best = sorted[0]?.rank ?? 1;

  // The ring is full for first place and shrinks as the college drops down the list.
  const fraction = total <= 1 ? 1 : (total - place + 1) / total;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)] md:items-center">
      <figure className="mx-auto text-center" aria-label={`Place ${place} of ${total} colleges compared`}>
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="14" className="stroke-bg-alt" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${circumference * fraction} ${circumference}`}
              className="stroke-brand"
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center">
            <p className="font-display text-4xl font-extrabold leading-none text-ink">{place}<span className="text-xl font-bold text-ink-faint"> / {total}</span></p>
            <p className="mt-1 text-xs font-medium text-ink-soft">place</p>
          </div>
        </div>
        <figcaption className="mt-2 text-sm text-ink-soft">among the colleges compared</figcaption>
      </figure>

      <ol className="space-y-2.5">
        {sorted.map((p, i) => {
          const me = p.slug === currentSlug;
          const width = Math.max(8, Math.round((best / p.rank) * 100));
          const row = (
            <div className={`rounded-xl border px-4 py-3 transition ${me ? "border-brand bg-brand-soft/60" : "border-line bg-surface hover:border-brand/40"}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-9 min-w-9 shrink-0 place-items-center rounded-full px-2 text-sm font-extrabold ${me ? "bg-brand text-white" : "bg-bg-alt text-ink"}`}>
                  {i === 0 ? <Trophy className="h-4 w-4" aria-hidden="true" /> : `#${p.rank}`}
                </span>
                <p className={`min-w-0 flex-1 truncate text-sm ${me ? "font-bold text-brand-ink" : "font-medium text-ink"}`}>{p.name}</p>
                {i === 0 && <span className="shrink-0 text-xs font-bold text-ink-soft">#{p.rank}</span>}
                {me && <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">This college</span>}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-alt">
                <div className={`h-full rounded-full ${me ? "bg-brand" : "bg-brand/40"}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
          return <li key={p.slug}>{me ? row : <Link href={`/college/${p.slug}/rankings`} className="block">{row}</Link>}</li>;
        })}
      </ol>
    </div>
  );
}
