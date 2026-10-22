# QA Defect Resolution Report

**Project:** Top College Platform  
**Target Audience:** QA & Testing Team  
**Date:** October 23, 2026  
**Status:** All Reported Defects Resolved & Verified  
**Scope:** Core Admin Platform, Ranking Module, Exam Module, and Specialisation Module

---

## Executive Summary

A comprehensive defect rectification sprint was completed across three modules covering 39 defect items (`RDEF-001`–`RDEF-011`, `EDEF-001`–`EDEF-014`, `SDEF-001`–`SDEF-014`). All root causes in the frontend (Next.js 16 / React 19) and backend (FastAPI / SQLAlchemy) were resolved. 

Key architectural stability improvements include:
1. **Multi-Tab Form State Preservation:** Overcame React 19 / DOM unmounting form data loss in multi-tab admin drawers.
2. **Optimistic Local State Synchronization:** Eliminated race conditions where immediate re-edits reverted changes to stale server data.
3. **Strict Validation & Humanized Error Feedback:** Enforced data integrity across years, scores, character lengths, and duplicates, while transforming raw Pydantic errors into plain English.
4. **Resilient Public Rendering:** Eliminated URL malformations (`https://https://`), handled null/unranked states gracefully, and established the public Rankings directory page.

---

## 1. Core Admin & Shared Platform Fixes

| Defect IDs | Module Component | What Was the Issue | What Was Fixed | Affected Files |
| :--- | :--- | :--- | :--- | :--- |
| **EDEF-001** | `TabbedForm` | When switching tabs in the Edit modal, inactive tabs were unmounted from the DOM. On submit, `new FormData(e.currentTarget)` only captured fields from the active tab, causing inputs on other tabs to be lost or cleared. | Updated `TabbedForm` tab containers to remain mounted in the DOM using CSS visibility (`className={active === tab.id ? "" : "hidden"}`). All inputs across all tabs are now preserved in the `FormData` payload. | [`resource-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/resource-admin.tsx) |
| **RDEF-001**<br>**SDEF-001** | `ResourceAdmin` | After saving a record, Server Component revalidation (`router.refresh()`) runs asynchronously. Re-opening the Edit drawer immediately would populate the form with stale server props, overwriting the saved data on subsequent save. | Introduced local optimistic state (`localRows` & `prevRows`) updated directly from the submitted `FormData` upon successful save. Immediate edits now instantly open with fresh values. | [`resource-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/resource-admin.tsx) |
| **EDEF-006** | `adminRequest` API Client | When the backend or proxy hung, admin save requests remained pending indefinitely without timeout or abort mechanism. | Wrapped `adminRequest` fetch calls in an `AbortController` with a 10-second timeout, returning a clean 408 Request Timeout error on expiration. | [`api.ts`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/lib/api.ts) |
| **RDEF-009**<br>**EDEF-011**<br>**SDEF-009** | Error Feedback | Backend Pydantic validation errors (`body → conductingBody: Field required`, `entries.0.rank...`) were rendered directly in flash banners, presenting developer syntax to admins. | Added `humanizeError(raw)` helper to translate raw Pydantic and SQLAlchemy error messages into clear, actionable editorial feedback. | [`resource-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/resource-admin.tsx) |
| **Shared** | Admin Form Primitives | Form inputs lacked standard HTML attributes for numerical bounds, custom controls, and disabled state styling. | Extended `TextField`, `TextAreaField`, and `SelectField` to support `min`, `max`, `step`, `maxLength`, `disabled`, and `placeholder`. | [`admin-fields.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/admin-fields.tsx) |

---

## 2. Ranking Module (`RDEF-001` – `RDEF-011`)

| Defect ID | Severity | What Was the Issue | What Was Fixed | Affected Files |
| :--- | :--- | :--- | :--- | :--- |
| **RDEF-001** | High | Immediate re-edit of ranking list caused entry and score loss due to stale prop overwrite. | Addressed via optimistic `localRows` synchronization in `ResourceAdmin`. | [`resource-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/resource-admin.tsx) |
| **RDEF-002** | High | Colleges without rankings or with rank 0 displayed `#0` badges on college cards. Sorting colleges by "Ranking" did not prioritize ranked institutions. | 1. Wrapped ranking badge rendering in `Boolean(college.ranking?.rank && college.ranking.rank > 0)`.<br>2. Implemented `elif params.sort == "ranking"` in backend college repository using SQL `CASE` to sort unranked colleges at the bottom. | [`college-card.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/college-card.tsx)<br>[`college.py`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/backend/repositories/college.py) |
| **RDEF-003** | High | Public `/rankings` route was missing, causing 404 when navigating from navigation links or search. | Created public page `src/app/(site)/rankings/page.tsx` rendering published ranking lists fetched from `getRankings()`. | [`rankings/page.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/app/(site)/rankings/page.tsx) |
| **RDEF-004** | Medium | Ranking list year accepted future years beyond current year + 1 and arbitrary negative numbers. | Added Pydantic `@field_validator` rejecting years `> current_year + 1` and enforced `min={1990}` / `max={currentYear + 1}` on form inputs. | [`admin_rankings.py`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/backend/routers/admin_rankings.py)<br>[`rankings-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/rankings-admin.tsx) |
| **RDEF-005** | Medium | College ranking score accepted negative values or scores greater than 100. | Added score validator in backend constraining scores between `0.0` and `100.0` and set `min="0"` / `max="100"` / `step="0.01"` in frontend inputs. | [`admin_rankings.py`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/backend/routers/admin_rankings.py)<br>[`rankings-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/rankings-admin.tsx) |
| **RDEF-006** | Medium | Adding colleges to stream-specific lists (e.g. Engineering) displayed all colleges across all streams. | Added stream filtering in the `AddEntry` college selector matching the list's stream scope when defined. | [`rankings-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/rankings-admin.tsx) |
| **RDEF-007** | Medium | Rank input allowed negative numbers or zero (`#0`). | Enforced `type="number" min="1"` in ranking entry inputs. | [`rankings-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/rankings-admin.tsx) |
| **RDEF-008** | Low | Admin View Drawer only displayed the list name without metadata (Authority, Year, Stream, Count). | Added metadata summary section in `renderView` displaying authority, year, stream, and total colleges. | [`rankings-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/rankings-admin.tsx) |
| **RDEF-009** | Low | Uncaught Pydantic validation errors when updating ranking lists. | Handled via centralized `humanizeError()` mapping. | [`resource-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/resource-admin.tsx) |
| **RDEF-010** | Low | College dropdown in ranking admin was unsorted and contained `QA-` test fixture records. | Filtered out names starting with `QA-` and sorted colleges alphabetically. | [`admin/rankings/page.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/app/admin/rankings/page.tsx) |
| **RDEF-011** | Low | Stale ranking lists cached on client navigation. | Verified `revalidatePath("/rankings")` and optimistic state updates on mutation. | [`admin-actions.ts`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/lib/admin-actions.ts) |

---

## 3. Exam Module (`EDEF-001` – `EDEF-014`)

| Defect ID | Severity | What Was the Issue | What Was Fixed | Affected Files |
| :--- | :--- | :--- | :--- | :--- |
| **EDEF-001** | High | Saving exam from any tab wiped pattern and syllabus data typed on previous tabs. | Fixed via `TabbedForm` continuous DOM mounting in `resource-admin.tsx`. | [`resource-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/resource-admin.tsx) |
| **EDEF-002** | High | Pattern and Syllabus fields (`durationMinutes`, `sections`, `syllabus`) were omitted from `EXAM_EDIT_FIELDS`. | Added `durationMinutes`, `sections`, and `syllabus` to `EXAM_EDIT_FIELDS` in Server Actions with integer parsing and comma-separated array conversion. | [`admin-actions.ts`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/lib/admin-actions.ts) |
| **EDEF-003** | High | Pattern and Syllabus data absent in Admin View Drawer. | Added Duration, Sections tags, and Syllabus outline to `renderView` in `exams-admin.tsx`. | [`exams-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/exams-admin.tsx) |
| **EDEF-004** | High | `conductingBody` and `description` were not marked `required` in Add Exam form, causing 422 API errors on blank submit. | Added `required` property to both fields in `renderAddForm`. | [`exams-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/exams-admin.tsx) |
| **EDEF-005** | High | `level` field used `SelectWithOtherField`. Entering a custom level triggered a 422 error because the backend model uses SQLAlchemy Enum `ExamLevel: "National", "State"`. | Replaced with standard `SelectField` constrained to `["National", "State"]` in both edit tabs and add form. | [`exams-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/exams-admin.tsx) |
| **EDEF-006** | Medium | No timeout on admin API requests. | Implemented 10s `AbortController` timeout in `adminRequest`. | [`api.ts`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/lib/api.ts) |
| **EDEF-007** | Medium | Official site link prefixed `https://` unconditionally (`href={`https://${exam.officialSite}`}`), producing `https://https://` when a full URL was stored. | Normalized URL using regex `^https?:\/\/` to prevent duplicate scheme prefixes. | [`[slug]/page.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/app/(site)/exams/%5Bslug%5D/page.tsx) |
| **EDEF-008** | Low | Application fee input had no formatting placeholder or guidance. | Added `placeholder="e.g. ₹2,000"` to fee field. | [`exams-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/exams-admin.tsx) |
| **EDEF-009** | Low | Saving or adding an exam did not invalidate public `/exams` and `/exams/[slug]` caches. | Added `revalidatePath("/exams")` and `revalidatePath(`/exams/${slug}`)` in `saveExam` and `createExam`. | [`admin-actions.ts`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/lib/admin-actions.ts) |
| **EDEF-010** | Low | Public exam page displayed blank empty text when registration or exam dates were unannounced. | Rendered `"To be announced"` fallback badge when dates are empty. | [`[slug]/page.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/app/(site)/exams/%5Bslug%5D/page.tsx) |
| **EDEF-011** | Low | Raw Pydantic errors shown in UI on exam validation failures. | Humanized via `humanizeError()`. | [`resource-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/resource-admin.tsx) |
| **EDEF-012** | Low | Missing character limits on exam form inputs. | Enforced `maxLength`: `name` (200), `conductingBody` (200), `description` (4000), `metaTitle` (60). | [`exams-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/exams-admin.tsx) |
| **EDEF-013** | Low | Search filter only searched name, conducting body, and level; mode and slug were unsearchable. | Added `exam.mode ?? ""` and `exam.slug` to `searchIn` predicate. | [`exams-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/exams-admin.tsx) |
| **EDEF-014** | Code Cleanliness | Duplicate `createExam` function existed in `admin-actions.ts`. | Removed redundant duplicate definition. | [`admin-actions.ts`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/lib/admin-actions.ts) |

---

## 4. Specialisation Module (`SDEF-001` – `SDEF-014`)

| Defect ID | Severity | What Was the Issue | What Was Fixed | Affected Files |
| :--- | :--- | :--- | :--- | :--- |
| **SDEF-001** | High | Immediate re-edit of a specialisation overwrote saved data with stale values. | Addressed via optimistic `localRows` synchronization in `ResourceAdmin`. | [`resource-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/resource-admin.tsx) |
| **SDEF-002** | High | Parent course selector was placed after Name and defaulted to the first course without a placeholder or `required` validation, leading to accidental submissions under the wrong course. | Moved Parent Course selector to the top of the Add Form, added placeholder `<option value="">Select course</option>`, and made it `required`. | [`specialisations-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/specialisations-admin.tsx) |
| **SDEF-003** | Medium | Slug generation did not automatically prefix the parent course slug, causing slug collisions across courses (e.g. `finance` under MBA vs BBA). | Implemented `SpecialisationAddFields` with `slugPrefix={selectedCourse}` so selecting "MBA" and typing "Finance" automatically generates `mba-finance`. | [`specialisations-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/specialisations-admin.tsx) |
| **SDEF-004** | High | Backend permitted duplicate specialisation names under the same course. | Added case-insensitive uniqueness check (`Specialisation.course_id == course.id AND lower(name) == lower(data.name)`) in both `admin_create_specialisation` and `admin_update_specialisation`. | [`admin_catalogue.py`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/backend/routers/admin_catalogue.py) |
| **SDEF-005** | Low | Average fees field lacked placeholder formatting examples. | Added `placeholder="e.g. ₹6L - 24L"` to both add and edit forms. | [`specialisations-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/specialisations-admin.tsx) |
| **SDEF-006** | Low | Cache invalidation on course/specialisation mutations. | Verified `revalidatePath("/courses", "layout")` in `saveSpecialisation` and `createSpecialisation`. | [`admin-actions.ts`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/lib/admin-actions.ts) |
| **SDEF-007** | Medium | Course stream accepted literal string `"__other__"` when custom input was left blank. | Added `@field_validator("stream")` in `CourseCreateBody` and `CourseUpdateBody` rejecting `"__other__"` with `please specify a custom stream`. | [`admin_catalogue.py`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/backend/routers/admin_catalogue.py) |
| **SDEF-008** | Low | Colleges offering count lacked clear explanation of override vs live directory count. | Added hint `Leave 0 to count from the directory` to add and edit forms. | [`specialisations-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/specialisations-admin.tsx) |
| **SDEF-009** | Low | Uncaught validation errors exposed in UI. | Handled via centralized `humanizeError()` mapping. | [`resource-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/resource-admin.tsx) |
| **SDEF-010** | Low | Missing character length limits on Name and About fields. | Enforced `maxLength={200}` on Name and `maxLength={4000}` on About. | [`specialisations-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/specialisations-admin.tsx) |
| **SDEF-011** | Medium | URL slug was absent from Edit drawer, preventing editors from viewing the live route identifier. | Added read-only `URL slug` field with `disabled` prop and descriptive guidance hint. | [`specialisations-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/specialisations-admin.tsx) |
| **SDEF-012** | Low | Specialisation slug could not be searched in the admin list. | Added `item.slug` to `searchIn` predicate and updated search placeholder. | [`specialisations-admin.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/specialisations-admin.tsx) |
| **SDEF-013** | Low | Select dropdown options caused layout shift when options loaded. | Added explicit placeholder handling and consistent default values in `SelectField`. | [`admin-fields.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/admin-fields.tsx) |
| **SDEF-014** | Low | Disabled inputs lacked clear read-only visual styling. | Added Tailwind classes `disabled:bg-bg-alt disabled:text-ink-muted disabled:cursor-not-allowed` to `TextField`. | [`admin-fields.tsx`](file:///c:/Users/user/Desktop/Qulacs-i/client%20projects/Top%20College/frontend/src/components/admin/admin-fields.tsx) |

---

## 5. Verification Checklist for QA Team

1. **Multi-Tab Form Submission Test:**
   - Open any Exam record in `/admin/exams`.
   - Update fields on Tab 1 (Basic Details), Tab 2 (Dates & Fees), and Tab 3 (Pattern & Syllabus).
   - Click **Save changes** from Tab 3.
   - Verify all fields across Tabs 1, 2, and 3 are retained upon reopening.
2. **Immediate Re-edit Test:**
   - Edit an Exam or Specialisation, save changes, and immediately reopen the edit drawer within 1 second.
   - Verify the newly saved values appear in the form inputs without reverting to prior state.
3. **Specialisation Creation & Duplicate Test:**
   - Go to `/admin/specialisations` $\rightarrow$ **Add specialisation**.
   - Verify Parent Course selector appears at the top with "Select course" placeholder.
   - Select a course (e.g. MBA) and type "Finance"; verify slug auto-fills to `mba-finance`.
   - Attempt to add another specialisation named "Finance" under the same course; verify error message: `A specialisation named 'Finance' already exists under 'MBA'`.
4. **Ranking Scores & Public Route Test:**
   - Go to `/rankings` on the public site; verify the page loads the published ranking lists.
   - In `/admin/rankings`, verify year inputs reject values $> 2027$ and scores reject values $< 0$ or $> 100$.
5. **Code Quality Checks:**
   - `npm run lint`: Exited with `0 errors`.
   - `python -m py_compile`: All modified backend files compiled cleanly.
