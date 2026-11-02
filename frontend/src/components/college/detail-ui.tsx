"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock,
  GitCompareArrows,
  GraduationCap,
  Images,
  IndianRupee,
  Layers,
  MapPin,
  MessageSquareText,
  Newspaper,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ActionButton, useCollegeActions } from "@/components/college/college-actions";
import { loadReviewVotes, voteReview } from "@/lib/college-engage-actions";
import { SESSION_CHANGED_EVENT } from "@/lib/user-session-cookie";
import type { ReviewVotes as ReviewVoteState } from "@/lib/api";
import { scoreTone } from "@/lib/college-insights";
import { plural } from "@/lib/college-rules";

/**
 * The building blocks of the college detail page.
 *
 * The page is a column of white cards on a warm ground, and inside each card
 * the facts are drawn rather than written: a score is a coloured badge, a
 * share is a filled bar, a rating is a pie beside a large number. A visitor
 * compares shapes faster than sentences, and a page they can scan is one they
 * keep scrolling.
 *
 * Every primitive is here, in one module, so the overview and the ten section
 * pages share one visual vocabulary — a bar on Placements and a bar on
 * Cut-Offs are the same bar.
 *
 * ## Icons cross the server boundary by name
 *
 * The pages are server components and a Lucide component is not serializable,
 * so props name an icon as a string and `ICONS` resolves it here.
 */

const ICONS = {
  award: Award,
  book: BookOpen,
  briefcase: Briefcase,
  building: Building2,
  calendar: CalendarDays,
  clock: Clock,
  compare: GitCompareArrows,
  grad: GraduationCap,
  images: Images,
  layers: Layers,
  map: MapPin,
  message: MessageSquareText,
  news: Newspaper,
  rupee: IndianRupee,
  star: Star,
  trend: TrendingUp,
  trophy: Trophy,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ *
   Card shell
 * ------------------------------------------------------------------ */

/**
 * One white card on the page ground. Rises into place on first view.
 *
 * `footer` is the tinted band along the bottom edge — the place for a single
 * supporting fact or the onward link, set apart so it does not compete with
 * the card's main figures.
 */
export function DetailCard({
  title,
  id,
  action,
  footer,
  children,
  className = "",
}: {
  title?: string;
  id?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id={id}
      aria-label={title}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={`scroll-mt-44 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(28,33,40,0.06)] ${className}`}
    >
      <div className="p-6 sm:p-9">
        {(title || action) && (
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            {title && (
              <h2 className="font-display text-xl font-bold tracking-tight text-brand sm:text-2xl">
                {title}
              </h2>
            )}
            {action}
          </div>
        )}
        {children}
      </div>
      {footer && (
        <div className="border-t border-line-soft bg-bg-alt px-6 py-5 sm:px-9">{footer}</div>
      )}
    </motion.section>
  );
}

/** The "View all …" link a card ends on. */
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** A small label over a column inside a card. */
export function ColumnLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 text-lg font-semibold text-ink">{children}</h3>;
}

/* ------------------------------------------------------------------ *
   Scores
 * ------------------------------------------------------------------ */

const TONE_CLASS = {
  high: "bg-brand text-white",
  mid: "bg-gold text-white",
  low: "bg-line text-ink",
} as const;

/**
 * A 0-5 score in a filled circle, coloured by band. The number stays in the
 * badge — colour says "good or not" at a glance, the digits say how good.
 */
export function ScoreBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-xl",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold ${TONE_CLASS[scoreTone(score)]} ${sizes[size]}`}
    >
      {score.toFixed(1)}
    </span>
  );
}

/** Badge beside a label — the left column of the snapshot card. */
export function ScoreRow({ score, label, note }: { score: number | null; label: string; note?: string }) {
  if (score === null) {
    return (
      <div className="flex items-center gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-full bg-line-soft font-display text-xs font-bold text-ink-faint">
          N/A
        </span>
        <div>
          <p className="text-lg text-ink-soft">{label}</p>
          <p className="text-xs text-ink-faint">No data available</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <ScoreBadge score={score} />
      <div>
        <p className="text-lg text-ink">{label}</p>
        {note && <p className="text-xs text-ink-faint">{note}</p>}
      </div>
    </div>
  );
}

/** Five stars with the score's fraction filled — a read-out, not an input. */
export function Stars({ score, className = "h-4 w-4" }: { score: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${score.toFixed(1)} out of 5`} role="img">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, score - i));
        return (
          <span key={i} className="relative">
            <Star className={`${className} text-line`} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={`${className} fill-gold text-gold`} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ *
   Figures
 * ------------------------------------------------------------------ */

/** Icon, bold value, quiet label — the right column of the snapshot card. */
export function IconStat({ icon, value, label }: { icon: IconName; value: ReactNode | null; label: string }) {
  const Icon = ICONS[icon];
  const empty = value === null;
  return (
    <div className="flex items-start gap-4">
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${empty ? "animate-pulse bg-line-soft text-ink-faint" : "bg-brand-soft text-brand"}`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className={`font-display text-lg font-bold leading-tight ${empty ? "text-ink-faint" : "text-ink"}`}>{empty ? "No data available" : value}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

/** One large figure under a label — "Average package / ₹14.2 LPA". */
export function BigFigure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <p className="text-base text-ink">{label}</p>
      <p className="mt-1 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        {value}
      </p>
      {note && <p className="mt-2 text-sm text-ink-soft">{note}</p>}
    </div>
  );
}

/**
 * A pie beside a large number — the poll treatment.
 *
 * The pie is a conic gradient on a span: no SVG to animate, and the share is
 * exact at any size. `fraction` is 0-1.
 */
export function PollStat({
  fraction,
  value,
  caption,
  note,
}: {
  fraction: number;
  value: number;
  caption: string;
  note?: string;
}) {
  const degrees = Math.round(Math.max(0, Math.min(1, fraction)) * 360);
  return (
    <div>
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="h-10 w-10 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(var(--color-brand) 0deg ${degrees}deg, var(--color-line-soft) ${degrees}deg 360deg)`,
          }}
        />
        <p className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {value.toFixed(1)}
        </p>
      </div>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">
        {caption} {note && <span className="text-xs text-ink-faint">{note}</span>}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Bars and lists
 * ------------------------------------------------------------------ */

export type MeterRowItem = {
  label: string;
  /** Shown at the right edge — the figure as the data states it. */
  display: string;
  /** 0-1 fill. Null draws the row with no bar, for figures with no scale. */
  fraction: number | null;
  /** Emphasises one row — "this college" in a peer list. */
  highlight?: boolean;
  href?: string;
};

/**
 * Labelled rows with a fill behind the label — share-of-whole at a glance.
 *
 * Width sets the value and `scaleX` animates it, so the grow-in does not lay
 * the card out on every frame.
 */
export function MeterList({ rows }: { rows: MeterRowItem[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <ul className="space-y-1">
      {rows.map((row, i) => {
        const label = row.href ? (
          <Link href={row.href} className="hover:underline">
            {row.label}
          </Link>
        ) : (
          row.label
        );
        return (
          <li
            key={`${row.label}-${i}`}
            className={`relative flex min-h-[52px] items-center justify-between gap-4 overflow-hidden px-4 ${
              row.highlight ? "bg-brand-soft ring-1 ring-brand/40" : "bg-line-soft/70"
            }`}
          >
            {row.fraction !== null && (
              <motion.span
                aria-hidden
                className={`absolute inset-y-0 left-0 ${row.highlight ? "bg-brand/30" : "bg-brand/20"}`}
                initial={reduceMotion ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.9, delay: 0.05 + i * 0.07, ease: EASE }}
                style={{
                  width: `${Math.max(2, Math.min(1, row.fraction) * 100)}%`,
                  transformOrigin: "left",
                }}
              />
            )}
            <span className={`relative text-base ${row.highlight ? "font-semibold text-brand-ink" : "text-ink"}`}>
              {label}
            </span>
            <span className="relative shrink-0 text-base font-medium text-ink">{row.display}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Label-value rows with a "More" toggle past `visible` — the popular-courses
 * list. Collapsed so a long list does not stretch its card past its partner
 * column, and expandable in place rather than linking away.
 */
export function DataList({
  rows,
  visible = 4,
}: {
  rows: { label: string; value: ReactNode; href?: string }[];
  visible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, visible);

  return (
    <div className="border-t border-line">
      <ul>
        {shown.map((row, i) => (
          <li
            key={`${row.label}-${i}`}
            className="flex items-center justify-between gap-4 border-b border-line py-3.5"
          >
            {row.href ? (
              <Link href={row.href} className="text-base text-ink hover:text-brand">
                {row.label}
              </Link>
            ) : (
              <span className="text-base text-ink">{row.label}</span>
            )}
            <span className="shrink-0 text-right text-sm text-ink-soft">{row.value}</span>
          </li>
        ))}
      </ul>
      {rows.length > visible && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="flex items-center gap-1 border-b border-line py-3.5 text-sm font-semibold text-brand w-full"
        >
          {expanded ? "Less" : "More"}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Similar colleges
 * ------------------------------------------------------------------ */

export type PeerItem = {
  slug: string;
  name: string;
  score: number;
  ownership: string;
  city: string;
  state: string;
  reviewCount: number;
};

/** Two-up grid of peer colleges with a "+ More" that reveals the rest in place. */
export function PeerGrid({ peers, visible = 4 }: { peers: PeerItem[]; visible?: number }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? peers : peers.slice(0, visible);

  return (
    <div>
      <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {shown.map((peer) => (
          <li key={peer.slug} className="flex items-start gap-3">
            <ScoreBadge score={peer.score} size="md" />
            <div className="min-w-0">
              <Link
                href={`/college/${peer.slug}`}
                className="font-display text-lg font-semibold leading-snug text-brand hover:underline"
              >
                {peer.name}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-soft">
                <span>{peer.ownership}</span>
                <span aria-hidden>&bull;</span>
                <span className="">{peer.city}, {peer.state}</span>
                <span aria-hidden>&bull;</span>
                <Stars score={peer.score} className="h-3.5 w-3.5" />
                <span>{plural(peer.reviewCount, "review")}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
      {peers.length > visible && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="mt-6 inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-brand hover:underline"
        >
          {expanded ? "− Less" : "+ More"}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Q&A
 * ------------------------------------------------------------------ */

/**
 * Question rows that open in place. One open at a time, first open on arrival
 * so the card shows an answer before anyone clicks.
 */
export function FaqAccordion({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <ul className="border-t border-line">
      {faqs.map((faq, i) => {
        const isOpen = open === i;
        const panelId = `faq-panel-${i}`;
        return (
          <li key={faq.question} className="border-b border-line">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-center justify-between gap-4 px-1 py-5 text-left sm:px-4"
            >
              <span className="text-base font-semibold text-ink sm:text-lg">{faq.question}</span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-ink transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="px-1 pb-6 text-base leading-relaxed text-ink-soft sm:px-4">
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ *
   Reviews
 * ------------------------------------------------------------------ */

export type ReviewSnippetItem = {
  /** Present on a review stored in the database; without it there is nothing to like. */
  id?: string;
  author: string;
  course: string;
  batch: string;
  verified: boolean;
  date: string;
  rating: number;
  body: string;
};

/**
 * One review on a tinted panel. `clamp` fades the body after three lines with
 * a "Read more" that opens it in place — the overview shows the voice, not the
 * whole essay.
 */
/** What the votes on a college's reviews are, fetched once for all of them and shared by every card. */
const votesCache = new Map<string, Promise<Record<string, ReviewVoteState>>>();

function votesFor(slug: string, fresh = false) {
  if (fresh || !votesCache.has(slug)) votesCache.set(slug, loadReviewVotes(slug));
  return votesCache.get(slug)!;
}

/**
 * Like and dislike under a review, with the counts. Anyone can see the counts; to vote, a visitor has to sign in
 * or register first (the dialog opens, and the vote is counted once they are in). The same button again takes a
 * vote back, and the other one switches it.
 */
function ReviewVotes({ reviewId }: { reviewId?: string }) {
  const actions = useCollegeActions();
  const slug = actions?.slug;
  const [votes, setVotes] = useState<ReviewVoteState>({ likes: 0, dislikes: 0, mine: null });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!slug || !reviewId) return;
    let alive = true;
    const load = (fresh: boolean) => votesFor(slug, fresh).then((all) => alive && all[reviewId] && setVotes(all[reviewId]));
    void load(false);
    // Someone just signed in from a dialog on this page: their own choices are now known.
    const onSession = () => void load(true);
    window.addEventListener(SESSION_CHANGED_EVENT, onSession);
    return () => {
      alive = false;
      window.removeEventListener(SESSION_CHANGED_EVENT, onSession);
    };
  }, [slug, reviewId]);

  if (!reviewId || !actions) return null;

  const cast = (vote: "like" | "dislike") =>
    start(async () => {
      setError(null);
      const result = await voteReview(reviewId, vote);
      if (result.ok) {
        setVotes({ likes: result.likes, dislikes: result.dislikes, mine: result.mine });
        votesCache.delete(actions.slug);
      } else setError(result.message);
    });

  const choose = (vote: "like" | "dislike") => void actions.ensureSignedIn("Sign in to like or dislike this review. It takes a minute.", () => cast(vote));

  const button = (vote: "like" | "dislike", Icon: typeof ThumbsUp, count: number) => {
    const on = votes.mine === vote;
    return (
      <button
        type="button"
        onClick={() => choose(vote)}
        disabled={pending}
        aria-pressed={on}
        aria-label={`${vote === "like" ? "Like" : "Dislike"} this review (${count})`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition disabled:opacity-60 ${
          on ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand hover:text-brand"
        }`}
      >
        <Icon className={`h-4 w-4 ${on ? "fill-brand text-brand" : ""}`} />
        {vote === "like" ? "Like" : "Dislike"}
        {count > 0 ? ` (${count})` : ""}
      </button>
    );
  };

  return (
    <div className="mt-4 border-t border-line pt-4 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {button("like", ThumbsUp, votes.likes)}
        {button("dislike", ThumbsDown, votes.dislikes)}
        {error && <span role="alert" className="text-red-700">{error}</span>}
      </div>
    </div>
  );
}

export function ReviewSnippet({ review, clamp = false }: { review: ReviewSnippetItem; clamp?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const clamped = clamp && !expanded;

  return (
    <article className="rounded-2xl bg-bg-alt p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Stars score={review.rating} className="h-5 w-5" />
        <span className="font-display text-sm font-bold text-ink">
          {review.rating.toFixed(1)} / 5
        </span>
      </div>

      <div className="relative mt-5">
        <p
          className={`text-base leading-relaxed text-ink-soft ${clamped ? "line-clamp-3" : ""}`}
        >
          {review.body}
        </p>
        {clamped && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bg-alt to-transparent"
          />
        )}
      </div>
      {clamp && review.body.length > 180 && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-2 text-sm font-semibold text-brand hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
        <span className="font-semibold text-ink">{review.author}</span>
        {review.verified && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <BadgeCheck className="h-4 w-4" />
            Verified
          </span>
        )}
        <span aria-hidden>&middot;</span>
        <span>
          {review.course}, batch {review.batch}
        </span>
        <span aria-hidden>&middot;</span>
        <span>{review.date}</span>
      </p>

      <ReviewVotes reviewId={review.id} />
    </article>
  );
}

/* ------------------------------------------------------------------ *
   Empty state
 * ------------------------------------------------------------------ */

/**
 * What a tab shows when the college has not published anything for it yet.
 *
 * The rail is fixed — every college has every tab — so an empty section is a
 * normal state rather than a 404. It says so plainly and offers the one useful
 * next step: ask a counsellor, who can answer from the college directly.
 */
export function EmptyCard({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const Icon = ICONS[icon];
  return (
    <DetailCard>
      <div className="flex flex-col items-center py-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon className="h-8 w-8" />
        </span>
        <h3 className="mt-5 font-display text-xl font-bold text-ink">{title}</h3>
        <p className="mt-2 max-w-md text-base leading-relaxed text-ink-soft">{body}</p>
        <ActionButton
          kind="counsellor"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          Ask a counsellor
          <ArrowRight className="h-4 w-4" />
        </ActionButton>
      </div>
    </DetailCard>
  );
}
