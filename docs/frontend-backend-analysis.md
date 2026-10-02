# Frontend → Backend Analysis

## Project: CollegeTime — College Discovery Platform

---

## Technology Stack (Frontend)

| Item | Detail |
|---|---|
| Framework | Next.js 16.3.1 (App Router, Server Components) |
| React | 19.2.8 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Fonts | Sora (display), Inter (body) via next/font/google |
| Data | All from `src/lib/mock-data.ts` — no live API calls yet |

---

## Routes / Pages

### 1. Home Page — `/`

**Purpose:** Landing page. Showcases the platform. Entry point for discovery.

**Sections:**
- Hero with search form (`action="/search"`, `name="q"`)
- Browse by Location (carousel of cities)
- Explore Your Future (stream grid with college counts)
- Top Colleges (tab-filtered grid of college cards)
- Top Exams (tab-filtered grid of exam cards)
- Recommended Colleges/Programs
- Explore Careers (career panels)
- Recommended Universities
- Data Highlights
- Latest News & Articles

**Data consumed:**
- `colleges[]` — name, slug, city, state, ownership, stream, ranking, rating, reviewCount, coursesOffered, feesRange, examsAccepted, tags, courses[0]
- `exams[]` — slug, name, conductingBody, level, description, registrationCloses, examDate
- `locations[]` — slug, name, collegeCount
- `articles[]` — slug, title, excerpt, date
- `recommendedPrograms[]` — slug, name, university, universitySlug, online{duration,fees,feesNote}, onCampus{duration,fees}
- `careerPanels[]` — title, viewAllHref, links[]
- `recommendedUniversities[]` — slug, name, city, state
- `dataHighlights[]` — slug, title, description, links[]

**API requirements:**
- `GET /api/v1/home` — aggregated home data OR separate calls:
  - `GET /api/v1/colleges?featured=true&limit=6`
  - `GET /api/v1/exams?featured=true&limit=6`
  - `GET /api/v1/locations`
  - `GET /api/v1/articles?limit=3`
  - `GET /api/v1/programs/recommended?limit=3`

**Authentication:** None (public)
**Pagination:** None (fixed limits)

---

### 2. Colleges Listing Page — `/colleges`

**Purpose:** Browse + filter colleges. Entry point for college discovery.

**Inputs (query params):**
- `page` (pagination)
- Filter checkboxes: location, course, specialisation, fees, approval, ranking, examAccepted, modeOfStudy, ownership
- Sort: Popularity | Top Rated | Most Viewed

**Data displayed:**
- College list (CollegeCard): name, slug, city, state, ownership, ranking{authority,rank}, rating, reviewCount, coursesOffered, feesRange, examsAccepted
- Total result count
- Filter groups with options
- Right rail: budget chips, admission deadlines, most preferred locations

**API requirements:**
- `GET /api/v1/colleges` with query params:
  - `page`, `limit`
  - `city`, `course`, `specialisation`, `fees_min`, `fees_max`, `approval`, `ranking_max`, `exam`, `mode`, `ownership`
  - `sort` (popularity | rating | views)
- Response: `{ data: College[], total: number, page: number, limit: number, pages: number }`

**Authentication:** None (public)
**Pagination:** Yes — cursor/offset, shown as pages 1/2/3

---

### 3. College Detail Page — `/college/[slug]`

**Purpose:** Full profile of a single college.

**Sections:**
- Header: name, city, state, ownership, established, ranking, approvals, tags
- About
- Student Ratings breakdown (Placements, Faculty, Infrastructure, Campus Life)
- Courses & Fees table
- Cutoffs
- Placements (average, median, highest, top recruiters)
- Student Reviews (author, course, batch, verified, date, rating, body)
- Sidebar: Quick Facts, Get a Callback form, Contact Information
- Related colleges (3 similar)

**Forms:**
- Get a Callback: `name` (required), `mobile` (required, tel) → **Lead capture**
- Download Brochure → links to `/enquiry`
- Apply Now → links to `/enquiry`
- Write a Review → `#` (future)

**API requirements:**
- `GET /api/v1/colleges/:slug` → full College object
- `GET /api/v1/colleges/:slug/related?limit=3`
- `POST /api/v1/leads` — `{ name, phone, collegeSlug, type: "callback" }`

**Authentication:** None for GET; lead capture is public
**generateStaticParams:** Uses `colleges[]` slugs — must be available at build time

---

### 4. Search — `/search?q=...`

**Purpose:** Full-text search across colleges, courses, exams, locations.

**Input:** `q` (query string)

**API requirements:**
- `GET /api/v1/search?q=...&type=college|exam|course|location`
- Powered by Meilisearch (already in docker-compose)

**Authentication:** None (public)

---

### 5. Login/Register — `/login`

**Purpose:** User authentication. Referenced in site header.

**Planned flows (from proposal & timeline):**
- Register with email + password
- Login with email + password → JWT
- OTP verification (phone/email)

**API requirements:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/otp/send`
- `POST /api/v1/auth/otp/verify`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

---

### 6. Enquiry / Lead Forms — `/enquiry`

**Purpose:** Central counselling/enquiry/callback forms. Linked from college detail (Apply Now, Download Brochure).

**Forms referenced:**
- Get a Callback (college detail sidebar)
- Get Free Counselling (colleges listing header)
- Newsletter subscribe (footer email input)

**API requirements:**
- `POST /api/v1/leads` — `{ name, phone, email?, collegeSlug?, type: "callback"|"counselling"|"brochure"|"enquiry" }`
- `POST /api/v1/newsletter/subscribe` — `{ email }`

---

### 7. Exams — `/exams`, `/exams/[slug]` (implied by TopExamCard links)

**Purpose:** Exam discovery and detail.

**API requirements:**
- `GET /api/v1/exams` — list with filters
- `GET /api/v1/exams/:slug` — full exam detail
- `GET /api/v1/exams/:slug/cutoff`
- `GET /api/v1/exams/:slug/answer-key`

---

### 8. Location — `/location/[slug]` (implied by LocationCarousel)

**Purpose:** Colleges in a specific city/state.

**API requirements:**
- `GET /api/v1/locations/:slug` — `{ name, collegeCount, colleges[] }`

---

### 9. Stream — `/{stream}/colleges`, `/{stream}/exams`, `/{stream}/careers`

**Purpose:** Filter colleges/exams by stream (Management, Engineering, Medical, etc.)

**API requirements:**
- Handled by query param: `GET /api/v1/colleges?stream=management`
- `GET /api/v1/exams?stream=management`

---

### 10. Articles — `/articles`, `/articles/[slug]`

**Purpose:** News and updates.

**API requirements:**
- `GET /api/v1/articles?limit=N`
- `GET /api/v1/articles/:slug`

---

## Mock Data Types → Backend Entities

| Frontend Type | Backend Entity | Notes |
|---|---|---|
| `College` | `colleges` table | Central entity |
| `Exam` | `exams` table | |
| `RecommendedProgram` | `programs` table | Links to college |
| `CareerPanel` | `career_panels` + `career_panel_links` | CMS-managed |
| `DataHighlight` | `data_highlights` + `data_highlight_links` | CMS-managed |
| `College.courses[]` | `courses` table | FK → college |
| `College.placement` | `placements` table | FK → college, year |
| `College.cutoffs[]` | `cutoffs` table | FK → college |
| `College.reviews[]` | `reviews` table | FK → college + user |
| `College.ratingBreakdown[]` | computed from reviews | Or materialized |
| `locations[]` | `locations` table | city + state |
| `articles[]` | `articles` table | |

---

## Authentication Requirements

- Header has Login/Register button → `/login`
- No auth-gated pages in current frontend
- Reviews require author info (future: verified badge = OTP-verified user)
- Lead capture is public (no auth)
- Admin panel (referenced in proposal/timeline) requires ADMIN role

**Roles needed:**
- `VISITOR` (anonymous) — can browse, search, submit leads
- `USER` (registered) — can write reviews, shortlist colleges
- `ADMIN` — can manage all content via admin APIs

---

## Forms Summary

| Form | Location | Fields | Backend |
|---|---|---|---|
| Search | Hero + Header | `q` | `GET /api/v1/search?q=` |
| Get a Callback | College detail sidebar | name, phone | `POST /api/v1/leads` |
| Newsletter Subscribe | Footer | email | `POST /api/v1/newsletter/subscribe` |
| Get Free Counselling | Colleges listing | implicit | `POST /api/v1/leads` |

---

## SEO / SSR Notes

- All pages are **Server Components** — data must be fetchable at request time (or build time for static params)
- `generateStaticParams` used on `/college/[slug]` — slugs must be available from API at build time
- Meta tags via `generateMetadata` use college `name` and `about`
- Search results must be SSR-compatible (query params → server fetch)

---

## No Existing API Calls

All data currently comes directly from `src/lib/mock-data.ts`. There are **zero live API calls** in the frontend today. The entire integration task is to replace mock-data imports with `fetch()` calls to the FastAPI backend.
