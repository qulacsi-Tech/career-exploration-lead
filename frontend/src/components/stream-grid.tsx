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
 * ## What sits where, and why
 *
 * The disc is small, so what goes on it was chosen rather than crammed:
 *
 * - **Front:** icon and stream name. Two lines is what a 150px circle holds
 *   at a readable size; a third would push all three under it.
 * - **Back:** the badge, the tagline and the call to action. All flavour —
 *   nothing a visitor needs in order to choose.
 * - **Under the disc:** the average CTC. Anything only reachable by hover is
 *   unreachable on a phone, and this is the number people actually compare
 *   streams on, so it is never hover-gated.
 *
 * ## The floor on the small type
 *
 * The captions are thin and quiet by request, and they stop at 9px with
 * `ink-soft` rather than going further. `ink-faint` was the obvious colour for
 * type this light and measures 3.10:1 on the disc and 2.91:1 on the section
 * ground — under AA before any thinning. Type that is small, thin AND low
 * contrast is type nobody reads, so the weight and size came down while the
 * colour went up: `ink-soft` is 5.98:1 and 5.61:1 on those two grounds.
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
    <section className="border-b border-line bg-bg-alt py-14 lg:py-16">
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
          className="mx-auto mt-10 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-6"
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
                  className="stream-coin block w-full max-w-[150px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg-alt"
                >
                  <div className="stream-coin-inner">
                    {/* Front — identity only. At this size the disc holds an
                        icon and a name legibly; a third line would force all
                        three below a readable size. */}
                    <span className="stream-coin-face gap-1.5 border border-line bg-surface px-3 text-center shadow-[0_14px_30px_-24px_rgba(28,33,40,0.5)]">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-display text-[13px] font-medium leading-tight text-ink">
                        {stream.name}
                      </span>
                    </span>

                    {/* Back — the badge and tagline the front no longer has
                        room for. Both are flavour rather than information; the
                        number people actually compare on is under the disc. */}
                    <span className="stream-coin-face--back stream-coin-face gap-1 border border-brand/30 bg-brand px-3.5 text-center text-white shadow-[0_16px_34px_-24px_rgba(28,33,40,0.6)]">
                      <span className="text-[8px] font-medium uppercase tracking-[0.14em] text-white/75">
                        {data.badge}
                      </span>
                      <span className="text-[11px] font-normal leading-snug">{data.tagline}</span>
                      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wider">
                        Explore <ArrowUpRight className="h-2.5 w-2.5" />
                      </span>
                    </span>
                  </div>
                </Link>

                <p className="mt-2.5 flex flex-col items-center text-center leading-tight">
                  <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-ink-soft">
                    Avg CTC
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium text-ink-soft">
                    {data.salaryRange}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>

        {/* Closing prompt for anyone who has not settled on a stream */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:flex-row sm:px-8">
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
