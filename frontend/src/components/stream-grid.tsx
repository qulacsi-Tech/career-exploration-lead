import Link from "next/link";
import {
  Briefcase,
  Cpu,
  Stethoscope,
  Palette,
  BarChart3,
  Scale,
  ArrowUpRight,
  Award,
  BookOpen,
} from "lucide-react";

interface StreamItem {
  slug: string;
  name: string;
  count: number;
}

const streamEnhancements: Record<
  string,
  { icon: React.ElementType; tagline: string; salaryRange: string; badge: string }
> = {
  management: {
    icon: Briefcase,
    tagline: "Leadership & Global Enterprise",
    salaryRange: "₹9 - 32 LPA",
    badge: "Top Placement ROI",
  },
  engineering: {
    icon: Cpu,
    tagline: "Next-Gen Tech, AI & Systems",
    salaryRange: "₹8 - 38 LPA",
    badge: "Highest Demand",
  },
  medical: {
    icon: Stethoscope,
    tagline: "Clinical Healthcare & Biotech",
    salaryRange: "₹10 - 45 LPA",
    badge: "Vital Impact",
  },
  arts: {
    icon: Palette,
    tagline: "Media, Design & Humanities",
    salaryRange: "₹6 - 20 LPA",
    badge: "Fastest Emerging",
  },
  commerce: {
    icon: BarChart3,
    tagline: "Banking, Markets & Capital",
    salaryRange: "₹7 - 24 LPA",
    badge: "Market Drivers",
  },
  law: {
    icon: Scale,
    tagline: "Litigation, IP & Policy",
    salaryRange: "₹8 - 26 LPA",
    badge: "High Prestige",
  },
};

/**
 * The streams, as discs that turn over on hover.
 *
 * ## What came back, and what did not
 *
 * The circular coin format is the one this section had before the card grid.
 * What the 15 Sep MOM removed was never the shape — it was the **autoplay**:
 * a deck that spun and dealt the discs on an eight-second timer, turning
 * streams face-down while somebody was trying to read them.
 *
 * So the disc returns and the timer does not. Nothing moves until a visitor
 * points at it.
 *
 * ## Why the stream is on the FRONT
 *
 * The original was face-down by default and the shuffle did the revealing.
 * With the shuffle gone, face-down would mean six identical discs and no way
 * to tell which is Engineering without hovering each one — and no way at all on
 * a touch screen, where there is no hover. That would break the MOM
 * instruction that streams be "displayed directly" far harder than the
 * animation ever did.
 *
 * Face-up it is: the name and the icon are readable on arrival and in the HTML
 * a crawler receives. The turn is a reward for interest, not a toll on it.
 *
 * ## Why the CTC sits outside the disc
 *
 * Anything only reachable by hover is unreachable on a phone. The salary range
 * is the number people actually compare streams on, so it is printed under the
 * circle where everyone gets it; the back face carries the tagline and the
 * call to action, which are enrichment rather than information.
 *
 * ## The small labels are ink-soft, not ink-faint
 *
 * The badge and the "Avg CTC" caption were thinned to sit more quietly beside
 * the bigger discs. They were on `ink-faint`, which measures 3.10:1 on the disc
 * and 2.91:1 on the section ground — under AA before any thinning. Lightening
 * the weight of type that is also low contrast is how a label stops being
 * readable at all, so the weight came down and the colour moved up to
 * `ink-soft`: 5.98:1 and 5.61:1. Lighter to look at, easier to read.
 *
 * ## No JavaScript
 *
 * The flip is `:hover` and `:focus-within` on a CSS class (globals.css). No
 * state, no effects, no framer-motion — so this stays a server component and
 * the section ships no client JS whatsoever. Each disc is a single link, which
 * is also why keyboard focus reaches the back face without any tabindex
 * juggling: there is only ever one focusable thing per stream.
 */
export function StreamGrid({ streams }: { streams: StreamItem[] }) {
  return (
    <section className="border-b border-line bg-bg-alt py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Chart Your Discipline. <span className="italic text-brand">Shape Your Tomorrow.</span>
          </h2>
          <p className="mt-3 text-base text-ink-soft">
            Pick a stream to see its colleges, entrance exams, fees and placement records.
          </p>
        </div>

        <ul
          role="list"
          className="mx-auto mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-4"
        >
          {streams.map((stream) => {
            const data = streamEnhancements[stream.slug] || {
              icon: BookOpen,
              tagline: "Specialized Degree Programs",
              salaryRange: "₹6 - 22 LPA",
              badge: "Verified Curriculum",
            };
            const Icon = data.icon;

            return (
              <li key={stream.slug} className="flex flex-col items-center">
                <Link
                  href={`/${stream.slug}/colleges`}
                  aria-label={`${stream.name} — ${data.tagline}. Average CTC ${data.salaryRange}.`}
                  className="stream-coin block w-full max-w-[200px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-bg-alt"
                >
                  <div className="stream-coin-inner">
                    {/* Front — identity. Legible on arrival, and in the HTML. */}
                    <span className="stream-coin-face gap-2 border border-line bg-surface px-4 text-center shadow-[0_18px_40px_-26px_rgba(28,33,40,0.5)]">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="font-display text-lg font-semibold leading-tight text-ink">
                        {stream.name}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-soft">
                        {data.badge}
                      </span>
                    </span>

                    {/* Back — enrichment. Never the only home of anything. */}
                    <span className="stream-coin-face--back stream-coin-face gap-2 border border-brand/30 bg-brand px-5 text-center text-white shadow-[0_22px_50px_-26px_rgba(28,33,40,0.6)]">
                      <span className="text-[13px] font-medium leading-snug">{data.tagline}</span>
                      <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                        Explore <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </span>
                  </div>
                </Link>

                <p className="mt-3 flex flex-col items-center text-center">
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-soft">
                    Avg CTC
                  </span>
                  <span className="mt-0.5 text-sm font-semibold text-ink">{data.salaryRange}</span>
                </p>
              </li>
            );
          })}
        </ul>

        {/* Closing prompt for anyone who has not settled on a stream */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:flex-row sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-ink">
                Unsure which stream matches your aptitude?
              </p>
              <p className="text-xs text-ink-soft">
                Explore comprehensive curriculum guides and connect with educational counselors.
              </p>
            </div>
          </div>

          <Link
            href="/courses"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            <span>Browse All Courses</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
