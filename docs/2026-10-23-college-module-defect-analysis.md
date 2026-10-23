# College module: defect tracker analysis

Source: *Top College Defect Tracker – College.pdf* (72 items, SL 1–72).
Method: each item was checked against the current code (`main`, commit `f2e472d`), not only against the tester's remark. Nothing has been run in a browser for this review, so items marked **Runtime check** need a quick look in the app before the fix is accepted.
Status: **fixes in progress. See section 7 for what has been done and what is left.**

## 1. Summary

| Verdict | Count | Items |
|---|---|---|
| **Resolved** (tester marked Passed, and the code agrees) | 8 | 2, 23, 24, 34, 45, 46, 49, 72 |
| **Open, needs a code change** | 61 | everything else except the three below. Of these, 5 also need a decision first (10, 12, 47, 48, 63; section 2) and 4 need a look in the app (17, 18, 67, 71) |
| **Open, data cleanup only** | 3 | 22, 69, 70 (47/48 need data cleanup as well as code) |

Tracker priorities where given (open items only): **P1** 26, 35, 44 · **P2** 25, 28, 32, 36, 38, 39, 43, 47, 53, 67 · the rest are P3/P4, and items 1–22 and 71 have no priority. The orange rows in the tracker (1, 2, 10) look like the client's own highlights; 1 and 10 are open and sit in the first work packages.

### Root causes that explain many items at once

1. **Two validators that disagree.** Add College is validated by `CollegeCreateBody` in `backend/routers/admin.py` (year 1800–2100, no future check, no name rule). The editor is validated by `RecordBody` in `backend/routers/admin_college_record.py` (year 1000–current). The client mirror is `frontend/src/components/admin/college-editor/validate.ts`. They were written separately. Items 3, 14, 27.
2. **Fields silently "fix" what you type.** `onChange` handlers clamp with `Math.max/Math.min` (placement %, ranking rank, review ratings, faculty count and PhD %), and `RangeField` blanks the whole fee when From > To. The user is never told. Items 4, 25, 41, 44, 52, 58.
3. **Free text where the site has a list.** Exams (`ChipInput`), duration, review batch, cut-off exam. Items 28, 35, 43, 53.
4. **No status on a college.** `colleges` has no draft/published/archived column, so a new college is live at once, nothing can be hidden, and QA records stay in public lists. Items 10, 12, 47, 48.
5. **Add form is uncontrolled.** It posts through `useActionState`, and React resets an uncontrolled form after an action, so everything but the name is cleared when the server says no. Item 5.
6. **Unstable ordering.** The default listing sort is `review_count desc` with no tie-break (`backend/repositories/college.py`), and a new college has 0 reviews, so it lands at the bottom and the order can change between requests. Items 1, 16.

## 2. Decisions needed before building

| # | Question | Recommendation |
|---|---|---|
| D1 | **Status model** for colleges (items 10, 12, 47, 48): add `status` = Draft / Published / Archived. | Yes. Existing colleges become Published. A college added from admin starts as Draft; publishing is a button in the list. "Delete" becomes **Archive** (reversible), with a confirmation. A hard delete stays available only for Archived colleges. |
| D2 | Who may publish? | Platform admins only (college admins already go through approval requests). |
| D3 | Year established range (3, 27) | 1800 to the current year, in Add, Edit and the API. |
| D4 | Highest package below average/median (40) | **Block** save (not just warn). |
| D5 | Review (53–55): minimum length, batch format | Minimum 20 characters; batch `2021` or `2021-2025` or `2021-25`; date not in the future. |
| D6 | News and alert dates (61, 62) | No default date; not in the future; not before 2000. |
| D7 | Programme duration (7, 35) | A number plus a Years/Months picker, stored as today's text ("2 Years") so nothing downstream changes. |
| D8 | Duplicate college (8) | Warn with "Add anyway" (same name and city, case-insensitive). |
| D9 | Article author default (63) | No default; shown only when entered. |
| D10 | Short title fallback (32) | Use the full college name, not initials and city. |
| D11 | QA/test records (47, 48) | Archive them (D1) rather than delete; confirm the list with you first. |
| D12 | Name rules (13, 14) | Trim; at least 2 real characters; allow letters, digits, spaces and `. , & ' ( ) / -`; reject `< > ; { } \` and similar. |

## 3. Item by item

Verdicts: **Resolved**, **Open**, **Data**, **Runtime check** (cause is probable but should be seen in the app). "WP" is the work package in section 4.

### 3.1 College list and Add College (1–21)

| SL | Verdict | What the code shows | Fix | WP |
|---|---|---|---|---|
| 1 | Open | Default sort is `review_count desc` with no tie-break; a new college has 0 reviews, so it sorts last (`repositories/college.py`). Admin list uses the same sort. | Admin list: default **newest first** (`created_at desc, id`). Public default: add a stable tie-break. | A |
| 2 | **Resolved** | `useFlash`/`StatusMessage` show "College added." / "`<name>` saved." and errors. Delete message arrives with 10. | none | n/a |
| 3 | Open | Add: `established` 1800–2100 (accepts 2030). Edit: 1000–current. | One shared rule (D3), server and client. | B |
| 4 | Open | `RangeField.emit` returns `""` when From > To, so the saved fee is **blanked**, and `validate.ts` never sees a problem. | Keep the typed numbers, show "The 'From' fee must be less than or equal to the 'To' fee.", block Save, keep the stored value until corrected. Server check too. | B |
| 5 | Open | Add form is uncontrolled (`AddCollegeForm`); React clears it after the failed action. | Control every field (or return the entered values from the action) so nothing is lost on error. | C |
| 6 | Open | Add has a hard-coded list of 8 streams (`colleges-admin.tsx`); Edit uses `pools.streams` (14). Listing facets differ again. | One list from `pools.streams` (home fields + streams in use), used by Add, Edit and any filter. | C |
| 7 | Open | `CourseRow.duration` is any text; `AmountField` accepts a typed minus. | See 35, 36. | B |
| 8 | Open | Only the slug is checked for uniqueness (`admin_create_college`). | Server returns a `DUPLICATE_NAME_CITY` warning; Add shows "Add anyway" (D8). | C |
| 9 | Open | On save, `courses_offered` is only updated `if data.courses:`, so removing the last programme leaves the old count. Remove has no confirmation (`Row`). | Always set the count to `len(courses)`; confirm before removing a programme (and a review/placement/cut-off row). | B |
| 10 | Open, **D1** | `DELETE /admin/colleges/{slug}` exists (hard delete, cascades) but no screen uses it. | Archive/Restore in the list and the Edit dialog, with confirmation and success message. | E |
| 11 | Open | Public page prints `#${rank}` and `Estd. ${established ?? 0}` unconditionally (`college/[slug]/page.tsx`, `[section]/page.tsx`, `layout.tsx`); the title falls back to initials (`shortNameOf`). Approvals chip list renders empty. | Hide rank, established, approvals, fees, etc. when empty; heading per D10. | F |
| 12 | Open, **D1** | No publish state; every saved college is public. | Draft until published (D1/D2). Public lists, sitemap, search, compare and similar all filter to Published. | E |
| 13 | Open | No character rule on `name` in either API model. React escapes on output, so it is not executable today, but it is stored. | Server and client rule (D12). Same helper reused for city/short title. | B |
| 14 | Open | The name is `required` (browser only, no `*`); spaces-only passes the browser check and the slug field complains instead. | Show `*`; trim; message "College name is required" next to the field. | C |
| 15 | Open | Add modal closes on Cancel with no confirmation (the Edit editor has one). | Same discard prompt when the form has input. | C |
| 16 | Open | Same sort tie-break problem as 1; column headers are plain `<th>`. | Stable order; sortable headers (name, location, ownership, stream, courses, rating, added). | D |
| 17 | **Runtime check** | Table is `min-w-[720px]` inside `overflow-x-auto`; Actions is the last column, so it scrolls off at ~980px. | Sticky Actions column, or stack the secondary columns under the name at narrow widths. | D |
| 18 | Open | `StatusMessage` is an in-flow banner that pushes the table down; the list is refreshed by a server revalidate after the dialog closes. | Toast overlay (fixed position); update the row immediately from the saved record, then revalidate. | D |
| 19 | Open | `problemsByTab` reports errors for a blank new row, so three "required" errors show before any input. | Show errors only after the field is touched or Save is pressed. | G |
| 20 | Open | Edit uses a free-text City (`tab-info.tsx`); only Add uses `StateCityFields`. | Use `StateCityFields` in Edit (keeps the "Other, type it" escape for non-district cities). Existing invalid values ("Karnatak") flagged in the data cleanup. | C |
| 21 | Open | `CollegeUpdateBody.coursesOffered` has no lower bound; the list shows whatever is stored (-5). | `ge=0` on the API, display `max(0, n)`, repair stored values (data step). | B |

### 3.2 Data quality (22, 69, 70)

| SL | Verdict | Notes |
|---|---|---|
| 22 | Data | Wrong ownership/stream on seeded colleges (e.g. Delhi University, Christ University). Needs someone to confirm from official sources; I can prepare a list of suspicious rows. |
| 69 | Data | Duplicates (Dream Pharma College ×2) and the same wrong values. Merge with the Archive feature (D1) once it exists. 8 prevents new ones. |
| 70 | Data + code | Exam names like `Common Admission Test(CAT)`. Normalise stored names to `Name (ABBR)` and add a check where exam names are saved. |

### 3.3 Edit College (23–71)

| SL | Verdict | What the code shows | Fix | WP |
|---|---|---|---|---|
| 23, 24 | **Resolved** | Load error and save error states exist (`loadError`, `error` in the footer); not reproducible (tester, P1). | none | n/a |
| 25 | Open | Same as 4. | | B |
| 26 | Open | Typed `-5` passes `Number()` in `RangeField`/`AmountField` and is stored as `₹-5L - 10L`, then not parsed back (inputs look empty). | Minimum 0, with a message; never display an unparsable stored value as empty. | B |
| 27 | Open | See 3. | | B |
| 28 | Open | `ChipInput` adds any typed text; API only checks count. | Exams only from the directory list, in the client and (by name) on the server. Same for programme exams and cut-offs (43). | B |
| 29 | Open | Tags/approvals have a count limit, not a length limit. | 30 characters per tag/approval, with a counter. | B |
| 30 | Open | Masthead renders every approval chip. | Show 4, then "+N more" (expands). | F |
| 31 | Open | Upload message gives both sizes but not which side fails (`image-upload-field.tsx`). | "Height 300 px is below the 520 px minimum." | G |
| 32 | Open, D10 | `shortNameOf` = initials + city when Short title is empty ("QCVC Bengaluru"). | Fall back to the full name. | F |
| 33 | Open | `Labelled` adds a visual `*` only. | Add `required` / `aria-required="true"` to the input for every required field. | G |
| 34 | **Resolved** | Fee inputs have labels (`Total fee range: to`, `: unit`). | none | n/a |
| 35 | Open | Duration is free text. | Number + unit picker (D7); validate. | B |
| 36 | Open | See 26; also the negative fee is "silently dropped" because the amount no longer parses. | Reject with "Fees must be 0 or more". | B |
| 37 | Open | `₹0L` is printed. | 0 shows **Free**; blank allowed for funded programmes. | F |
| 38 | Open | The server's raw message (`courses.0.seats: Input should be greater than or equal to 1`) is shown. | Client check "Programme 1: seats must be at least 1" and a friendly-message mapper for server errors. | B |
| 39 | Open | `lakh()` takes the first number and ignores the unit (LPA vs Cr). | Convert to one unit before comparing. | B |
| 40 | Open | Warning only. | Block Save (D4). | B |
| 41 | Open | `placedPercent` is clamped in `onChange`. | Remove the clamp; "Batch placed must be between 0 and 100". | B |
| 42 | Open | New cut-off starts with `pools.exams[0]` (CAT). | Start empty, or the college's accepted exams as options. | G |
| 43 | Open | Exam is free text; score is free text. | Exam from the list; percentile 0–100, rank/marks numeric (by score type). | B |
| 44 | Open | `Math.max(1, …)` in the rank field changes 0 to 1. | Remove; reject below 1 with a message (and check `admin_rankings.py` does the same on the server). | B |
| 45, 46 | **Resolved** | Several rankings can be added; compare shows "—" when rank is 0 (`fancy-sections.tsx`). | none (public listing and detail still print `#0`, see 11). | n/a |
| 47 | Open, D1 | `get_similar` ignores the editor's pinned `similarSlugs` for the "Similar colleges" card (only the Compare tab uses them) and has no test-record filter. | Use pinned colleges first, then same stream; only Published colleges. | E |
| 48 | Open, D1 | `pools.colleges` lists every college. | Published only (plus the one being edited). | E |
| 49 | **Resolved** | Upload notes are cleared (`setNotes([])`) and not part of validation. | none | n/a |
| 50 | Open | `name: file.name…` fills the caption. | Leave empty. | G |
| 51 | Open | Relative image sources are stripped but an empty `<img>` remains in the rich text. | Drop empty images on save; only uploaded or `https://` images. | G |
| 52 | Open | Ratings are clamped in `onChange`. | Remove the clamps; "Rating must be between 0 and 5" (the tracker says 1–5; the API allows 0–5, see D5). | B |
| 53 | Open | `date` and `batch` unchecked. | D5. | B |
| 54 | Open | `blankReview.approved = true`; API default `True`. | Default false. | G |
| 55 | Open | Message is "write the review"; API minimum is 3. | "Review must be at least 20 characters." (D5) | B |
| 56 | Open | `From ${n} reviews` and `${n} student reviews` (4 places in `college/[slug]`). | A `plural()` helper. | F |
| 57 | Open | `RATIO` allows `0:0`. | Both parts ≥ 1; same in the API pattern. | B |
| 58 | Open | `count` and `phdPercent` are clamped in `onChange`. | Remove; range messages. | B |
| 59 | Open | No cross-check. | Warning when the count is below the listed members. | B |
| 60 | Open | No duplicate check for questions. | Case-insensitive, client and server. | B |
| 61 | Open | `today()` pre-fills alert/article/press dates. | Empty and required (D6). | G |
| 62 | Open | No window. | D6. | B |
| 63 | Open, D9 | Blank article starts with `"Editorial Desk"`; the API also defaults to it. | No default. | G |
| 64 | Open | Preview text is `yoursite.com › college › slug`. | Use the real domain from the site setting/env. | G |
| 65 | Open | `services/college.py` writes `"N/A"` into average/median/highest. | Public page: if no average, show the median as "Median package"; do not print `N/A`. | F |
| 66 | Open | `Top recruiters:` label is always rendered (`page.tsx`). | Hide when the list is empty. | F |
| 67 | **Runtime check** | Tab row is `overflow-x-auto`. | Wrap onto two rows, or "More" menu. | G |
| 68 | Open | Tab text and badge count are read as one word. | `aria-label="Cut-Offs, 1 item"` on the tab; hide the badge from screen readers. | G |
| 71 | Open (likely cause) | The Score `TextInput` has a `max`, which adds a "0/50" counter line under it; with `items-end` the box sits higher than Rank and Ranking list. | Drop the counter (or use `items-start`). Confirm in the app. | G |
| 72 | **Resolved** | Rankings show on the detail page. | none | n/a |

## 4. Proposed work packages (in this order)

| WP | Scope | Items | Needs a migration | Rough size |
|---|---|---|---|---|
| **A** | List order: newest first for admin, stable public order | 1, 16 (backend half) | no | small |
| **B** | One validation layer: shared rules, server and client, no silent changes, friendly messages | 3, 4, 7, 9, 13, 21, 25, 26, 27, 28, 29, 35, 36, 38, 39, 40, 41, 43, 44, 52, 53, 55, 57, 58, 59, 60, 62 | no | large |
| **C** | Add College form: controlled, required markers, discard prompt, duplicate warning, shared lists, State/City in Edit | 5, 6, 8, 14, 15, 20 | no | medium |
| **D** | College list UI: sortable columns, responsive Actions, toast and instant row update | 16 (UI), 17, 18 | no | medium |
| **E** | Status model: Draft / Published / Archived, Archive and Restore, public filters, similar/compare/pools | 10, 12, 47, 48 | **yes** (`status` column, existing rows Published) | medium |
| **F** | Public college page: hide empty values, plurals, approvals "+N", Free, median fallback, headings | 11, 30, 32, 37, 56, 65, 66 | no | medium |
| **G** | Editor polish and accessibility | 19, 31, 33, 42, 50, 51, 54, 61, 63, 64, 67, 68, 71 | no | medium |
| **H** | Data cleanup script (reviewed by you before it runs): negative counts, invalid cities, duplicates, QA records, exam names | 21, 22, 47, 48, 69, 70 | no | small, needs your input |

Each package ends with: a type-check, the existing backend tests (`backend/tests`), new tests for the new validators, and a short list of manual checks mapped to the tracker rows, so the tester can re-run exactly those.

## 5. What I could not confirm from code alone

- 17, 18, 67, 71: layout behaviour at specific widths. I have given the likely cause; the fix will be checked in the browser.
- 22, 69: which of the stored values are wrong needs a human source of truth.
- 23, 24: not reproducible by the tester either, so left as resolved.
- The college admin portal ("submit for approval") uses the same `CollegeRecordEditor`, and `routers/college_requests.py` calls the same `_parse` and `_check` as the admin save, so fixing those once covers both paths.

## 6. Next step

Please review section 2 (the twelve decisions) and the package order. When you reply, I will start with whichever packages you approve. My suggestion is **A, B and C first** (most of the failed rows, no migration), then **E** once D1/D2 are settled.

## 7. Progress (updated 2026-10-23)

Decisions taken: D1 yes (Draft / Published / Archived), D2 platform admins publish, D11 archive the QA records; the rest followed the recommendations in section 2.

| Work package | State | Commit | Items |
|---|---|---|---|
| A: list order | **Done** | 6da7b7e | 1, 16 (order) |
| B: one validation layer | **Done** | 6da7b7e | 3, 4, 7, 9, 13, 21, 25, 26, 27, 28, 29, 35, 36, 38, 39, 40, 41, 43, 44, 52, 53, 55, 57, 58, 59, 60, 62 |
| C: Add College form | **Done** | 6da7b7e | 5, 6, 8, 14, 15, 20 |
| E: status model | **Done**, needs the migration run (`037`) | cf82b9b | 10, 12, 47, 48 |
| F: public college page | **Done** | cc6bec1 | 11, 30, 32, 37, 56, 65, 66 |
| D: list UI | **Done** | 9ca2531 | 16 (sortable), 17, 18 |
| G: editor polish | **Done** | 519c711 | 19, 31, 33, 42, 50, 51, 54, 61, 63, 64, 67, 68, 71 |
| H: data cleanup | **Not started**, needs your database | n/a | 21 (stored values), 22, 47/48 (run the script), 69, 70 |

Notes for the tester:

- **Run the migration** (it runs on API start, or `alembic upgrade head`): existing colleges become Published, so nothing disappears.
- **QA records:** `python -m scripts.archive_test_colleges` lists them; add `--apply` to archive them. Review the list first.
- **Not checked in a browser:** 17 (sticky Actions at ~980px), 18 (floating message), 67 (tab wrap), 71 (Score alignment: the cause was the character counter under the field, now shown only near the limit).
- **Backend tests** for the new rules and the status flow are in `backend/tests` (`test_college_rules.py` needs nothing; `test_college_status.py` needs the seeded database like the existing ones).
- **Existing data may now be refused on save** until corrected (for example a duration written as "abc", a state not in the list, a tag over 30 characters). The message names the programme or field.
- 22, 69, 70 remain data work: someone has to confirm the correct ownership, stream and exam names.
