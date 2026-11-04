import { Medal } from "lucide-react";
import { mediaUrl } from "@/lib/media";

export type CollegeAward = { title: string; year?: string; awardedBy?: string; description?: string; image?: string };

/** The awards a college has won: a small picture where there is one, the award's name, who gave it and when. */
export function AwardsSection({ awards, college }: { awards: CollegeAward[]; college: string }) {
  if (awards.length === 0) return null;
  return (
    <section aria-label="Awards and recognition" className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-brand-ink">
        <Medal className="h-5 w-5 text-gold" aria-hidden="true" /> Awards &amp; Recognition
      </h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {awards.map((a, i) => (
          <li key={`${a.title}-${i}`} className="flex items-start gap-4 rounded-xl border border-line-soft bg-bg-alt/50 p-4">
            {a.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(a.image)} alt={`${a.title}, awarded to ${college}`} className="h-[72px] w-24 shrink-0 rounded-lg border border-line bg-surface object-contain" />
            ) : (
              <span aria-hidden className="grid h-[72px] w-24 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold">
                <Medal className="h-8 w-8" />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-display text-base font-bold text-ink">{a.title}</p>
              {(a.awardedBy || a.year) && <p className="mt-0.5 text-sm font-medium text-brand-ink">{[a.awardedBy, a.year].filter(Boolean).join(" · ")}</p>}
              {a.description && <p className="mt-1.5 text-sm text-ink-soft">{a.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
