# Client MOM & Implementation Plan — UI scope

> **Internal document.** Carries day estimates and commercial notes.
> The client-facing summary of the same work is
> [2026-09-05-client-delivery-report.md](2026-09-05-client-delivery-report.md).

**Meeting date:** 4 September 2026
**Subject:** Demo feedback — TopCollegePath site & admin panel
**Scope:** **UI only.** No backend, no API, no persistence this cycle.
**Status:** Open questions resolved 5 Sep 2026 (§11). All seven workstreams built — see §13.

---

## 1. Minutes of meeting (as received)

### 1.1 Logo & UI design
- Logo/icon size should be properly proportionate with the text.
- Create a revised design with a slightly larger text size and better logo–text balance.

### 1.2 Admin — college edit page
- Existing sections: Basic Details, Course Fee, Rank, Approval, Placement, Cutoff, Review, Media, SEO.
- Additional sections required: Articles, News/Alerts, Gallery, Videos, etc.
- Add 3–4 dynamic tabs configurable from the admin panel.
- Tab names should be editable/dynamic.
- Tabs should only appear on the frontend when content is available.

### 1.3 Media & gallery
- Media is for public/promotional content, rankings, print media.
- Images and videos handled separately through Gallery / Image / Video sections.
- Option to select the best/highlight images for display.

### 1.4 Rich text editor
- Implement a rich text / WYSIWYG editor for detailed content.
- Must support formatted text, tables, lists.
- Available for course details and other college content sections.

### 1.5 Admin college list — filters
- Add a program-based filter to Admin → College List.
- Programs include Engineering, Medical, Management, etc.
- College selection and ranking manageable per selected program.

### 1.6 College comparison
- Users compare 2–3 colleges on a single page.
- **Not** on the homepage.
- Shown at the bottom of college detail pages as a relevant comparison.
- Predefined comparisons such as "Which College Should I Choose?" also provided.

### 1.7 Homepage — recommended/popular colleges
- Top Colleges, Recommended Colleges, Popular Colleges and Top Exams should be dynamic.
- Admin selects the relevant program and colleges/rankings.
- Section headings configurable — e.g. "Recommended Colleges" → "Popular Colleges".
- Option to add specific colleges to the list, by priority or ranking.

### 1.8 Program & ranking logic
- Each program can have multiple ranking types, e.g.:
  - Top colleges in a particular city
  - Top colleges in India
  - NIRF rankings
  - Exam-based rankings such as CAT
- Admin selects the program and ranking type.
- Colleges fetched/displayed automatically from the selected ranking configuration.

---

## 2. Analysis

### 2.1 Items 5, 7 and 8 are one feature, not three

Read separately they look like a filter, a homepage editor and a ranking
config. They are all consumers of the same missing concept: **a program, and
the ranked lists of colleges that hang off it.**

- §1.8 defines the shape.
- §1.5 is that shape surfaced as an admin filter.
- §1.7 is that shape surfaced as homepage section binding.

Built independently, the "pick a program, pick a ranking, get colleges" logic
gets written three times and drifts. **The shape is defined once, in mock data,
before any of the three screens is built.**

### 2.2 With no backend, the mock data *is* the specification

This is the consequence worth being deliberate about. Every screen this cycle
reads from `lib/mock-data.ts`, exactly as the existing admin does. That makes
those type definitions the de facto API contract — whatever shape is invented
here is what the backend will later be asked to match.

Two implications:

1. **Shape the mock data as if it were an API response.** Entities with ids and
   slugs, lists that look like collections, relations by id rather than by
   inlined objects. Wiring then becomes swapping the data source, not rewriting
   the components.
2. **Do the modelling thinking now anyway.** §1.8 in particular is a data-model
   question wearing a UI costume. Getting the shape right costs nothing extra
   today and saves a rebuild later; getting it wrong is discovered only when the
   API arrives.

Screens will end in Save buttons that validate and close, as they do today. That
is expected and consistent — but it does mean **this cycle produces a
demonstrable prototype, not a usable CMS**, and nothing entered survives a
refresh. Worth stating plainly to the client so the demo is not mistaken for a
working system.

### 2.3 Item 1 conflicts with a previous instruction

The client previously asked for the logo to be **narrower** (plate compressed
10%, wordmark reduced twice). This MOM asks for **larger text and better
balance**. On a fixed-width plate these fight directly — the wordmark already
occupies 297 of 302 available units, so type cannot grow without the plate
growing.

Recommended resolution — **two lockups from one design**:

| Lockup | Use | Composition |
|---|---|---|
| Compact | Site header | Mark + wordmark, tagline dropped |
| Full | Footer, print, share images | Mark + wordmark + tagline |

Dropping the tagline from the header frees roughly a third of the plate's
vertical budget, which goes to the wordmark — delivering "larger text, better
balance" **without** reversing the width reduction. Needs confirmation (§10).

---

## 3. Workstream A — Program & ranking (mock model + admin UI)

**Feeds:** §1.5, §1.7, §1.8. **Build first** — the other two consume its shape.

### Mock data shape

```ts
type Program      = { slug, name, stream }
type RankingType  = { slug, name, scope: "city" | "national" | "authority" | "exam" }
type RankingList  = { slug, programSlug, rankingTypeSlug, name, scopeValue }
type RankingEntry = { rankingListSlug, collegeSlug, rank, isPinned, priority }
```

`RankingList` is what the MOM calls a "ranking configuration": *Management +
NIRF*, *Engineering + Top in Bengaluru*, *Management + CAT-based*. A college
appears in many lists at different ranks.

`isPinned` / `priority` satisfies §1.7's "add specific colleges by priority" —
pinned entries sort above computed rank, so an editor can promote a college into
a homepage slot without touching the underlying ranking.

### UI
1. Admin → Rankings module: list of ranking configurations, add/edit.
2. Ranking editor: program selector, ranking type, scope value, ordered college
   list with pin and priority controls.
3. Seed 4–6 believable ranking lists in mock data so the screens demo well.

**Estimate:** 3 days.

---

## 4. Workstream B — Dynamic tabs on the college record

**Covers:** §1.2. **Depends on:** Workstream D (editor) for tab bodies.

Tabs are currently a hard-coded array in `college-edit-modal.tsx`.

### Recommended shape: global templates, per-college content

```ts
type TabTemplate       = { slug, label, sortOrder, isActive }
type CollegeTabContent = { collegeSlug, tabSlug, body }
```

An admin defines 3–4 custom tabs **once** ("Scholarships", "Hostel &
Facilities", "Alumni"); every college then fills them in. Arbitrary per-college
tabs make the public page layout unpredictable and roughly double the work —
almost certainly not what was meant, but **confirm (§10)**.

### UI
1. Admin → Settings → Tab templates: add, rename, reorder, activate/deactivate.
2. College edit modal reads tab templates instead of the hard-coded array.
3. Fixed new sections — Articles, News/Alerts — as their own tabs with dated
   list editors, since they are lists of records rather than free text.
4. Public college page renders a tab **only when its body is non-empty**.

**One detail that will bite:** an editor opened and closed produces an empty
paragraph, which is structurally non-empty. The emptiness check must ignore
that, or every tab shows blank.

**Estimate:** 3 days admin, 2 days frontend.

---

## 5. Workstream C — Media, gallery & video

**Covers:** §1.3.

One uploader exists today. The MOM asks for three collections with genuinely
different shapes:

| Collection | Purpose | Fields |
|---|---|---|
| **Media** | Press, rankings, print coverage | file (image *or* PDF), title, publication, date, external link |
| **Gallery** | Campus photography | image, name, alt text, `isHighlight` |
| **Videos** | Tours, testimonials | provider, video URL/ID, title, thumbnail |

### Recommendation: videos by URL, not upload
Even setting the backend aside, self-hosted video means storage, bandwidth,
transcoding and a player. Embedding YouTube/Vimeo gives all of that free. Unless
there is a specific reason to self-host, **store provider + ID and embed** —
which is also far simpler to build as UI. Flagged in §10.

### UI
1. Split the Media tab into three sub-tabs with the shapes above.
2. Media uploader accepts PDFs, not only images.
3. Gallery: highlight toggle per image, with a cap so "highlight" stays meaningful.
4. Videos: URL input with provider detection and a thumbnail preview.
5. Keep alt text required on gallery upload — image sitemaps are in signed scope.

**Estimate:** 4 days.

---

## 6. Workstream D — Rich text editor

**Covers:** §1.4. **No dependencies — can start immediately, in parallel.**

Nothing is installed today.

### Recommendation: TipTap (ProseMirror), JSON document

| Decision | Choice | Why |
|---|---|---|
| Library | TipTap | React-native, tables and lists built in, actively maintained |
| Document format | JSON, not HTML | See below |
| Rendering | Server-render from JSON | Content must be in the initial HTML — this site lives on organic search |

**Store JSON even though there is no backend yet.** The tempting shortcut is to
keep editor HTML and render it with `dangerouslySetInnerHTML`. That decision is
very hard to reverse once content exists, and it turns any future admin
compromise into stored XSS on every visitor. Choosing the format now, while
there is no content to migrate, is free.

### Scope
Bold, italic, underline, headings, ordered and unordered lists, tables, links,
blockquote. Applied to course details and college content sections. Image
embedding inside content is a **separate decision** (§10).

**Estimate:** 3 days.

---

## 7. Workstream E — Homepage section binding

**Covers:** §1.7. **Depends on:** Workstream A.

The section composer (`/admin/sections/homepage`) already handles editable
headings, visibility, item ordering and Top-N / shuffle featuring. This extends
it:

1. **Editable headings already work** — §1.7's "Recommended Colleges" → "Popular
   Colleges" is done, pending persistence.
2. **Add:** program selector per section.
3. **Add:** ranking-list selector, filtered by the chosen program.
4. **Add:** manual college picker with priority, layered over the ranked list
   (`isPinned` from §3).
5. **Add:** ability to add another section of this type — "Popular Colleges" may
   sit *alongside* "Recommended Colleges" rather than replacing it.

Point 5 is an interpretation: the MOM reads as a rename, but listing "Top
Colleges, Recommended Colleges, Popular Colleges" together suggests several such
bands. Confirm (§10).

**Estimate:** 3 days.

---

## 8. Workstream F — College comparison

**Covers:** §1.6.

### Placement, per the MOM
- **Not** on the homepage — respected.
- "Compare with similar colleges" block at the **bottom of college detail pages**.
- Predefined comparisons as standalone pages.

### Make predefined comparisons real pages
"Which College Should I Choose?" and any *X vs Y* comparison should be
**indexable URLs** (`/compare/bims-vs-eastwind`), not a modal or client-side
state. Comparison searches are high-intent — someone searching "IIM Bangalore vs
XLRI" is close to converting, and a modal captures none of that traffic. Given
this project's SEO emphasis, that is where comparison earns its keep.

### UI
1. Comparison table: fees, placements, ranking, cutoffs, approvals, courses.
2. Compare tray — select 2–3 colleges from listings, persists across navigation.
3. Comparison route rendering from mock data.
4. Curated comparison pages with their own metadata.

**Estimate:** 4 days.

---

## 9. Workstream G — Logo revision

**Covers:** §1.1. **Depends on:** answer to §10 Q1.

Two lockups as in §2.3. The mark is already drawn inline and palette-aware
(`site-logo.tsx`), so this is a geometry change to an existing component.

**Estimate:** 0.5 day.

---

## 10. Sequencing & estimates

```
Week 1     D: rich text editor      ──┐ parallel, no dependencies
           G: logo revision           │
           A: program & ranking     ──┘
                                      │
Week 2     C: media / gallery / video │
           B: dynamic tabs (needs D) ─┤
                                      │
Week 3     E: homepage binding (needs A)
           F: comparison
           Polish & review pass
```

| Workstream | Days |
|---|---|
| A — Program & ranking (mock + admin) | 3 |
| B — Dynamic tabs | 5 |
| C — Media / gallery / video | 4 |
| D — Rich text editor | 3 |
| E — Homepage binding | 3 |
| F — Comparison | 4 |
| G — Logo | 0.5 |
| **Total** | **~22.5 days** |

Excludes QA and client review cycles. All UI over mock data.

### Explicitly out of scope this cycle
Data models, migrations, API endpoints, file upload storage, authentication, and
`/admin` access control. Noted because `/admin` is currently reachable by URL
with no login — fine for local review, but it should not be on a public URL
until auth exists.

---

## 11. Open questions — resolved 5 September 2026

All seven answered. Recorded here rather than in a separate note so the decision
sits beside the question it settles.

| # | Question | Decision | Consequence |
|---|---|---|---|
| 1 | Logo lockups | **Two lockups** — compact (no tagline) in the header, full elsewhere | Wordmark grows without the plate widening; the earlier narrowing holds |
| 2 | Dynamic tabs | **Global templates**, every college fills them in | Public layout stays predictable; B stays at ~5 days rather than ~9 |
| 3 | Videos | **Embed by URL** (provider + id) | No storage, bandwidth, transcoding or player to build |
| 4 | Comparison | **Full record**, curated pairs **hand-authored** | Table carries fees, placements, ranking, cutoffs, approvals, courses, rating |
| 5 | Rich text images | **No inline images** this cycle | D stays decoupled from C and can run in parallel on week 1 |
| 6 | Highlight images | **Max 5** per college — first is the listing card, all five feed the detail hero | Cap enforced in the gallery UI |
| 7 | "Popular Colleges" | **Repeatable bands** — several college bands can sit alongside each other | E needs section instances, not just a rename |

### Scope, agreed alongside

Workstreams B, C and F are **Phase 2** in the signed proposal
(`assets/prototype/College-Discovery-Platform-Proposal.md`); this cycle pulls
them forward. Full scope is being built. Two things to carry to the client:

1. **~22.5 days does not fit three weeks for one developer.** The §10 grid needs
   roughly four weeks, or a second pair of hands on the parallel tracks.
2. **The Phase 2 pull-forward is a commercial conversation**, not a technical
   one — flagged here so it is not discovered at invoicing.

## 12. What already exists

Work these items build on rather than replace:

- **Section composer** (`/admin/sections/homepage`) — editable headings,
  visibility, item ordering, Top-N / shuffle featuring. §1.7 extends this.
- **College edit modal** — the eight tabs the MOM lists as "existing" are built,
  with all fields from the college record plus SEO.
- **Media uploader** — drag-and-drop, per-image name and alt text, alt required.
  §1.3 splits this into three collections.
- **Resource shell** (`resource-admin.tsx`) — table, search, add/view/edit
  dialogs, shared by Courses, Specialisations and Exams. New modules should use
  it rather than repeat it.
- **Slug generation** — auto from name, stops following once edited, never
  auto-changes on an existing record.

All of it is UI over `lib/mock-data.ts`, which is the pattern this cycle
continues.

---

## 13. Delivery — 5 September 2026

All seven workstreams built over mock data. `tsc` and `eslint` clean;
`next build` prerenders 24 routes.

| WS | What landed | Key files |
|---|---|---|
| A | Program/ranking model, `/admin/rankings`, program + ranking filter on the college list | `lib/rankings-data.ts`, `admin/rankings-admin.tsx` |
| B | Global tab templates in Settings, modal reads them, public tabs gated on non-empty content, Articles + Alerts editors | `lib/college-content.ts`, `admin/settings-admin.tsx`, `admin/college-articles.tsx` |
| C | Media / Gallery / Videos split, PDF uploads, highlight cap of 5, videos by URL | `admin/college-media-tabs.tsx`, `admin/media-uploader.tsx` |
| D | TipTap editor, JSON documents, server-rendered output | `lib/rich-text.ts`, `admin/rich-text-editor.tsx`, `components/rich-text.tsx` |
| E | Repeatable homepage bands bound to ranking lists, with promoted colleges | `admin/college-bands-editor.tsx`, `app/(site)/page.tsx` |
| F | Comparison as indexable pages, curated + ad-hoc, compare tray, block on college pages | `lib/comparison-data.ts`, `app/(site)/compare/` |
| G | Two lockups — compact header, full elsewhere | `components/site-logo.tsx` |

### Three things worth knowing

**The logo type had to be measured, not calculated.** Arial has no weight-800
cut, so the browser synthesises it and sets the wordmark ~13% wider than the
metrics predict. Sizing the plate from the metric clipped the "Path"; the
geometry now comes from `getBBox()`, and the file says to re-measure rather than
scale if the type is ever resized.

**The empty-paragraph case is handled and verified.** An editor opened and
closed leaves one empty paragraph, which is structurally non-empty.
`isRichTextEmpty` walks for actual substance. Confirmed on the seeded record:
Horizon's untouched Hostel document renders no tab, BIMS's two written tabs do.

**Rich text is stored as JSON, not HTML.** Cheap now, very expensive to reverse
once content exists, and it keeps a future admin compromise from becoming stored
XSS on every visitor.

### Still open

- **Nothing persists.** Every Save validates and closes. This is a demonstrable
  prototype, not a working CMS — worth saying plainly before the demo.
- **`/admin` has no auth.** Fine locally; must not reach a public URL as-is.
- **Nav links without screens:** Locations, Static Pages, Leads, Reviews, Q&A,
  SEO, Users. Pre-existing, unchanged by this cycle.
- **`site-log-copy.tsx`** is an unreferenced duplicate of the old logo and will
  now drift. Delete unless it is wanted as a reference.

---

## 14. Follow-up round — 5 September 2026

Client review of the built demo. Four changes.

**Logo, reversed decision (§11 Q1).** The tagline is to stay in the header. The
two-lockup split is gone; there is now one lockup, and the type grew anyway by
shortening the plate (170 → 140) and taking the mark down to 62% rather than by
dropping a line. Wordmark +39%, tagline +29%, mark −25%. The footer lockup went
h-12 → h-20, which was the "not visible properly" report — at 48px the tagline
was setting at 5.5px.

**College card overlap.** The card switched layout at `sm:` — a *viewport*
breakpoint — while sitting in a ~400px grid cell, so the logo, a three-column
stat grid and the action column were laid out side by side inside 400px. Now a
`@container` query on the card's own width: stacked below 672px, row above.
Both branches verified on screen.

**Homepage bands.** Recommended and Popular are switched off (`isVisible:
false`) until the rankings behind them are real. Left in the data rather than
deleted so the homepage editor can switch them back on without a code change.

**Missing pages.** Everything reachable from the homepage now resolves:
`/courses`, `/courses/[slug]`, `/exams`, `/exams/[slug]`, `/location/[slug]`,
`/[stream]/colleges`, `/articles`, `/articles/[slug]` and `/enquiry` — the last
being the route every CTA on the site pointed at. Shared listing shell in
`components/college-listing.tsx` so the city and stream pages do not diverge.

### Carried forward

- **`kr-mangalam-university` is the one record naming a real institution**, and
  every figure on it is invented. Replace with published data or rename before
  this is shown outside the project — see the note in `lib/mock-data.ts`.
- Still 404: `/register`, `/forgot-password`, `/study-abroad`, and the exam
  sub-pages (`/exams/[slug]/cutoff`, `/answer-key`) and
  `/courses/[slug]/eligibility` that some cards link to.
