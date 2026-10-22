import Link from "next/link";
import { ArrowRight, GitCompareArrows, HeartHandshake, MapPin, Target, Wallet, Building2, type LucideIcon } from "lucide-react";

/**
 * What sits between the colleges on the /colleges listing, after the Shiksha page the client pointed
 * at: a promotional banner every few rows, and a strip of one-tap filters.
 *
 * ## Static for now
 *
 * The banners are fixed copy, and the strips are built from the page's own filter options. The next
 * step makes the banners editable in the admin (image, text, link, where in the list it appears, and
 * the "Sponsored" tag for a paid slot). Until then they are our own promotions, in the shape an
 * advertiser's would take, so the layout can be judged.
 *
 * Both are server components. Their motion is CSS only (see the `tcp-*` classes in globals.css), and
 * the page wraps each in `Reveal` for the scroll-in.
 */

type BannerVariant = "compare" | "counselling" | "exams";

const BANNERS: Record<
  BannerVariant,
  { icon: LucideIcon; headline: string; sub: string; cta: string; href: string; track?: string; tone: string }
> = {
  compare: {
    icon: GitCompareArrows,
    headline: "Can't pick between two? Put them head to head.",
    sub: "Fees, placements and rankings, side by side. No spreadsheet required.",
    cta: "Compare colleges!",
    href: "/compare",
    tone: "from-brand-ink via-brand-dark to-brand",
  },
  counselling: {
    icon: HeartHandshake,
    headline: "Lost in the list? Totally normal.",
    sub: "A real counsellor matches colleges to your score and budget. Free, friendly and no spam.",
    cta: "Talk to a counsellor",
    href: "/enquiry",
    track: "cta_enquiry",
    tone: "from-amber-700 via-amber-600 to-gold",
  },
  exams: {
    icon: Target,
    headline: "Got an exam coming up? Know what to aim for.",
    sub: "See which colleges accept your exam and the cut-offs they ask for.",
    cta: "Browse exams",
    href: "/exams",
    tone: "from-emerald-800 via-emerald-700 to-teal-600",
  },
};

/** A wide promotional banner. The "Sponsored" tag marks the slot an advertiser's banner will take. */
export function PromoBanner({ variant }: { variant: BannerVariant }) {
  const b = BANNERS[variant];
  const Icon = b.icon;

  return (
    <aside
      aria-label="Promotion"
      className={`tcp-shimmer relative overflow-hidden rounded-2xl bg-gradient-to-r ${b.tone} px-6 py-6 text-white shadow-md sm:px-8`}
    >
      {/* Soft shapes that drift slowly behind the text. */}
      <span aria-hidden="true" className="tcp-float absolute -right-6 -top-8 h-36 w-36 rounded-full bg-white/10" />
      <span aria-hidden="true" className="tcp-float-slow absolute bottom-[-2.5rem] right-32 h-24 w-24 rounded-full bg-white/10" />
      <Icon aria-hidden="true" className="tcp-float absolute right-8 top-1/2 hidden h-24 w-24 -translate-y-1/2 text-white/25 sm:block" />

      <span className="absolute right-3 top-2 text-[10px] font-semibold uppercase tracking-widest text-white/70">Sponsored</span>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:pr-28">
        <div className="min-w-0">
          <p className="font-display text-xl font-extrabold leading-tight sm:text-2xl">{b.headline}</p>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">{b.sub}</p>
        </div>
        <Link
          href={b.href}
          data-track={b.track ?? `promo_${variant}`}
          className="tcp-wiggle inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-ink shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          {b.cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}

export type StripKind = "location" | "ownership" | "fees";

const STRIPS: Record<StripKind, { icon: LucideIcon; title: string; hint: string }> = {
  location: { icon: MapPin, title: "Filter by location", hint: "Pick a city and we will do the rest." },
  ownership: { icon: Building2, title: "Filter by ownership", hint: "Private, government or deemed?" },
  fees: { icon: Wallet, title: "Filter by fees", hint: "Know your budget? Start here." },
};

/**
 * A row of one-tap filters, in a bold band like Shiksha's "Filter by location". Each chip is a plain
 * link to the same URL the sidebar filter would produce, so it works without JavaScript and keeps
 * whatever else is already applied.
 */
export function FilterStrip({ kind, chips }: { kind: StripKind; chips: { label: string; href: string }[] }) {
  if (chips.length === 0) return null;
  const s = STRIPS[kind];
  const Icon = s.icon;

  return (
    <section
      aria-label={s.title}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-ink to-brand-dark px-5 py-5 text-white shadow-md sm:px-7"
    >
      <span aria-hidden="true" className="tcp-float-slow absolute -left-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-3 lg:w-56">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold uppercase leading-tight tracking-wide">{s.title}</p>
            <p className="text-xs text-white/80">{s.hint}</p>
          </div>
        </div>

        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.label}>
              <Link
                href={chip.href}
                scroll={false}
                className="inline-block rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand-ink shadow-sm transition hover:-translate-y-0.5 hover:scale-105 hover:bg-gold-soft hover:shadow-md"
              >
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
