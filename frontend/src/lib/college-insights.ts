/**
 * Figures derived from a college record, for the detail page's visual cards.
 *
 * The detail page draws most of its content as bars, dials and badges rather
 * than as sentences — and a bar needs a number where the record holds a string
 * ("₹18.4L Total Fees", "₹14.2 LPA"). Every conversion lives here, so the
 * page components stay about layout and a format change in the data is fixed
 * in one place.
 *
 * Nothing in this module invents a figure. Each value is read from the record
 * or computed from values that are; the Q&A answers are sentences assembled
 * from those same fields.
 */

import type { College } from "@/lib/mock-data";
import { colleges } from "@/lib/mock-data";

/**
 * The first number in a money string, in lakh. "₹18.4L Total Fees" → 18.4,
 * "₹14.2 LPA" → 14.2. Null when there is no number to read, so a bar is simply
 * not drawn rather than drawn at zero.
 */
export function lakhValue(amount: string): number | null {
  const match = amount.match(/[\d.]+/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** "₹18.4L Total Fees" → "₹18.4L" — the figure without its caption. */
export function shortFee(fees: string): string {
  return fees.replace(/\s*total fees/i, "").trim();
}

/**
 * A 0-100 reading from a cutoff score, or null when it is not on that scale.
 * "Rank 2,480" and "185 marks" have no denominator, so they get no bar.
 */
export function percentOf(score: string): number | null {
  if (!/percentile|percent|%/i.test(score)) return null;
  const value = lakhValue(score);
  return value !== null && value >= 0 && value <= 100 ? value : null;
}

/**
 * The tone a 0-5 score is drawn in. Three steps rather than a gradient: the
 * badge is read at a glance, and three is the most a glance distinguishes.
 */
export type ScoreTone = "high" | "mid" | "low";
export function scoreTone(score: number): ScoreTone {
  if (score >= 4.3) return "high";
  if (score >= 3.8) return "mid";
  return "low";
}

/** "Bengaluru Institute of Management Studies" → "BIMS". No logos in the data. */
export function monogram(name: string): string {
  const skip = new Set(["of", "and", "the", "&", "for"]);
  const letters = name
    .split(/\s+/)
    .filter((word) => word && !skip.has(word.toLowerCase()))
    .map((word) => word[0].toUpperCase());
  return letters.slice(0, 4).join("");
}

/** Mean of the category scores — the overall the reviews page leads with. */
export function overallScore(college: College): number {
  const rows = college.ratingBreakdown;
  if (rows.length === 0) return college.rating;
  return rows.reduce((total, row) => total + row.score, 0) / rows.length;
}

/**
 * The college among its stream's peers, ordered by rank — the Rankings card.
 * Real ranks from the directory, not an extrapolated table.
 */
export function rankingTable(college: College, limit = 6) {
  const peers = colleges
    .filter((entry) => entry.stream === college.stream)
    .sort((a, b) => a.ranking.rank - b.ranking.rank);
  const position = peers.findIndex((entry) => entry.slug === college.slug);
  /* A window centred on this college, so it is always in the table. */
  const start = Math.max(0, Math.min(position - Math.floor(limit / 2), peers.length - limit));
  return {
    rows: peers.slice(start, start + limit),
    position: position + 1,
    of: peers.length,
  };
}

export type Faq = { question: string; answer: string };

/**
 * The Q&A for a college, answered from its own record.
 *
 * The questions are the ones a prospective student actually asks on a college
 * page; each answer is built from the fields that settle it, so it can never
 * disagree with the cards above it.
 */
export function faqsFor(college: College): Faq[] {
  const faqs: Faq[] = [];
  const courseNames = college.courses.map((course) => course.name);

  faqs.push({
    question: `What courses does ${college.name} offer, and what do they cost?`,
    answer: `${college.name} offers ${college.coursesOffered} programmes${
      courseNames.length ? `, including ${courseNames.join(", ")}` : ""
    }. Total fees range from ${college.feesRange} depending on the programme.`,
  });

  if (college.examsAccepted.length > 0) {
    faqs.push({
      question: `Which entrance exams are accepted for admission?`,
      answer: `Admission is based on ${college.examsAccepted.join(", ")} scores, followed by the institute's own selection process. Each programme lists the exams it accepts on the Courses & Fees page.`,
    });
  }

  faqs.push({
    question: `How are placements at ${college.name}?`,
    answer: `In ${college.placement.year}, the average package was ${college.placement.average}, the median ${college.placement.median} and the highest ${college.placement.highest}. Top recruiters include ${college.placement.topRecruiters
      .slice(0, 4)
      .join(", ")}.`,
  });

  if (college.cutoffs.length > 0) {
    const first = college.cutoffs[0];
    faqs.push({
      question: `What is the cut-off for ${college.name}?`,
      answer: `The most recent ${first.exam} cut-off for the ${first.category.toLowerCase()} category was ${first.score}. Cut-offs vary by exam and category — the Cut-Offs page lists all of them.`,
    });
  }

  faqs.push({
    question: `Is ${college.name} approved and ranked?`,
    answer: `Yes. It is a ${college.ownership.toLowerCase()} institution established in ${college.established}, approved by ${college.approvals.join(
      " and ",
    )}, and ranked #${college.ranking.rank} by ${college.ranking.authority}.`,
  });

  const best = [...college.ratingBreakdown].sort((a, b) => b.score - a.score)[0];
  if (best) {
    faqs.push({
      question: `What do students say about ${college.name}?`,
      answer: `Students rate it ${college.rating.toFixed(1)} out of 5 across ${college.reviewCount.toLocaleString(
        "en-IN",
      )} reviews. ${best.label} scores highest, at ${best.score.toFixed(1)}.`,
    });
  }

  return faqs;
}
