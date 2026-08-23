# College Discovery Platform
### Approach & Delivery Plan

A dynamic, search-optimised website for college, course and exam discovery — with a full content team behind it, moderated reviews, and lead capture built in from day one.

| | |
|---|---|
| **Prepared by** | Abhishek |
| **Prepared for** | Client review |
| **Date** | 19 August 2026 |
| **Status** | For discussion |

---

## 01 — Approach

### Built to be found, not just built to look good

The brief covers a lot of ground — a full college/course/exam directory, search and filtering, reviews, an admin team that can run the whole thing, and strong SEO. The approach below is organised around one priority: every one of those pieces needs to be visible to Google from the day it's published, and manageable by your content team without touching code.

Concretely, that means the site is **rendered on the server** rather than assembled in the visitor's browser — so a search engine (or an AI answer engine) sees the full page immediately, the same way a person does. Content — colleges, courses, exams, articles — lives in one central system that your team edits directly, and every page pulls from it automatically. Nothing about ranking on Google should ever require a developer.

---

## 02 — Architecture

### How the pieces fit together

Four parts, each doing one job well.

**Public Website**
What visitors and search engines see. College, course and exam pages load pre-built and instant; search results are generated fresh per request so filters stay linkable and indexable.

**Content Engine**
The single source of truth for every college, course, exam, review and article. The admin panel and the public site both read from here — one place, always in sync.

*— connected by a private API —*

**Search & Filters**
A dedicated search index kept in step with the content engine, purpose-built for instant, typo-tolerant autocomplete and multi-filter results across tens of thousands of listings.

**Admin Panel**
Where your team manages everything end to end — content, SEO fields, reviews, leads — with no engineering involvement needed for day-to-day updates.

---

## 03 — Capabilities

### What the platform does out of the box

**Discovery**
- **Search & filters** — Autocomplete across colleges, courses, exams and locations, plus faceted filters for fees, ranking, approval, mode of study and more.
- **Compare & shortlist** — Side-by-side comparison of three or four colleges, save/shortlist, recently viewed, and recommendations tailored to the visitor.

**Trust**
- **Verified reviews** — Ratings broken out by placements, faculty, infrastructure and campus life, gated by OTP verification, with a moderation queue before anything goes live.
- **Q&A** — Student questions with expert or community answers, moderated the same way as reviews.

**Growth**
- **Lead capture** — Enquiry, brochure-download and callback forms on every relevant page, feeding a central leads inbox, with WhatsApp, email and CRM integration on every new lead.
- **Alerts** — Admission and exam-date notifications for shortlisted colleges.
- **Predictors** — Rank, admission-chance and college predictors, as a later-stage addition once the core directory is live.

**Visibility**
- **Search-engine ready** — Clean permanent URLs, self-referencing canonicals, auto-updating sitemaps, and instant indexing pings whenever new content is published.
- **Structured data** — Every college, course and review page carries the structured markup that lets Google — and AI answer engines — understand and quote it correctly.

**Control**
- **Full admin CMS** — Every entity in the system — colleges, fees, faculty, rankings, scholarships, articles — is editable by your team, with per-page SEO fields built into every edit screen.

---

## 04 — Key decisions

### Choices made, and why

**Rendering approach**
Server-rendered / statically generated pages (Next.js) rather than a purely client-side site.
**Why:** it's the most reliable way to guarantee search engines and AI answer engines see full page content immediately, which the brief calls out explicitly.

**Content system**
One central content engine (FastAPI + PostgreSQL) driving both the public site and the admin panel.
**Why:** a single source of truth means content, SEO fields and moderation state can never drift out of sync between what admins edit and what visitors see.

**Lead handling**
This platform owns its lead data and admin inbox directly, with WhatsApp, email and CRM integration firing off every new lead.
**Why:** matches the brief's lead-management requirement exactly — one inbox your team works from, with outbound notifications wired straight off it, no separate system to reconcile.

**Delivery model**
A phased roadmap that sequences the brief's own requirements — nothing added, nothing dropped.
**Why:** the brief marks only one item as "later-stage" (predictors) — everything else ships as part of the first two phases; phasing exists purely to get a working, indexable site live sooner.

---

## 05 — Roadmap

### Three phases to full scope

Each phase ships a usable, live product — not a partial preview — before moving to the next.

#### Phase 1 — Core site, live and indexable
**A live, search-optimised directory**

The core site goes live: browsable and searchable, fully indexable, with the admin team able to publish and manage content independently.

- College, course, specialisation, exam, ranking & location pages
- Static pages (Home, About, Contact, Privacy Policy)
- Search + autocomplete + full filter set
- Enquiry, counselling, callback forms & brochure downloads
- Admin CMS for all core content, with SEO fields on every entity
- Leads inbox
- Full SEO build-out: URLs, canonicals, sitemaps, redirects, breadcrumbs, Search Console / Bing / IndexNow
- AI- and answer-engine-friendly markup across every page
- Security & reliability baseline

#### Phase 2 — Comparison, accounts, reviews & content
**The rest of the brief, in full**

Every remaining requirement from the brief that isn't marked later-stage: comparison, accounts, reviews, and the full content library.

- Comparison, review, article, question & event pages
- Save/shortlist, recently viewed, recommendations
- Admission & exam-date alerts
- WhatsApp, email & CRM integration on every lead
- Verified reviews & ratings, moderation, abuse reporting
- Questions & expert answers
- Scholarships, faculty, facilities, galleries & video admin modules
- Image & video sitemaps

#### Phase 3 — Predictors
**The one item the brief itself marks later-stage**

- Rank, admission-chance and college predictors

---

## 06 — Next steps

### To get started

1. **Sign off on this approach and the Phase 1 scope** — confirms what ships in the first live release.
2. **Confirm the content source** — whether college/course/exam data already exists to migrate, or needs to be gathered fresh for the first batch of listings.
3. **Set up the technical foundation** — the website, content engine and admin panel scaffolding, so the team is building on real infrastructure from day one.
4. **Build and publish the first live pages** — a working slice (college listing + college detail) end to end, to validate the approach before scaling to the full catalogue.

---

*College Discovery Platform — Approach & Delivery Plan*
*Prepared 19 August 2026*
