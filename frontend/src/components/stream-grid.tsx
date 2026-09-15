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
  TrendingUp,
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
 * The streams, shown plainly.
 *
 * Replaces the shuffling coin deck (`story-stream-explorer`), per the 15 Sep
 * MoM: "No animation is required for displaying streams... displayed directly
 * on the website." Every stream is legible on arrival — nothing is face-down,
 * nothing is waiting its turn, and there is no timer.
 *
 * With the animation gone this is a server component again: no state, no
 * effects, no framer-motion on the client for a section that is six links.
 * Hover is a border and a lift, which CSS does on its own.
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

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {streams.map((stream) => {
            const data = streamEnhancements[stream.slug] || {
              icon: BookOpen,
              tagline: "Specialized Degree Programs",
              salaryRange: "₹6 - 22 LPA",
              badge: "Verified Curriculum",
            };
            const Icon = data.icon;

            return (
              <Link
                key={stream.slug}
                href={`/${stream.slug}/colleges`}
                className="group flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>

                  <span className="rounded-full border border-line bg-bg-alt px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                    {data.badge}
                  </span>
                </div>

                <h3 className="mt-5 font-display text-xl font-bold text-ink transition-colors group-hover:text-brand">
                  {stream.name}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">{data.tagline}</p>

                <div className="mt-5 flex items-center justify-between border-t border-line-soft pt-4 text-sm">
                  <span className="flex items-center gap-1.5 text-ink-soft">
                    <TrendingUp className="h-4 w-4 text-brand" />
                    Avg CTC <strong className="font-semibold text-ink">{data.salaryRange}</strong>
                  </span>

                  <span className="flex items-center gap-1 text-sm font-semibold text-brand">
                    Explore
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Closing prompt for anyone who has not settled on a stream */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:flex-row sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
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
