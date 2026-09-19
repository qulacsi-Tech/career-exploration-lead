# Exam Practice Module — implementation plan

> **Internal document.** Carries day estimates and commercial notes.
> Sibling of [2026-09-19-client-mom-implementation-plan.md](2026-09-19-client-mom-implementation-plan.md)
> (roles, College Admin & approvals), which it depends on — see §9.

**Planned:** 19 September 2026
**Subject:** Mock tests and exam practice for the entrance-exam module
**Scope:** **UI only.** No backend, no API, no persistence this cycle.
**Status:** Four structural questions settled up front (§3); six open with the client (§10).

---

## 1. Why this module

The exam surface today is a reference section. `Exam` carries a conducting body,
dates, a fee, `sections: string[]` and `durationMinutes`; `/exams/[slug]` renders
About, Pattern, Cutoffs and Colleges accepting the score. A candidate reads it once
and leaves.

Practice changes what the exam pages are for. A candidate preparing for CAT returns
weekly, and each return is an opportunity to put colleges in front of someone who has
just been reminded what score they are on track for. **That connection is the point
of the module** — a practice section that does not route candidates back into college
discovery is a cost centre with good engagement metrics.

So the results screen carries a "colleges accepting this score" band, and it is not
decoration. It is the reason the module earns its budget.

---

## 2. What exists to build on

| Asset | How it is used here |
|---|---|
| `Exam.sections` and `durationMinutes` on the exam record | Test sections derive their labels from the exam record rather than restating them, so a pattern change in one place cannot leave the mocks describing an exam that no longer exists. |
| `lib/rich-text.ts` + the `.rich-text` CSS block | Question stems, options and solutions need tables, lists and superscripts. The TipTap document shape and its renderer already exist and are shared between the admin editor and the public site. **Needs an image node added** — see §3 decision 5. |
| `MediaUploader` / `ImageUploadField` | Question figures are uploads. The batch uploader, its preview handling and its alt-text enforcement already exist from the 4 Sep media cycle. |
| `RouteMessage` | The expired-attempt and gate screens. |
| `ResourceAdmin` | The admin question bank, next cycle. |
| Workstream **H** (role model & mock session) | The gate and the attempt history. **Hard dependency** — see §9. |

Nothing exists for questions, attempts or scores. This is a new module, not an
extension.

---

## 3. Structural decisions, settled 19 September 2026

| # | Question | Decision | Consequence |
|---|---|---|---|
| 1 | What the first cycle builds | **Full exam-day simulator** — timed, sectioned, with the standard question palette | The player is the hard part, and drills are the same player with the timer and section lock switched off. Building drills first means building the player twice. |
| 2 | Where practice sits | **Exam-nested, plus a thin `/practice` hub** | Tests live under the exam they belong to and inherit its SEO authority; the hub catches people arriving cold. One test model, two ways in. |
| 3 | Lead gating | **Account required before starting a test** | Every attempt is a captured, qualified lead, and attempt history works from the first test. Costs cold-visitor conversion — mitigated, not merely flagged, in workstream S. |
| 4 | Admin authoring | **Public side first, seeded questions** | `lib/practice-data.ts` this cycle; question bank and test builder next. The mock shape becomes the spec the authoring UI is built against — the method used in the two previous cycles. |
| 5 | Question formats | **Images carried by the rich-text schema**, not by a question type | Text, image, table and mixed questions all become the same record. Requires reversing the 5 Sep "no inline images" decision — see below. |

### A note on decision 5 — image-based, text-based and mixed questions

Questions come in several formats: plain text, text with a figure, a figure with text
options, and — in MAH CET's Abstract Reasoning section, which is already in the seeded
exam data — **options that are themselves images**, with no text at all.

The modelling mistake to avoid is adding `"image-based"` to the question-type union.
Format and answer mechanic are **orthogonal axes**: a question with a geometry figure
can be single-select, multi-select or type-in-the-answer, and a purely textual question
can be any of those too. Crossing them produces a union that doubles every time either
axis grows.

So format is not a type at all. `stem` and each option's `body` are already
`RichTextDoc`. **Adding an image node to the rich-text schema makes every format work
at once** — image stems, image options, mixed text-and-figure, and figures inside
solutions — with no new question types and no new renderer.

Three consequences, each real work rather than a free ride:

1. **It reverses a documented decision.** 5 Sep §11 Q5 ruled out inline images so the
   rich-text workstream stayed decoupled from the media pipeline. That reason has
   expired — the media pipeline shipped in the same cycle. `isRichTextEmpty` already
   lists `image` in `MEANINGFUL_WITHOUT_TEXT`, so the groundwork was anticipated.
2. **`next.config.ts` must be revisited.** It allows SVG through the image optimizer
   with a strict CSP, and its own comment says in as many words: *"Revisit if images
   ever start coming from user uploads or a remote host."* Question figures are user
   uploads. SVG diagrams would be crisp and tiny, and SVG from an untrusted uploader
   is exactly the case that exemption was narrowed against. **Recommendation: raster
   only for question images** until there is a sanitiser in the pipeline.
3. **Alt text on an assessment figure is a different problem.** The uploader already
   enforces alt text, correctly, for SEO. But alt text on a question diagram must
   describe the figure *without solving it* — "triangle ABC with a cevian from A" is
   accessible; "triangle ABC, area 24" hands over the answer. This needs its own
   guidance line in the uploader when it is used from the question bank, and it is the
   kind of thing that is invisible until a candidate using a screen reader scores
   suspiciously well.

### Shared stimulus — inferred, and separable

Not stated in the brief, but CAT is the primary seeded exam and it cannot be simulated
without it: one Reading Comprehension passage carries four to six questions, and one
DILR caselet carries four to six more. The candidate reads the stimulus once and
answers a set against it.

This is modelled as a `Stimulus` record that questions reference (§4). It is called out
separately because it is **the one item here that is expensive to retrofit** — it
changes the player from a single column to a split pane with independently scrolling
halves, which is the difference between a layout tweak and a rebuild. If it is cut,
it should be cut now rather than after P ships.

### A note on decision 3

Requiring an account before the candidate has seen anything is the higher-friction
option, and it was chosen deliberately for lead quality over lead volume. Two things
follow, both built into the plan rather than left as caveats:

1. **A free five-question sample set** sits on every exam's practice page, playable
   with no account, ending on the wall. The gate then stands after some value rather
   than in front of all of it.
2. **The test list and instructions screens stay public and indexable.** Only the
   player itself is gated. Putting the gate at the route boundary instead would make
   the module invisible to search, which would defeat the reason it is nested under
   the exam pages at all.

---

## 4. Workstream N — Practice data model & seeded content

**The foundation. P and Q both read this shape.**

`lib/practice-data.ts`

```
// The answer mechanic. NOT the format — see §3 decision 5.
type QuestionType = "mcq-single" | "mcq-multi" | "tita"

// A passage, caselet or figure shared by a set of questions.
type Stimulus = {
  id: string
  kind: "passage" | "caselet" | "figure"
  body: RichTextDoc          // text, tables, images, or any mix
  label?: string             // "Passage 2", "Caselet: airline routes"
}

type Question = {
  id: string
  examSlug: string
  sectionId: string
  stimulusId?: string        // set when this belongs to a shared-stimulus group
  topic: string              // "Arithmetic", "Reading Comprehension"
  difficulty: "easy" | "medium" | "hard"
  type: QuestionType
  stem: RichTextDoc          // text and/or figures — one schema, every format
  options?: { id: string; body: RichTextDoc }[]   // bodies may be pure image
  correct: string[] | { value: number; tolerance?: number }
  solution: RichTextDoc      // may carry worked diagrams
  marks: number
  negativeMarks: number
  expectedSeconds: number    // powers the time analysis in Q
}

type TestSection = {
  id: string
  label: string              // derived from Exam.sections
  questionIds: string[]
  durationMinutes?: number   // set only when the section is separately timed
}

type MockTest = {
  slug: string
  examSlug: string
  title: string
  kind: "full-mock" | "sectional" | "previous-year" | "sample"
  totalMinutes: number
  sections: TestSection[]
  sectionLock: boolean       // CAT locks; NMAT does not
  attemptsAllowed: number | null
  isPublished: boolean
}
```

### Four shape decisions worth defending

**Stems, options and solutions are rich-text documents, not strings.** A quantitative
question needs a table; an RC passage needs paragraphs; a geometry question needs a
figure; an Abstract Reasoning option *is* a figure. The document shape, the renderer
and the CSS already exist and are already shared between the admin editor and the
public site, which is the whole reason the WYSIWYG work was done that way. Carrying
format in the document rather than in a type union is what keeps the question record
to one shape across every format the exams use.

**`stimulusId` is a reference, not an embed.** Copying a passage onto each of its six
questions means six copies to correct when a typo is found, and a player that cannot
tell it is still showing the same passage — so it re-renders and scrolls the candidate
back to the top between questions in a set. Both failures disappear if the stimulus is
a record the questions point at.

**`sectionLock` is per test, not global.** CAT locks a candidate into a section for
its full duration and will not let them go back; NMAT lets them choose the order. A
simulator that gets this wrong is worthless to the candidate who knows the real thing
— which is every candidate who would use it.

**TITA is a first-class question type.** Type-in-the-answer questions are roughly a
quarter of a CAT paper and they carry no negative marking, which changes how a
candidate plays the clock. Modelling them as MCQs with hidden options would be a
false simulation.

### Seeded content

Two full CAT mocks, one NMAT, one CAT sectional (QA only), and a five-question sample
set per exam. Enough to demonstrate every variation without authoring hundreds of
questions for a demo — and the seed must deliberately cover each one, because a format
that is not seeded is a format nobody discovers is broken:

- locked and unlocked sections;
- MCQ and TITA;
- a text-only question, a text question with a figure, and **an Abstract Reasoning
  question with four image options and no text** (MAH CET, already in the exam data);
- **an RC passage with four questions against it**, and a DILR caselet with four —
  the shared-stimulus path;
- a question whose solution carries a worked diagram.

Volume is a content-sourcing question, not a build one (§11).

**4 days** — up from 3 for the image node in the rich-text schema and the stimulus
model.

---

## 5. Workstream O — Discovery

Making the tests findable. Depends on N.

- **Practice rail on `/exams/[slug]`** — a new section alongside About, Pattern,
  Cutoffs and Colleges. Shows available tests and the free sample.
- **`/exams/[slug]/practice`** — the test list for one exam. Each card carries
  duration, question count, marking scheme and, for a signed-in candidate, attempts
  used and best score.
- **`/practice`** — the hub across exams, grouped the way `/exams` already groups
  them (National, then State). Deliberately thin: it exists for cold arrivals, not as
  the primary route in.
- **`/exams/[slug]/practice/[test]`** — the instructions screen. Every real exam has
  one and candidates expect it; it is also where the gate lands.
- **Metadata.** The list and instructions pages are indexable content. The player and
  results carry `robots: noindex` — they are per-attempt and there is nothing there to
  rank for.

**3 days.**

---

## 6. Workstream P — The test player

**The core of the cycle, and the largest single component in the app.** Depends on N.

`/practice/attempt/[id]`, in a **new `(exam)` route group** — no site header, no
footer, no compare tray. Full-screen, like the real thing. This is why it sits outside
`(site)` rather than inside it.

### What it has to do

- **Timer.** Total, plus per-section when the test is locked. Counts down and
  auto-submits at zero.
- **Attempt state survives a refresh.** Persisted continuously. A candidate who
  refreshes and loses forty minutes of work does not come back, and no amount of
  polish elsewhere recovers that.
- **Question palette, five states** — not visited, not answered, answered, marked for
  review, answered and marked. This is the convention every Indian entrance exam uses;
  candidates read it without instruction. Inventing cleaner states would be a
  downgrade dressed as an improvement.
- **Actions:** Save & Next, Mark for Review & Next, Clear Response, Previous.
- **Section tabs**, with locked sections shown but unreachable and their remaining
  time visible.
- **TITA input** — numeric entry, no options, tolerance-checked.
- **Submit** behind a confirmation showing the palette summary: answered, unanswered
  and marked counts. Submitting a test by accident is unforgivable.

### Rendering every question format

- **Split pane for shared stimuli.** Passage or caselet on the left, question and
  options on the right, each scrolling independently. Moving between questions in a
  set must **not** re-render or re-scroll the stimulus — a candidate who loses their
  place in a passage on every Next has lost the reading time the section is made of.
  Stacks vertically below `lg`, stimulus collapsible.
- **Figures in stems and options.** Both are rich-text documents, so both render
  through the existing renderer once the image node exists. Image options lay out as a
  two-by-two grid rather than a list — four diagrams in a column is unreadable and is
  not what the real paper looks like.
- **Zoom.** DI charts, maps and dense figures need a lightbox at full resolution.
  Keyboard-dismissable, and it must not consume the arrow keys the player uses.
- **Fixed dimensions on every figure.** Width and height come from the record so the
  layout does not reflow as images decode — a question that jumps while it loads costs
  the candidate seconds, and seconds are what the whole exercise measures.

### Accessibility

Options reachable and selectable by keyboard; the palette reachable and its states
conveyed by more than colour; the timer announced at milestones via a polite live
region rather than every second. Reduced motion respected, consistent with the rest of
the site.

Figure alt text follows the §3 rule — describe without solving. Where a diagram genuinely
cannot be conveyed in text without giving away the answer, the question is flagged in
the bank rather than shipped with misleading alt text.

### Risk

This component carries more state and more edge cases than anything else in the
codebase — timer expiry mid-navigation, a locked section ending while the candidate is
mid-question, resumption into a partially expired attempt, and now a stimulus pane that
must persist across question changes but not across set changes. The estimate reflects
that.

**7 days** — up from 6 for the split pane, image options and the lightbox.

---

## 7. Workstream Q — Results & solutions

`/practice/result/[id]`. Depends on P.

- **Score summary** — total, attempted, correct, incorrect, accuracy, and the
  sectional breakdown.
- **Percentile**, computed against a seeded distribution and **labelled indicative**.
  It becomes real when there are real attempts to rank against; presenting a mocked
  percentile as real would be the one thing in this module a candidate could catch us
  on.
- **Time analysis** — time spent per question against `expectedSeconds`, surfacing
  where the clock was lost. This is the insight a candidate cannot get from taking a
  paper test, and it is the reason to come back.
- **Topic strengths and weaknesses**, free from `Question.topic`.
- **Solutions review** — question by question, the candidate's answer against the
  correct one, solution rendered through the existing `RichText` component. Filterable
  to all / incorrect / marked / skipped.
- **Charts** — sectional bars, accuracy breakdown. Build these through the `dataviz`
  skill so they match the admin panel's existing chart work rather than introducing a
  second visual language.
- **"Colleges accepting this score"** — a band linking into `/colleges` filtered by
  the exam. Per §1, this is the module's reason for existing, not an afterthought.

**4 days.**

---

## 8. Workstream R — Student practice area

Depends on **H** and on Q.

A new `(account)` route group — students are not admin users and must never reach the
admin shell.

- `/account/practice` — attempt history: test, date, score, percentile, time taken,
  with resume or review per row.
- **Score trend per exam** over time.
- **In-progress attempts resumable** from here, which is also the recovery path if a
  candidate closes the tab mid-test.

**3 days.**

---

## 9. Workstream S — The gate

Depends on **H**.

- The instructions screen checks the session. No session, or a session without a
  Student role, shows the sign-up wall with `?next=` pointing back at the test.
- `/login` and `/register` gain `next` support and route back to it on success. Both
  currently route unconditionally, so this is a real change to both forms.
- The register form gains an optional **"preparing for"** exam field. It is a lead
  qualifier, and the form already collects a stream, so the pattern is established.
- **The free sample set** (§3) — five questions, no account, running through the same
  player with the timer off, ending on the wall with the candidate's sample score
  visible behind it.

**2 days.**

---

## 10. Sequencing & estimates

**The important sequencing fact:** N, O and P need no session and can start
immediately. R and S cannot start until workstream **H** from the roles plan has
landed. So the two cycles interleave rather than queue.

```
Week 1     N: data model & seeded content  ──┐
           O: discovery pages (needs N)    ──┘   no session needed

Week 2     P: the test player (needs N)
                                                 ← H lands here at the latest
Week 3     P: continued
           Q: results & solutions (needs P)

Week 4     R: student area (needs H, Q)
           S: the gate (needs H)
           Polish & review pass
```

| Workstream | Days | |
|---|---|---|
| N — Practice data model & seeded content | 4 | +1 for images & stimuli |
| O — Discovery pages | 3 | |
| P — The test player | 7 | +1 for split pane & image options |
| Q — Results & solutions | 4 | |
| R — Student practice area | 3 | |
| S — The gate | 2 | |
| **Total** | **~23 days** | |

Excludes QA, content authoring and client review cycles. All UI over mock data.

**If shared stimulus is cut** (§3), N drops to 3 and P to 6 — ~21 days. Nothing else
in the plan changes, which is why it is worth deciding before N starts rather than
after P ships.

### Explicitly out of scope this cycle

The admin question bank and test builder (next cycle), bulk question import, real
percentile computation, proctoring of any kind, paid tiers or entitlements, and
question-level analytics across candidates.

### Commercial note

~21 days here plus ~17.5 days in the roles plan is roughly eight developer-weeks
across the two cycles. They share a dependency (H) but not a critical path, so a
second pair of hands compresses them meaningfully — one track on roles, one on
practice, joining at H.

---

## 11. Open questions for the client

| # | Question | Working assumption |
|---|---|---|
| 1 | **Who authors the questions, and how many at launch?** Two full CAT mocks is ~132 questions with worked solutions. This is a content commitment measured in weeks, and it is not a development task. | Client supplies content; we supply the authoring UI next cycle and seed a demo set now. **Needs an owner named before launch, not before build.** |
| 2 | **Previous-year papers — do we have the right to reproduce them?** Past CAT/NMAT papers are the most-wanted content in this module and are copyrighted by the conducting bodies. | `kind: "previous-year"` is modelled but **seeded with nothing** until this is answered. Flagging early because it is a legal question with a long lead time. |
| 3 | Percentile — seeded curve indefinitely, or switch to computed once there are real attempts? | Seeded and labelled indicative now; switch when attempt volume supports it. |
| 4 | Attempts per test — unlimited retakes, or capped? | `attemptsAllowed: null` (unlimited) as the seeded default. A cap is a one-field change. |
| 5 | Negative marking per exam — CAT is −1 on MCQs and none on TITA; NMAT has none at all. | Modelled per question with a per-test default. Needs confirming per exam before launch. |
| 6 | Is practice free permanently, or is a paid tier likely? | Free. No entitlement model is built. Worth answering now — retrofitting entitlements after launch is materially harder than allowing for them. |
| 7 | **Shared stimulus (RC passages, DILR caselets) — in or out?** Inferred, not briefed. In means a split-pane player. | **In.** CAT cannot be simulated without it, and it is the one item here that is genuinely expensive to retrofit. Cutting it saves ~2 days and must be decided before N starts. |
| 8 | **How do question figures arrive** — drawn by the content team, scanned from worked material, or supplied as files? | Uploads through the existing `MediaUploader`. Raster only (§3) until SVG sanitising exists. Raises the same licensing question as Q2 if figures are scanned from published papers. |
| 9 | Do any target exams need formats beyond text and image — audio, video, or interactive (drag-to-match, hotspot)? | **No.** None of the six seeded exams use them. Asked because an interactive format is a new player capability, not a new document node, and would not be absorbed the way images are. |

---

## 12. What this cycle leaves ready for the backend

- `lib/practice-data.ts` — the question, stimulus, section and test records, and the
  shape the authoring UI will be built against.
- **An image node in `richTextExtensions`**, which every other rich-text field on the
  site inherits the moment it lands — college content, articles and course detail can
  all carry figures from that point. Worth knowing, because it quietly widens what the
  existing editor can do beyond this module.
- The attempt record — answers, per-question timings, flags, section state — which is
  the one genuinely write-heavy entity the platform will have, and worth sizing before
  the API is designed.
- The `(exam)` route group, which is where a real anti-cheat or proctoring layer would
  attach if it is ever wanted.
