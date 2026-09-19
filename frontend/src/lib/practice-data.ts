/**
 * Mock tests: questions, stimuli and the papers built from them.
 *
 * Placeholder content for UI development only — replaced by real API data once
 * the backend has a question bank. See
 * `docs/2026-09-19-exam-practice-module-plan.md` for the model's reasoning.
 *
 * ## Format is not a question type
 *
 * `QuestionType` is the *answer mechanic* — how a response is given. Whether a
 * question is text, a figure, or both is carried by the rich-text document in
 * `stem` and in each option's `body`. The two are orthogonal: a geometry
 * question with a diagram can be single-select, multi-select or type-in, and so
 * can a purely textual one. Crossing them into one union doubles it every time
 * either axis grows, which is why `"image-based"` is deliberately not a type.
 *
 * ## Shared stimuli
 *
 * A CAT reading passage carries four to six questions; a DILR caselet the same.
 * Questions reference a `Stimulus` by id rather than embedding it, so a typo is
 * fixed once, and so the player can tell it is still showing the same passage
 * and leave the reader's scroll position alone between questions in a set.
 */

import { doc, para, figure, type RichTextDoc } from "@/lib/rich-text";

/* ------------------------------------------------------------------ *
   Types
 * ------------------------------------------------------------------ */

/** How a response is given. Not the format — see the note above. */
export type QuestionType = "mcq-single" | "mcq-multi" | "tita";

/** A passage, caselet or figure shared by a group of questions. */
export type Stimulus = {
  id: string;
  kind: "passage" | "caselet" | "figure";
  /** Shown above the pane so a candidate knows what they are looking at. */
  label: string;
  body: RichTextDoc;
};

export type QuestionOption = {
  id: string;
  /** A document, so an option can be text, a figure, or both. */
  body: RichTextDoc;
};

/**
 * The correct response.
 *
 * MCQs carry option ids — an array because a multi-select question has several.
 * TITA carries a number plus the tolerance it is marked within, since an answer
 * of 12.5 should accept 12.50 and, where the question says so, 12.4 to 12.6.
 */
export type CorrectAnswer =
  | { kind: "options"; optionIds: string[] }
  | { kind: "value"; value: number; tolerance: number };

export type Question = {
  id: string;
  examSlug: string;
  sectionId: string;
  /** Set when this question belongs to a shared-stimulus group. */
  stimulusId?: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  type: QuestionType;
  stem: RichTextDoc;
  /** Absent for TITA. */
  options?: QuestionOption[];
  correct: CorrectAnswer;
  solution: RichTextDoc;
  marks: number;
  /** Positive number, subtracted when wrong. 0 where the exam has no penalty. */
  negativeMarks: number;
  /** What a prepared candidate should need. Drives the time analysis. */
  expectedSeconds: number;
};

export type TestSection = {
  id: string;
  label: string;
  questionIds: string[];
  /**
   * Set only where the section is separately timed. With `sectionLock` on, this
   * is how long the candidate is held in it.
   */
  durationMinutes?: number;
};

export type MockTest = {
  slug: string;
  examSlug: string;
  title: string;
  kind: "full-mock" | "sectional" | "previous-year" | "sample";
  /** One line on the card and the instructions screen. */
  summary: string;
  totalMinutes: number;
  sections: TestSection[];
  /**
   * CAT holds a candidate in each section for its full duration and will not
   * let them return; NMAT lets them choose the order. A simulator that gets
   * this wrong is worthless to a candidate who knows the real paper.
   */
  sectionLock: boolean;
  /**
   * Languages this paper is authored in.
   *
   * A real field rather than a decorative dropdown. Nothing in the question
   * model carries translations yet, so every seeded paper is English-only and
   * the selector renders disabled with the reason shown. When a second language
   * is authored, `Question.stem` and the option bodies gain a per-language
   * variant and this list is what the selector reads.
   */
  languages: string[];
  /** null means unlimited retakes. */
  attemptsAllowed: number | null;
  /** Sample sets are the free ones — playable without an account. */
  isFree: boolean;
  isPublished: boolean;
};

/* ------------------------------------------------------------------ *
   Stimuli
 * ------------------------------------------------------------------ */

export const stimuli: Stimulus[] = [
  {
    id: "cat-rc-1",
    kind: "passage",
    label: "Passage 1",
    body: doc(
      para(
        "The distinction between a craft and a profession is usually drawn at the point where a body of knowledge becomes formal enough to be taught rather than absorbed. A craftsman learns by proximity — by watching someone competent and repeating what they did until the hands know it. A professional learns by instruction, from material that has been abstracted away from any particular workshop and written down.",
      ),
      para(
        "This abstraction is what makes a profession portable. A surgeon trained in one hospital can operate in another; a joiner trained in one workshop may find that the next one does everything differently. But portability is bought at a price that is rarely counted. What is written down is what can be written down, and a great deal of what makes a craftsman good resists the page entirely — the judgement of when a rule does not apply, the recognition that a job has gone wrong before anything visibly has.",
      ),
      para(
        "Where a field professionalises quickly, this tacit remainder tends to be dismissed rather than preserved, because the people doing the formalising are the ones who have already decided that what matters can be formalised. The result is a discipline that is confident, teachable, and quietly poorer than the craft it replaced. Whether that trade is worth making depends almost entirely on how much of the original craft was tacit — a question that, by construction, the formalisers are the least equipped to answer.",
      ),
    ),
  },
  {
    id: "cat-dilr-1",
    kind: "caselet",
    label: "Caselet: regional airline routes",
    body: doc(
      para(
        "A regional airline operates between five cities — Ahmedabad, Bhopal, Cochin, Durgapur and Erode. The bar chart below shows the number of passengers (in thousands) carried on each route during the last quarter.",
      ),
      figure({
        src: "/images/practice/dilr-route-passengers.svg",
        alt: "Bar chart of quarterly passengers in thousands on six airline routes, with values labelled above each bar.",
        width: 640,
        height: 380,
      }),
      para(
        "No route was operated in both directions by the same aircraft, and every route listed was operated on every day of the quarter.",
      ),
    ),
  },
];

/* ------------------------------------------------------------------ *
   Questions

   Seeded to cover every format the player has to render, because a format
   nobody seeded is a format nobody discovers is broken:

     text-only MCQ, MCQ with a figure, four image options and no text,
     TITA, a passage set, a caselet set, and a solution carrying a diagram.
 * ------------------------------------------------------------------ */

/** Shorthand for the common case: four text options, ids a-d. */
const textOptions = (...bodies: string[]): QuestionOption[] =>
  bodies.map((body, i) => ({ id: "abcd"[i], body: doc(para(body)) }));

const pick = (...optionIds: string[]): CorrectAnswer => ({ kind: "options", optionIds });
const value = (v: number, tolerance = 0): CorrectAnswer => ({ kind: "value", value: v, tolerance });

export const questions: Question[] = [
  /* --- CAT · VARC · passage set (shared stimulus) --------------------- */
  {
    id: "cat-varc-1",
    examSlug: "cat",
    sectionId: "varc",
    stimulusId: "cat-rc-1",
    topic: "Reading Comprehension",
    difficulty: "medium",
    type: "mcq-single",
    stem: doc(para("Which of the following best captures the central argument of the passage?")),
    options: textOptions(
      "Professions are superior to crafts because their knowledge can be taught systematically.",
      "Formalising a craft makes its knowledge portable but discards the part of it that resists being written down.",
      "Craftsmen are better practitioners than professionals because they learn by watching rather than by instruction.",
      "The distinction between crafts and professions is arbitrary and reflects social status rather than knowledge.",
    ),
    correct: pick("b"),
    solution: doc(
      para(
        "The passage grants professionalisation a real benefit — portability — and then argues it is bought at an uncounted cost, the tacit knowledge that cannot be written down. (B) carries both halves.",
      ),
      para(
        "(A) and (C) each take only one side and turn it into a ranking the passage never makes. (D) contradicts the passage, which treats the distinction as substantive and locates it precisely.",
      ),
    ),
    marks: 3,
    negativeMarks: 1,
    expectedSeconds: 90,
  },
  {
    id: "cat-varc-2",
    examSlug: "cat",
    sectionId: "varc",
    stimulusId: "cat-rc-1",
    topic: "Reading Comprehension",
    difficulty: "hard",
    type: "mcq-single",
    stem: doc(
      para(
        "The author's remark that the formalisers are 'the least equipped to answer' the closing question is best explained by which of the following?",
      ),
    ),
    options: textOptions(
      "They lack the technical training needed to evaluate a craft objectively.",
      "They have a financial interest in the outcome of the comparison.",
      "Their premise — that what matters can be written down — is precisely what the question asks them to assess.",
      "They were never practitioners of the craft they formalised.",
    ),
    correct: pick("c"),
    solution: doc(
      para(
        "The word doing the work is 'by construction'. The formalisers were defined earlier as those who have already decided that what matters can be formalised. Asking them how much was tacit asks them to weigh evidence their starting assumption rules out — a circularity, not a shortage of skill, money or experience.",
      ),
    ),
    marks: 3,
    negativeMarks: 1,
    expectedSeconds: 110,
  },
  {
    id: "cat-varc-3",
    examSlug: "cat",
    sectionId: "varc",
    stimulusId: "cat-rc-1",
    topic: "Reading Comprehension",
    difficulty: "medium",
    type: "mcq-single",
    stem: doc(para("According to the passage, what makes a profession portable?")),
    options: textOptions(
      "Formal certification recognised across institutions.",
      "Knowledge abstracted away from any particular workshop and written down.",
      "The prestige that attaches to professional titles.",
      "Longer and more rigorous periods of training.",
    ),
    correct: pick("b"),
    solution: doc(
      para(
        "Stated directly in the second paragraph: abstraction from any particular workshop is what allows a surgeon trained in one hospital to operate in another. Certification, prestige and training length are never mentioned.",
      ),
    ),
    marks: 3,
    negativeMarks: 1,
    expectedSeconds: 70,
  },

  /* --- CAT · DILR · caselet set (shared stimulus, one TITA) ----------- */
  {
    id: "cat-dilr-1",
    examSlug: "cat",
    sectionId: "dilr",
    stimulusId: "cat-dilr-1",
    topic: "Data Interpretation",
    difficulty: "easy",
    type: "mcq-single",
    stem: doc(para("Which route carried the greatest number of passengers during the quarter?")),
    options: textOptions(
      "Ahmedabad – Bhopal",
      "Bhopal – Cochin",
      "Cochin – Durgapur",
      "Durgapur – Erode",
    ),
    correct: pick("c"),
    solution: doc(
      para(
        "Cochin – Durgapur is the tallest bar at 62 thousand, ahead of Ahmedabad – Bhopal at 54 thousand.",
      ),
    ),
    marks: 3,
    negativeMarks: 1,
    expectedSeconds: 45,
  },
  {
    id: "cat-dilr-2",
    examSlug: "cat",
    sectionId: "dilr",
    stimulusId: "cat-dilr-1",
    topic: "Data Interpretation",
    difficulty: "medium",
    type: "tita",
    stem: doc(
      para(
        "What was the total number of passengers, in thousands, carried on all six routes during the quarter?",
      ),
    ),
    correct: value(248),
    solution: doc(
      para("Reading the six bars: 54 + 38 + 62 + 29 + 41 + 24 = 248 thousand."),
      para(
        "A TITA question carries no negative marking, so there is no reason to leave an arithmetic question like this blank once the chart has been read.",
      ),
    ),
    marks: 3,
    negativeMarks: 0,
    expectedSeconds: 75,
  },

  /* --- CAT · QA · standalone, one with a figure ---------------------- */
  {
    id: "cat-qa-1",
    examSlug: "cat",
    sectionId: "qa",
    topic: "Arithmetic",
    difficulty: "easy",
    type: "mcq-single",
    stem: doc(
      para(
        "A shopkeeper marks an item 40% above cost and then offers a discount of 25% on the marked price. What is the profit percentage?",
      ),
    ),
    options: textOptions("5%", "10%", "15%", "20%"),
    correct: pick("a"),
    solution: doc(
      para(
        "Take the cost as 100. Marked price is 140; a 25% discount gives a selling price of 140 × 0.75 = 105. Profit is 5 on 100, so 5%.",
      ),
    ),
    marks: 3,
    negativeMarks: 1,
    expectedSeconds: 60,
  },
  {
    id: "cat-qa-2",
    examSlug: "cat",
    sectionId: "qa",
    topic: "Geometry",
    difficulty: "hard",
    type: "mcq-single",
    stem: doc(
      para(
        "In triangle ABC below, AD is drawn to BC such that BD : DC = 2 : 3. If the area of triangle ABD is 24 square units, what is the area of triangle ABC?",
      ),
      figure({
        src: "/images/practice/geometry-cevian.svg",
        alt: "Triangle ABC with vertex A at the top and base BC horizontal. A line segment AD is drawn from A to a point D on BC, dividing the base into segments BD and DC.",
        width: 520,
        height: 360,
      }),
    ),
    options: textOptions("40 square units", "50 square units", "60 square units", "72 square units"),
    correct: pick("c"),
    solution: doc(
      para(
        "Triangles ABD and ADC share the apex A and therefore the same height above BC. Two triangles of equal height have areas in the ratio of their bases, so [ABD] : [ADC] = BD : DC = 2 : 3.",
      ),
      para(
        "With [ABD] = 24, one part is 12, so [ADC] = 36 and [ABC] = 24 + 36 = 60 square units.",
      ),
      figure({
        src: "/images/practice/geometry-cevian-solution.svg",
        alt: "The same triangle with the shared perpendicular height from A to BC marked, and the two sub-triangles shaded to show their 2 to 3 area ratio.",
        width: 520,
        height: 360,
      }),
    ),
    marks: 3,
    negativeMarks: 1,
    expectedSeconds: 120,
  },
  {
    id: "cat-qa-3",
    examSlug: "cat",
    sectionId: "qa",
    topic: "Algebra",
    difficulty: "medium",
    type: "tita",
    stem: doc(
      para(
        "If x + 2y = 14 and 3x − y = 7, what is the value of x + y?",
      ),
    ),
    correct: value(9),
    solution: doc(
      para(
        "From the second equation, y = 3x − 7. Substituting into the first: x + 2(3x − 7) = 14, so 7x = 28 and x = 4. Then y = 5, and x + y = 9.",
      ),
    ),
    marks: 3,
    negativeMarks: 0,
    expectedSeconds: 90,
  },
  {
    id: "cat-qa-4",
    examSlug: "cat",
    sectionId: "qa",
    topic: "Number Systems",
    difficulty: "medium",
    type: "mcq-multi",
    stem: doc(
      para(
        "Which of the following statements are true for every prime number p greater than 3? Select all that apply.",
      ),
    ),
    options: textOptions(
      "p is odd.",
      "p² − 1 is divisible by 24.",
      "p + 1 is divisible by 6.",
      "p is of the form 6k ± 1 for some integer k.",
    ),
    correct: pick("a", "b", "d"),
    solution: doc(
      para(
        "(A) holds because any even number above 2 has a factor of 2. (D) holds because a prime above 3 cannot be 6k, 6k ± 2 (even) or 6k + 3 (divisible by 3). (B) follows from (D): p² − 1 = (p − 1)(p + 1), a product of two consecutive even numbers around a multiple of 6, which is always divisible by 24.",
      ),
      para(
        "(C) fails at p = 5, where p + 1 = 6 works, but at p = 7, p + 1 = 8 is not divisible by 6.",
      ),
    ),
    marks: 3,
    negativeMarks: 1,
    expectedSeconds: 140,
  },

  /* --- MAH CET · Abstract Reasoning · image options, no text ---------- */
  {
    id: "mahcet-ar-1",
    examSlug: "mah-cet",
    sectionId: "abstract-reasoning",
    topic: "Abstract Reasoning",
    difficulty: "medium",
    type: "mcq-single",
    stem: doc(
      para("Study the sequence below. Which figure comes next?"),
      figure({
        src: "/images/practice/ar-sequence-1.svg",
        alt: "A sequence of three figures. Each shows a square containing a small filled circle, and from figure to figure the circle moves one corner clockwise.",
        width: 640,
        height: 180,
      }),
    ),
    options: [
      {
        id: "a",
        body: doc(
          figure({
            src: "/images/practice/ar-option-1a.svg",
            alt: "A square with a filled circle in the top-left corner.",
            width: 160,
            height: 160,
          }),
        ),
      },
      {
        id: "b",
        body: doc(
          figure({
            src: "/images/practice/ar-option-1b.svg",
            alt: "A square with a filled circle in the bottom-left corner.",
            width: 160,
            height: 160,
          }),
        ),
      },
      {
        id: "c",
        body: doc(
          figure({
            src: "/images/practice/ar-option-1c.svg",
            alt: "A square with a filled circle in the bottom-right corner.",
            width: 160,
            height: 160,
          }),
        ),
      },
      {
        id: "d",
        body: doc(
          figure({
            src: "/images/practice/ar-option-1d.svg",
            alt: "A square with a filled circle in the centre.",
            width: 160,
            height: 160,
          }),
        ),
      },
    ],
    correct: pick("b"),
    solution: doc(
      para(
        "The circle advances one corner clockwise in each step: top-left, top-right, bottom-right. The next position is bottom-left, which is option (B).",
      ),
    ),
    marks: 2,
    negativeMarks: 0.5,
    expectedSeconds: 50,
  },
  {
    id: "mahcet-ar-2",
    examSlug: "mah-cet",
    sectionId: "abstract-reasoning",
    topic: "Abstract Reasoning",
    difficulty: "easy",
    type: "mcq-single",
    stem: doc(
      para("Which figure does not belong with the others?"),
      figure({
        src: "/images/practice/ar-odd-one-out.svg",
        alt: "Four labelled figures side by side. Three are regular polygons with an even number of sides; one is a five-sided polygon.",
        width: 640,
        height: 180,
      }),
    ),
    options: textOptions("Figure 1", "Figure 2", "Figure 3", "Figure 4"),
    correct: pick("c"),
    solution: doc(
      para(
        "Figures 1, 2 and 4 are regular polygons with an even number of sides — a square, a hexagon and an octagon. Figure 3 is a regular pentagon, the only one with an odd number of sides.",
      ),
    ),
    marks: 2,
    negativeMarks: 0.5,
    expectedSeconds: 40,
  },

  /* --- NMAT · Quantitative Skills ------------------------------------ */
  {
    id: "nmat-qs-1",
    examSlug: "nmat",
    sectionId: "quantitative-skills",
    topic: "Arithmetic",
    difficulty: "easy",
    type: "mcq-single",
    stem: doc(
      para(
        "A train travelling at 60 km/h covers a certain distance in 3 hours. At what speed must it travel to cover the same distance in 2 hours?",
      ),
    ),
    options: textOptions("75 km/h", "80 km/h", "90 km/h", "120 km/h"),
    correct: pick("c"),
    solution: doc(
      para(
        "The distance is 60 × 3 = 180 km. Covering 180 km in 2 hours needs 90 km/h.",
      ),
      para("NMAT carries no negative marking, so there is never a reason to leave a question blank."),
    ),
    marks: 1,
    negativeMarks: 0,
    expectedSeconds: 55,
  },
  {
    id: "nmat-qs-2",
    examSlug: "nmat",
    sectionId: "quantitative-skills",
    topic: "Percentages",
    difficulty: "medium",
    type: "mcq-single",
    stem: doc(
      para(
        "The price of a commodity rose by 20% and then fell by 20%. What is the net change from the original price?",
      ),
    ),
    options: textOptions(
      "No change",
      "A 4% decrease",
      "A 4% increase",
      "A 2% decrease",
    ),
    correct: pick("b"),
    solution: doc(
      para(
        "Take the price as 100. After a 20% rise it is 120; a 20% fall on 120 removes 24, leaving 96. That is a 4% decrease — the second percentage acts on a larger base than the first, which is why successive equal rises and falls never cancel.",
      ),
    ),
    marks: 1,
    negativeMarks: 0,
    expectedSeconds: 60,
  },
  {
    id: "nmat-ls-1",
    examSlug: "nmat",
    sectionId: "language-skills",
    topic: "Vocabulary",
    difficulty: "medium",
    type: "mcq-single",
    stem: doc(
      para(
        "Choose the word most nearly opposite in meaning to CANDID as it is used in: 'She gave a candid assessment of the proposal.'",
      ),
    ),
    options: textOptions("Guarded", "Hostile", "Detailed", "Hasty"),
    correct: pick("a"),
    solution: doc(
      para(
        "Candid here means frank and unreserved, so its opposite is guarded — withholding rather than volunteering. 'Hostile' opposes warmth rather than openness; 'detailed' and 'hasty' address length and speed, neither of which is what candid means.",
      ),
    ),
    marks: 1,
    negativeMarks: 0,
    expectedSeconds: 45,
  },
  {
    id: "nmat-lr-1",
    examSlug: "nmat",
    sectionId: "logical-reasoning",
    topic: "Deductions",
    difficulty: "medium",
    type: "mcq-single",
    stem: doc(
      para(
        "All accountants in the firm are members of the institute. Some members of the institute are not partners. Which conclusion necessarily follows?",
      ),
    ),
    options: textOptions(
      "Some accountants in the firm are not partners.",
      "No accountant in the firm is a partner.",
      "All partners are members of the institute.",
      "None of the above necessarily follows.",
    ),
    correct: pick("d"),
    solution: doc(
      para(
        "The members who are not partners need not be accountants — they could be any other members. So (A) does not follow. (B) overstates it further, and (C) reverses a relationship the premises never state. Nothing necessarily follows.",
      ),
    ),
    marks: 1,
    negativeMarks: 0,
    expectedSeconds: 80,
  },
];

/* ------------------------------------------------------------------ *
   Tests

   Deliberately short and honestly labelled. A "full-length CAT mock" with
   twelve questions would misrepresent itself on the card, in the instructions
   and in the palette; these are sectionals, mini mocks and drills, which is
   what they actually are. Full-length papers arrive with real content
   authoring — a sourcing commitment, not a build one.
 * ------------------------------------------------------------------ */

export const mockTests: MockTest[] = [
  {
    slug: "cat-mini-mock-1",
    examSlug: "cat",
    title: "CAT Mini Mock 1",
    kind: "full-mock",
    summary:
      "All three CAT sections in miniature, with the section lock the real paper uses. The closest thing here to exam-day conditions.",
    totalMinutes: 30,
    sectionLock: true,
    sections: [
      {
        id: "varc",
        label: "VARC",
        questionIds: ["cat-varc-1", "cat-varc-2", "cat-varc-3"],
        durationMinutes: 10,
      },
      {
        id: "dilr",
        label: "DILR",
        questionIds: ["cat-dilr-1", "cat-dilr-2"],
        durationMinutes: 8,
      },
      {
        id: "qa",
        label: "QA",
        questionIds: ["cat-qa-1", "cat-qa-2", "cat-qa-3", "cat-qa-4"],
        durationMinutes: 12,
      },
    ],
    languages: ["English"],
    attemptsAllowed: null,
    isFree: false,
    isPublished: true,
  },
  {
    slug: "cat-qa-sectional-1",
    examSlug: "cat",
    title: "CAT Quantitative Aptitude — Sectional 1",
    kind: "sectional",
    summary:
      "Arithmetic, geometry, algebra and number systems, including one type-in-the-answer question. No section lock.",
    totalMinutes: 15,
    sectionLock: false,
    sections: [
      {
        id: "qa",
        label: "QA",
        questionIds: ["cat-qa-1", "cat-qa-2", "cat-qa-3", "cat-qa-4"],
      },
    ],
    languages: ["English"],
    attemptsAllowed: null,
    isFree: false,
    isPublished: true,
  },
  {
    slug: "cat-sample-set",
    examSlug: "cat",
    title: "CAT — Free Sample Set",
    kind: "sample",
    summary: "Three questions, untimed, no account needed. A look at the test player before you sign up.",
    totalMinutes: 0,
    sectionLock: false,
    sections: [
      { id: "mixed", label: "Mixed", questionIds: ["cat-qa-1", "cat-varc-3", "cat-dilr-1"] },
    ],
    languages: ["English"],
    attemptsAllowed: null,
    isFree: true,
    isPublished: true,
  },
  {
    slug: "nmat-mini-mock-1",
    examSlug: "nmat",
    title: "NMAT Mini Mock 1",
    kind: "full-mock",
    summary:
      "All three NMAT sections with no negative marking and no section lock — move between sections freely, as the real test allows.",
    totalMinutes: 20,
    sectionLock: false,
    sections: [
      { id: "language-skills", label: "Language Skills", questionIds: ["nmat-ls-1"] },
      {
        id: "quantitative-skills",
        label: "Quantitative Skills",
        questionIds: ["nmat-qs-1", "nmat-qs-2"],
      },
      { id: "logical-reasoning", label: "Logical Reasoning", questionIds: ["nmat-lr-1"] },
    ],
    languages: ["English"],
    attemptsAllowed: null,
    isFree: false,
    isPublished: true,
  },
  {
    slug: "mah-cet-abstract-reasoning-drill",
    examSlug: "mah-cet",
    title: "MAH CET Abstract Reasoning — Drill 1",
    kind: "sectional",
    summary: "Figure sequences and odd-one-out, with answer options that are diagrams rather than text.",
    totalMinutes: 8,
    sectionLock: false,
    sections: [
      {
        id: "abstract-reasoning",
        label: "Abstract Reasoning",
        questionIds: ["mahcet-ar-1", "mahcet-ar-2"],
      },
    ],
    languages: ["English"],
    attemptsAllowed: null,
    isFree: true,
    isPublished: true,
  },
];

/* ------------------------------------------------------------------ *
   Lookups
 * ------------------------------------------------------------------ */

const questionIndex = new Map(questions.map((q) => [q.id, q]));
const stimulusIndex = new Map(stimuli.map((s) => [s.id, s]));

export function questionById(id: string): Question | undefined {
  return questionIndex.get(id);
}

export function stimulusById(id: string | undefined): Stimulus | undefined {
  return id ? stimulusIndex.get(id) : undefined;
}

export function testBySlug(slug: string): MockTest | undefined {
  return mockTests.find((test) => test.slug === slug);
}

/** Published tests for one exam, free sample sets first. */
export function testsForExam(examSlug: string): MockTest[] {
  return mockTests
    .filter((test) => test.examSlug === examSlug && test.isPublished)
    .sort((a, b) => Number(b.isFree) - Number(a.isFree));
}

export function publishedTests(): MockTest[] {
  return mockTests.filter((test) => test.isPublished);
}

/**
 * Every question in a test, in paper order.
 *
 * Ids that resolve to nothing are dropped rather than throwing. A single bad
 * reference should cost one question, not the whole paper — and the mismatch is
 * visible in the count rather than as a blank screen.
 */
export function questionsForTest(test: MockTest): Question[] {
  return test.sections
    .flatMap((section) => section.questionIds)
    .map((id) => questionIndex.get(id))
    .filter((q): q is Question => Boolean(q));
}

export function questionCount(test: MockTest): number {
  return test.sections.reduce((total, section) => total + section.questionIds.length, 0);
}

/** Highest achievable score, for the results screen's denominator. */
export function maxScore(test: MockTest): number {
  return questionsForTest(test).reduce((total, q) => total + q.marks, 0);
}

/**
 * The marking scheme in one line, for the card and the instructions.
 *
 * Reads the questions rather than restating a scheme on the test, because the
 * two drift: CAT gives 3 marks with −1 on MCQs and no penalty on TITA, and a
 * single sentence stored on the test would have to be rewritten by hand every
 * time a question is swapped in.
 */
export function markingSummary(test: MockTest): string {
  const qs = questionsForTest(test);
  if (qs.length === 0) return "No questions";

  const marks = [...new Set(qs.map((q) => q.marks))];
  const penalties = [...new Set(qs.map((q) => q.negativeMarks))].filter((p) => p > 0);

  const positive = marks.length === 1 ? `+${marks[0]}` : `+${Math.min(...marks)} to +${Math.max(...marks)}`;
  if (penalties.length === 0) return `${positive} per correct answer · no negative marking`;

  const negative = penalties.length === 1 ? `−${penalties[0]}` : `−${Math.min(...penalties)} to −${Math.max(...penalties)}`;
  return `${positive} per correct answer · ${negative} per wrong answer`;
}
