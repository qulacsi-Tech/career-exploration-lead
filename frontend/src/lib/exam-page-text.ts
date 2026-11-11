/**
 * The wording on an exam's page that the admin can change, with the usual wording for each. The admin's Page text
 * tab shows the usual wording as the placeholder, and the page uses whatever the admin typed, or the usual wording
 * when the box is empty. `{exam}` stands for the exam's short name ("CAT").
 *
 * The keys must match PAGE_TEXT_KEYS in backend/routers/admin.py.
 */

export type PageTextKey =
  | "tagline"
  | "aboutHeading"
  | "aboutKicker"
  | "glanceHeading"
  | "glanceKicker"
  | "warmupHeading"
  | "warmupKicker"
  | "eligibilityHeading"
  | "eligibilityKicker"
  | "patternHeading"
  | "patternKicker"
  | "syllabusHeading"
  | "syllabusKicker"
  | "practiceHeading"
  | "practiceKicker"
  | "guideTab"
  | "cutoffsHeading"
  | "cutoffsKicker"
  | "collegesHeading"
  | "collegesKicker"
  | "faqsHeading"
  | "faqsKicker"
  | "alertsButton"
  | "mockButton"
  | "keyDatesTitle"
  | "predictTitle"
  | "predictText"
  | "predictButton";

/** The groups the admin tab shows, in page order, with each box's label and usual wording. */
export const PAGE_TEXT_GROUPS: { title: string; fields: { key: PageTextKey; label: string; usual: string; long?: boolean }[] }[] = [
  {
    title: "Top of the page",
    fields: [
      { key: "tagline", label: "Line under the name", usual: "One paper, doors across the country." },
      { key: "alertsButton", label: "Alerts button", usual: "Get exam alerts" },
      { key: "mockButton", label: "Mock test button", usual: "Take a mock test" },
    ],
  },
  {
    title: "Overview tab",
    fields: [
      { key: "aboutHeading", label: "About heading", usual: "About {exam}" },
      { key: "aboutKicker", label: "About line", usual: "The quick version, before the deep dive." },
      { key: "glanceHeading", label: "At a glance heading", usual: "{exam} at a glance" },
      { key: "glanceKicker", label: "At a glance line", usual: "The numbers to remember." },
      { key: "warmupHeading", label: "Mock tests heading", usual: "Warm up for {exam}" },
      { key: "warmupKicker", label: "Mock tests line", usual: "The real interface, the real clock, none of the pressure." },
    ],
  },
  {
    title: "Eligibility tab",
    fields: [
      { key: "eligibilityHeading", label: "Heading", usual: "Can you sit {exam}?" },
      { key: "eligibilityKicker", label: "Line", usual: "Tick these boxes and you are good to go." },
    ],
  },
  {
    title: "Pattern & syllabus tab",
    fields: [
      { key: "patternHeading", label: "Pattern heading", usual: "{exam} exam pattern" },
      { key: "patternKicker", label: "Pattern line", usual: "Pace yourself." },
      { key: "syllabusHeading", label: "Syllabus heading", usual: "{exam} syllabus" },
      { key: "syllabusKicker", label: "Syllabus line", usual: "Everything that can show up on the day." },
    ],
  },
  {
    title: "Mock tests and Guide tabs",
    fields: [
      { key: "practiceHeading", label: "Mock tests heading", usual: "Practise for {exam}" },
      { key: "practiceKicker", label: "Mock tests line", usual: "Mock papers in the real exam interface, with solutions and analysis." },
      { key: "guideTab", label: "Guide tab name", usual: "Guide" },
    ],
  },
  {
    title: "Cut-offs, Colleges and FAQs tabs",
    fields: [
      { key: "cutoffsHeading", label: "Cut-offs heading", usual: "{exam} cut-offs by college" },
      { key: "cutoffsKicker", label: "Cut-offs line", usual: "The scores that opened doors last time." },
      { key: "collegesHeading", label: "Colleges heading", usual: "Colleges accepting {exam}" },
      { key: "collegesKicker", label: "Colleges line", usual: "Where a good score can take you." },
      { key: "faqsHeading", label: "FAQs heading", usual: "{exam} FAQs" },
      { key: "faqsKicker", label: "FAQs line", usual: "The questions everyone asks, answered." },
    ],
  },
  {
    title: "Right-hand column",
    fields: [
      { key: "keyDatesTitle", label: "Key dates title", usual: "Key dates" },
      { key: "predictTitle", label: "Predictor title", usual: "Predict your college" },
      { key: "predictText", label: "Predictor text", usual: "Tell us your expected {exam} score and we will shortlist colleges you can target.", long: true },
      { key: "predictButton", label: "Predictor button", usual: "Get a shortlist" },
    ],
  },
];

const USUAL: Record<string, string> = Object.fromEntries(PAGE_TEXT_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.usual])));

/** A reader for one exam's page: `text("aboutHeading")` gives the admin's words or the usual ones, with {exam} filled in. */
export function pageTextReader(saved: Partial<Record<string, string>> | undefined, shortName: string) {
  return (key: PageTextKey, usual?: string): string => {
    const own = saved?.[key]?.trim();
    return (own || usual || USUAL[key] || "").replaceAll("{exam}", shortName);
  };
}
