import type { College } from "@/lib/api";

/**
 * The words around the college listing, worked out from what is on the page
 * rather than written once: the heading follows the active filters, the FAQs
 * are answered from the colleges actually listed, and the badges are earned
 * from each college's own figures.
 */

const LEVEL_WORD: Record<string, string> = { UG: "Undergraduate", PG: "Postgraduate", Doctorate: "Doctoral" };

export type ListingFilters = {
  q?: string;
  stream?: string;
  city?: string;
  course?: string;
  specialisation?: string;
  level?: string;
  credential?: string;
  mode?: string;
  ownership?: string;
  exam?: string;
  approval?: string;
  ranking_max?: number;
  /** The name of the ranking list picked, e.g. "NIRF Management 2026". */
  ranking_list_name?: string;
  min_rating?: number;
};

/** "Private MBA Colleges in Pune", or "All Colleges" with nothing applied. */
export function listingTitle(f: ListingFilters): { title: string; filtered: boolean } {
  const subject =
    f.course && f.specialisation
      ? `${f.course} ${f.specialisation}`
      : (f.specialisation ?? f.course ?? (f.level ? LEVEL_WORD[f.level] : f.stream));

  const parts = [
    f.ranking_list_name,
    f.ranking_max ? `NIRF Top ${f.ranking_max}` : undefined,
    f.ownership,
    f.mode,
    f.credential && f.credential !== "Degree" ? f.credential : undefined,
    subject,
  ].filter(Boolean);

  const tail = [
    f.city ? `in ${f.city}` : undefined,
    f.exam ? `Accepting ${f.exam}` : undefined,
    f.approval ? `Approved by ${f.approval}` : undefined,
  ].filter(Boolean);

  const filtered = parts.length > 0 || tail.length > 0 || !!f.q || !!f.min_rating;
  if (!filtered) return { title: "All Colleges", filtered: false };

  const base = f.q && parts.length === 0 ? `Colleges matching "${f.q}"` : `${parts.join(" ")} Colleges`.trim();
  return { title: [base.startsWith(" ") ? base.trim() : base, ...tail].join(" "), filtered: true };
}

/** Whether a college earns each listing badge. */
export function badgesFor(colleges: College[]) {
  const mostViewed = new Set(
    [...colleges]
      .filter((c) => (c.viewCount ?? 0) > 0)
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, 3)
      .map((c) => c.slug),
  );
  return (c: College) => ({
    featured: !!c.isFeatured,
    topRated: c.rating >= 4.5 && c.reviewCount > 0,
    mostViewed: mostViewed.has(c.slug),
  });
}

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const top = (values: string[], n: number) => {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
};

/** Questions answered from the colleges on the page. Empty when there are none. */
export function listingFaqs(title: string, colleges: College[], total: number) {
  if (colleges.length === 0) return [];
  const faqs: { question: string; answer: string }[] = [];
  const name = title === "All Colleges" ? "colleges" : title;

  const ranked = colleges.filter((c) => c.ranking.rank > 0).sort((a, b) => a.ranking.rank - b.ranking.rank);
  faqs.push({
    question: `How many ${name} are listed?`,
    answer:
      `${total.toLocaleString("en-IN")} ${total === 1 ? "college is" : "colleges are"} listed.` +
      (ranked[0] ? ` The highest ranked is ${ranked[0].name} (#${ranked[0].ranking.rank} ${ranked[0].ranking.authority}).` : ""),
  });

  const rated = colleges.filter((c) => c.reviewCount > 0).sort((a, b) => b.rating - a.rating).slice(0, 3);
  if (rated.length > 0) {
    faqs.push({
      question: `Which are the top-rated ${name}?`,
      answer: `Students rate ${list(rated.map((c) => `${c.name} (${c.rating.toFixed(1)}/5)`))} the highest.`,
    });
  }

  const withFees = colleges.filter((c) => c.feesRange).slice(0, 3);
  if (withFees.length > 0) {
    faqs.push({
      question: `What are the fees for ${name}?`,
      answer: `Total fees vary by college and course: ${list(withFees.map((c) => `${c.name} ${c.feesRange}`))}.`,
    });
  }

  const exams = top(colleges.flatMap((c) => c.examsAccepted), 4).map(([e]) => e);
  if (exams.length > 0) {
    faqs.push({
      question: `Which entrance exams do ${name} accept?`,
      answer: `The most common are ${list(exams)}. Each college lists the exams it accepts on its page.`,
    });
  }

  const cities = top(colleges.map((c) => c.city), 4);
  if (cities.length > 0) {
    faqs.push({
      question: `Where are these colleges located?`,
      answer: `Mostly in ${list(cities.map(([city, n]) => `${city} (${n})`))}.`,
    });
  }

  const ownership = top(colleges.map((c) => c.ownership), 3);
  if (ownership.length > 1) {
    faqs.push({
      question: `Are there private and government options?`,
      answer: `Yes: ${list(ownership.map(([o, n]) => `${n} ${o.toLowerCase()}`))} among the colleges shown.`,
    });
  }

  return faqs;
}

/** The short guide above the list, written from the colleges on the page. One paragraph, or two with the rest behind "Read More". */
export function listingIntro(title: string, colleges: College[], total: number): string[] {
  const name = title === "All Colleges" ? "colleges" : title;
  const count = total.toLocaleString("en-IN");
  const first = `Explore ${count} ${name}${title === "All Colleges" ? " listed on Top College Path" : ""}.`;
  if (colleges.length === 0) return [first];

  const ranked = colleges.filter((c) => c.ranking.rank > 0).sort((a, b) => a.ranking.rank - b.ranking.rank).slice(0, 3);
  const cities = top(colleges.map((c) => c.city).filter(Boolean), 3).map(([c]) => c);
  const exams = top(colleges.flatMap((c) => c.examsAccepted), 4).map(([e]) => e);
  const fees = colleges.find((c) => c.feesRange);

  const lead = [
    first,
    ranked.length > 0 ? `Top of the list: ${list(ranked.map((c) => `${c.name} (#${c.ranking.rank} ${c.ranking.authority})`))}.` : "",
    cities.length > 0 ? `Most are in ${list(cities)}.` : "",
  ].filter(Boolean).join(" ");

  const rest = [
    exams.length > 0 ? `Admissions are based on entrance exams such as ${list(exams)}, along with interviews and counselling at some institutes.` : "",
    fees ? `Total fees vary widely by college and course, for example ${fees.name} at ${fees.feesRange}.` : "",
    "Use the filters to narrow by location, course, fees, ownership, exam or rating, then compare colleges side by side or download a brochure.",
  ].filter(Boolean).join(" ");

  return [lead, rest];
}
