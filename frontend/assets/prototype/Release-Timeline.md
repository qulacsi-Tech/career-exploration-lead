# College Discovery Platform — Release Timeline

**Work week:** Monday–Thursday only (4-day work week). Friday, Saturday and Sunday are non-working days.
**Start date:** 20 Aug 2026 (Thursday)
**Projected finish:** 9 Dec 2026 — **~16 weeks (111 calendar days)**

> **Note on duration:** at a strict 4-day work week, this scope runs to ~16 weeks, not 2 months — a 4-day week has roughly 43% fewer working hours per calendar week than a standard 5-day week, and that stretch compounds across 36 tasks. If a 2-month delivery needs to stay on the table, the two ways back to it are: (a) move to a standard Mon–Fri week, or (b) keep Mon–Thu but run UI, backend and integration work in parallel with separate people per track instead of sequential phases. Flagging this now rather than after the client has a date in hand.

This covers everything remaining in the client brief, starting from tech stack and environment setup. The three screens already built (Home, College Listing, College Detail) are not listed below.

---

## Phase Summary

| Phase | Focus | Dates | Working Days |
|---|---|---|---|
| 1 | Setup & UI Completion — tech stack, environment, and every remaining screen | 20 Aug – 7 Oct | ~7 weeks |
| 2 | Backend & Core APIs | 7 Oct – 2 Nov | ~4 weeks |
| 3 | Integrations (frontend↔backend, search, leads, SEO tooling) | 2 Nov – 26 Nov | ~3.5 weeks |
| 4 | Final Testing, SEO Audit & Launch | 26 Nov – 9 Dec | ~2 weeks |

---

## Full Task Breakdown

| # | Phase | Track | Task / Screen | Start | End | Duration (working days) | Notes |
|---|---|---|---|---|---|---|---|
| 1 | 1 | Setup | Tech Stack Setup | 20 Aug | 24 Aug | 1 | Confirm frameworks, repo structure, dependencies |
| 2 | 1 | Setup | Environment Setup | 24 Aug | 25 Aug | 1 | .env config, Docker Compose (Postgres + Meilisearch), local dev bootstrap |
| 3 | 1 | UI | Course Detail Page | 25 Aug | 27 Aug | 2 | Per client page architecture |
| 4 | 1 | UI | Specialisation Page | 27 Aug | 1 Sep | 2 | |
| 5 | 1 | UI | Entrance Exam Pages (listing + detail) | 1 Sep | 7 Sep | 3 | |
| 6 | 1 | UI | Ranking Page | 7 Sep | 9 Sep | 2 | |
| 7 | 1 | UI | Comparison Page | 9 Sep | 14 Sep | 2 | Compare 3–4 colleges side by side |
| 8 | 1 | UI | Location Hub Page | 14 Sep | 16 Sep | 2 | e.g. `/mba/colleges-in-bangalore` |
| 9 | 1 | UI | Static Pages | 16 Sep | 21 Sep | 2 | About, Contact, Privacy Policy, Terms |
| 10 | 1 | UI | Review Page | 21 Sep | 23 Sep | 2 | Listing + write-a-review flow |
| 11 | 1 | UI | Article / News Page | 23 Sep | 28 Sep | 2 | Listing + detail |
| 12 | 1 | UI | Question & Answer Page | 28 Sep | 30 Sep | 2 | |
| 13 | 1 | UI | Event Page | 30 Sep | 1 Oct | 1 | |
| 14 | 1 | UI | Auth Screens (Login, Register, OTP) | 25 Aug | 27 Aug | 2 | Runs in parallel with UI screens above |
| 15 | 1 | UI | Enquiry / Callback / Brochure-download Forms | 27 Aug | 1 Sep | 2 | Runs in parallel |
| 16 | 1 | UI | Admin Panel Screens | 25 Aug | 7 Sep | 7 | Dashboard, CRUD, SEO tab, moderation, leads inbox — runs in parallel |
| 17 | 1 | QA | UI / Responsive Testing | 1 Oct | 7 Oct | 3 | All screens — desktop, tablet, mobile, cross-browser |
| 18 | 2 | Backend | Database Schema & Models | 7 Oct | 12 Oct | 2 | |
| 19 | 2 | Backend | Auth API | 12 Oct | 14 Oct | 2 | JWT + OTP — runs in parallel with Core CRUD APIs |
| 20 | 2 | Backend | Core CRUD APIs | 12 Oct | 20 Oct | 5 | College, Course, Specialisation, Exam, Ranking, Location |
| 21 | 2 | Backend | Admin APIs | 20 Oct | 26 Oct | 3 | Content management, SEO fields, JSON-LD, role-based access |
| 22 | 2 | Backend | Lead Capture API | 26 Oct | 27 Oct | 1 | Runs in parallel |
| 23 | 2 | Backend | Search Indexing | 26 Oct | 28 Oct | 2 | Autocomplete + filters (Meilisearch sync) — runs in parallel |
| 24 | 2 | Backend | SEO Infrastructure | 26 Oct | 29 Oct | 3 | Sitemaps, canonical/robots, redirect manager, IndexNow |
| 25 | 2 | QA | Backend / API Testing | 29 Oct | 2 Nov | 1 | |
| 26 | 3 | Integration | Frontend ↔ Live API Wiring | 2 Nov | 9 Nov | 4 | Replace mock data across all screens |
| 27 | 3 | Integration | Admin Panel — Live Wiring | 9 Nov | 12 Nov | 3 | Runs in parallel |
| 28 | 3 | Integration | Auth / OTP End-to-End | 9 Nov | 11 Nov | 2 | Signup, login, review verification |
| 29 | 3 | Integration | Search & Filters Live | 11 Nov | 16 Nov | 2 | Autocomplete, faceted filters, comparison |
| 30 | 3 | Integration | WhatsApp, Email & CRM Integration | 16 Nov | 19 Nov | 3 | Fires on every new lead |
| 31 | 3 | Integration | Search Console / Bing / IndexNow Setup | 19 Nov | 23 Nov | 1 | |
| 32 | 3 | QA | Full Integration Testing | 23 Nov | 26 Nov | 3 | End-to-end user flows |
| 33 | 4 | QA | Full Regression Testing | 26 Nov | 2 Dec | 3 | All phases combined |
| 34 | 4 | QA | SEO & Performance Audit | 2 Dec | 3 Dec | 1 | Lighthouse, sitemap crawl, canonical/robots check |
| 35 | 4 | QA | UAT with Client / Sign-off | 3 Dec | 8 Dec | 2 | |
| 36 | 4 | Launch | Bug Fixes + Go-Live | 8 Dec | 9 Dec | 1 | |

---

## How to read the "Track" column

- **Setup** — tech stack and environment, before any screens are built
- **UI** — frontend screens (Next.js)
- **Backend** — API, database, auth
- **Integration** — connecting frontend, backend, search, and third-party services
- **QA** — testing pass closing out that phase
- **Launch** — final release step

Tasks marked "runs in parallel" overlap with the task above them — those lanes need a separate person/sub-team to actually run alongside the main track; otherwise they queue up sequentially and the timeline stretches further.
