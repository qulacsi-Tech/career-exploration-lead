# User accounts, lead capture and visitor activity tracking: implementation plan

**Date:** 2026-10-17
**Scope:** student login (email and Google), the user profile, leads, and a record of who visited the site and what they clicked.
**Status:** Phases 1 to 3 and most of 4 are built (the CSV export of leads is not), but not yet run end to end against a database: student login and Google, lead capture and replies, account tabs, visitor and click tracking with a consent banner, and the admin views (visitor analytics, users, lead journey). Phase 5 (password reset and email verification, login lockout, OTP, optional GA4) is not started.

---

## 1. What we want

1. A visitor can sign up and log in with email and password, or with Google.
2. A logged-in student has a profile (phone, city, stream, exam, and so on) that fills in leads for them.
3. Every lead is linked to the user when there is one, and carries where it came from (page, college, button).
4. We record who came to the site and what they clicked, for both anonymous and logged-in visitors. When an anonymous visitor later signs up or submits a lead, their earlier activity attaches to that person.
5. The admin can open a lead or a user and see their full journey, and see aggregate funnels.

---

## 2. Where the code is today

### 2.1 Backend (FastAPI, Postgres, Alembic, latest migration is 028)

| Area | State | Files |
|---|---|---|
| `users` table | `id, name, email, password_hash, role (USER/ADMIN), phone, is_verified, timestamps`. `password_hash` is NOT NULL, so a Google-only user cannot exist yet. There is no `google_id`, city, stream, last-login or consent column. | `backend/models/user.py` |
| Auth endpoints | `POST /auth/register`, `/login`, `/refresh`, `/logout`. Single JWT with a 24h default lifetime. The "refresh" re-uses the same access token. `logout` does nothing on the server. | `backend/routers/auth.py`, `backend/services/auth.py`, `backend/core/security.py` |
| Register schema | Takes `name, email, password` only. The `phone` column is never filled. | `backend/schemas/auth.py` |
| Dependencies | `CurrentUserId`, `OptionalUserId` and `AdminPayload` already exist. `OptionalUserId` is what lead and event capture need. | `backend/core/dependencies.py` |
| `leads` table | `id, name, phone, email, college_slug, type, status, created_at`. There is no `user_id`, source page, stream, city, message, consent, UTM, session or IP. | `backend/models/lead.py` |
| Lead endpoint | `POST /leads`. Dedupes on phone, college and type within 24h, so a second enquiry in 24h gets a 409. | `backend/services/lead.py`, `backend/repositories/lead.py` |
| Admin leads | List with status/type filter, and a status update. Dashboard counts leads by type and by day. | `backend/routers/admin.py` (lines ~452-500), `backend/routers/admin_dashboard.py` |
| `reviews.user_id` | Foreign key to `users` already exists. | `backend/models/review.py` |
| Visitor tracking | **None.** There is no events table, session id or analytics endpoint. | n/a |
| Env | `SECRET_KEY`, `CORS_ORIGINS`, and `ADMIN_EMAIL` and `ADMIN_PASSWORD` in deploy. No Google client ID or secret. | `backend/core/config.py`, `deploy/backend.env.example` |

### 2.2 Frontend (Next.js 16, App Router)

| Area | State | Files |
|---|---|---|
| Login | `signIn` server action. A non-ADMIN account is rejected with "This account does not have admin access". **Students cannot log in at all today.** The copy on the form promises "Save colleges, track applications". | `lib/auth-actions.ts`, `components/auth/login-form.tsx` |
| Google button | **Dead.** It is a `<button type="button">` with no handler. | `components/auth/login-form.tsx` (bottom) |
| Register | Posts to `/api/auth/register`, which forwards to the backend. It sends `name, email, password`; **phone is validated and then dropped**. The response is ignored: no session is created after sign-up. | `components/auth/register-form.tsx`, `app/api/auth/register/route.ts` |
| Forgot password | Page and route exist. The backend has no endpoint behind it. | `app/(auth)/forgot-password`, `app/api/auth/forgot-password/route.ts` |
| Session | Only an **admin** httpOnly cookie, `tcp_admin_token`. `proxy.ts` refreshes it and only matches `/admin/*`. There is no student session. | `lib/admin-session.ts`, `proxy.ts` |
| Header | Always shows "Login / Register". It does not know who is signed in. | `components/site-header.tsx` |
| Lead form | `EnquiryForm` collects name, phone, email, stream, city, message, consent, `source`. `app/api/enquiry/route.ts` forwards **only** `name, phone, email, collegeSlug, type: "enquiry"`. **Stream, city, message, source and consent are thrown away**, and `type` is always `enquiry`. The route also uses an in-memory rate limit, which resets on every deploy. | `components/enquiry-form.tsx`, `app/api/enquiry/route.ts` |
| Lead entry points | About 15 links to `/enquiry` ("Request a Callback", "Apply Now", "Talk to a counsellor") plus the college enquiry modal (`?enquire=1`) and the college **Brochure** button. Brochure goes straight to a file or to `/enquiry`, so it never creates a `brochure` lead. | `college-masthead.tsx`, article, exam, course and program pages |
| Admin | `/admin/leads` inbox and a dashboard chart. The sidebar links `/admin/users`, which does not exist. | `components/admin/leads-inbox.tsx`, `admin-nav.ts` |
| Analytics | **None.** No GA, no pixel, no event code. The privacy page already says "analytics" and "cookies" are used, but the site does not currently use them. | `app/layout.tsx`, `privacy/page.tsx` |
| Compare tray | Held in sessionStorage. Not tracked. | `components/compare-tray.tsx` |

### 2.3 Problems found that the plan has to fix

1. Students can register but cannot log in anywhere, so "user login" does not work for the people it is for.
2. Google login is a placeholder.
3. Leads lose most of what the visitor typed (stream, city, message, consent, source page), and can't be tied to a user.
4. The 24h duplicate rule rejects a genuine second enquiry about a different course at the same college, and the visitor sees an error.
5. There is nothing recording visits or clicks.
6. Lead rate limiting lives in server memory, so it resets on deploy and does not work across more than one instance.
7. Password reset is a frontend stub.

---

## 3. Decisions to confirm before building

These change the design, so please settle them first. My recommendation is first in each.

| # | Question | Recommendation |
|---|---|---|
| D1 | **Google login method.** | Google Identity Services ("Sign in with Google") on the frontend, which returns an ID token. The backend verifies the token (`google-auth` library) and issues our own JWT. This needs one Google Cloud OAuth client and no redirect-flow session code. |
| D2 | **Student session storage.** | An httpOnly cookie, `tcp_user_token`, set by a server action or route handler. This is the same pattern as the admin cookie, so the token never reaches page JS. Keep the admin and student cookies separate. |
| D3 | **Track anonymous visitors?** | Yes, with a first-party anonymous id (cookie) and a consent banner. See section 7. If the client wants a legal review first, ship the logged-in and lead tracking first and add anonymous tracking behind the banner. |
| D4 | **Use a third-party analytics tool on top (GA4 / PostHog / Clarity)?** | Optional. Own first-party tracking answers "who clicked what, tied to a lead" and GA4 can't do that. GA4 is still worth adding for marketing and ad attribution. |
| D5 | **Phone verification (OTP) for leads.** | Later (phase 5). It needs an SMS provider and cost sign-off. Not needed for this first pass. |
| D6 | **Does a lead require login?** | No. Keep leads open to anonymous visitors, because forcing login lowers conversions. Logged-in users just get the form prefilled and the lead linked to them. |

---

## 4. Target design

### 4.1 Data model (new migrations 029 onward)

**`users` changes (029)**
- `password_hash` becomes nullable (Google-only accounts).
- Add `google_sub` (unique, nullable, indexed), `avatar_url`, `auth_provider` (`password` / `google`), `email_verified_at`, `last_login_at`, `is_active` (default true), `city`, `state`, `preferred_stream`, `target_exam`, `marketing_consent` (bool), `consent_at`.
- Matching rule: a Google sign-in whose verified email equals an existing password account links to that account (sets `google_sub`) instead of creating a duplicate. Only link when Google reports `email_verified = true`.

**`leads` changes (030)**
- Add `user_id` (FK to users, `ON DELETE SET NULL`, indexed), `visitor_id` (indexed), `stream`, `city`, `message`, `consent` + `consent_at`, `source` (e.g. `enquiry-page`, `college-programme`, `brochure`), `source_url`, `program_name`, `utm_source/medium/campaign` (or one `utm` JSON column), `ip_hash`, `user_agent`.
- Drop the hard 24h reject. Instead keep the **same-phone, same-college, same-type, same-program** check, and when it matches, return success with the existing lead id and log it as a repeat (bump a `repeat_count`). A visitor never sees "duplicate".
- Allow the other `type` values to be sent by the right buttons (`callback`, `brochure`, `counselling`).

**`visitors` (031)** - one row per anonymous browser
`id (uuid = the cookie value), first_seen_at, last_seen_at, user_id (nullable, set when they log in), first_referrer, first_landing_url, utm_*, device_type, browser, os, country/city (from IP, optional), consent_state`.

**`visit_sessions` (031)** - one row per visit (30 min of inactivity ends it)
`id, visitor_id, user_id, started_at, ended_at, landing_url, referrer, utm_*, page_count, event_count`.

**`events` (031)** - one row per tracked action
`id, visitor_id, session_id, user_id, occurred_at (indexed), name, path, properties (JSONB), college_slug / exam_slug / program_slug (indexed, nullable)`.
Partition or at least index on `(occurred_at)` and `(user_id, occurred_at)`, and plan a retention job (for example raw events kept 13 months, then rolled up).

**`auth_tokens` (032, phase 4)** - for password reset and email verification: `id, user_id, kind, token_hash, expires_at, used_at`.

### 4.2 Backend endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /auth/google` | none | Body `{idToken}`. Verify with Google, find or create the user, return `{accessToken, user}`. |
| `POST /auth/register` | none | Add optional `phone`, `marketingConsent`. Return a token (already does), so the frontend can log the user straight in. |
| `POST /auth/login` | none | Update `last_login_at`. Refuse a Google-only account with a clear "use Google" message. Refuse `is_active = false`. |
| `GET /me`, `PATCH /me` | user | Read and edit the profile (phone, city, stream, exam, consent). |
| `GET /me/leads` | user | The student's own enquiries and their status. |
| `POST /auth/forgot-password`, `/reset-password`, `/verify-email` | none | Phase 4, using `auth_tokens` and an email provider. |
| `POST /leads` | optional | Use `OptionalUserId` to set `user_id`; accept the new fields and `visitorId`. |
| `POST /track` | optional | Batch of events `{visitorId, sessionId, events:[…]}`. Always 204, never blocks the page. Basic validation, size limits, per-visitor rate limit, bot filter on user agent. |
| `POST /track/identify` | optional | Called after login, signup or lead. Links `visitor_id` to `user_id` and back-fills earlier rows. |
| `GET /admin/users`, `GET /admin/users/{id}` | admin | User list with filters, and a detail page with leads and timeline. This fills the dead `/admin/users` nav link. |
| `GET /admin/leads/{id}` | admin | Full lead with source and the visitor's timeline. |
| `GET /admin/analytics/*` | admin | Aggregates: visitors per day, top pages, top clicked CTAs, funnel, source breakdown. |
| `GET /admin/leads/export.csv` | admin | CSV export for the sales team. |

Security notes for these: verify the Google token's `aud` (our client ID), `iss` and `exp`; never trust a client-supplied email. Role is never accepted from a request body (already the rule for register). Hash IPs rather than store them raw, with a rotating salt. Put `/track` and `/leads` behind a proper rate limit (see 4.4).

### 4.3 Frontend

**Student auth**
- `lib/user-session.ts` with the cookie `tcp_user_token`, plus `getCurrentUser()` for server components. Extend `proxy.ts` matching so the student cookie is also refreshed.
- `signIn` action: accept both roles. ADMIN goes to `/admin`; USER goes to `?next=` or `/account`. Keep the generic error message.
- `register-form`: send `phone`, then call login and set the session so the student lands signed in.
- `GoogleSignInButton` component: loads Google Identity Services, posts the credential to a server action that calls `POST /auth/google` and sets the cookie. Used on both `/login` and `/register`. Needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- `SiteHeader`: becomes session-aware. Signed out shows "Login / Register"; signed in shows avatar or initial, with a menu for My account, My enquiries and Log out.
- New pages: `/account` (profile edit), `/account/enquiries`. Later `/account/saved` for shortlists.
- Logout server action: clear the cookie and call `/auth/logout`.

**Leads**
- `app/api/enquiry/route.ts`: forward **all** fields (stream, city, message, consent, source, source URL, UTM, visitor id) and the user's token when present. Remove the in-memory limiter in favour of the backend one. Keep the honeypot.
- `EnquiryForm`: prefill name, email and phone from the profile when signed in. Offer "Sign in with Google to autofill" for anonymous visitors.
- Make the existing buttons send the right `source` and `type`: Brochure (create a `brochure` lead, then serve the file), Request a Callback (`callback`), Apply Now (`enquiry` plus program), counsellor links (`counselling`).

**Tracking** (see section 5)
- `lib/analytics.ts`: `track(name, props)`, which queues events and flushes with `navigator.sendBeacon` (on page hide) or `fetch keepalive` (every few seconds, or at 10 events).
- `<AnalyticsProvider>` in the root layout: sets or reads the `tcp_vid` cookie, starts and rotates the session, sends `page_view` on every App Router navigation (using `usePathname` and `useSearchParams`), and delegates clicks.
- Click capture by declarative attributes: `data-track="cta_apply_now"` plus `data-track-*` props. One delegated `click` listener on `document` reads them. This keeps instrumentation out of component logic and makes new buttons trivial to add.
- Skip `/admin/*` entirely.

### 4.4 Cross-cutting

- **Rate limiting:** do it in the backend (a small Redis or in-process sliding window to start; Redis if more than one instance runs). Applies to `/auth/*`, `/leads`, `/track`.
- **Login brute-force protection:** per-email and per-IP attempt counter with a short lockout.
- **Token lifetime:** keep the 24h student token for now; add a refresh path through `proxy.ts` as the admin cookie already does. A real refresh-token table can follow if needed.
- **Secrets and config:** `GOOGLE_CLIENT_ID` (backend and frontend), set in `deploy/backend.env.example` and the frontend env. Update the `CORS_ORIGINS` doc.
- **Privacy:** update the privacy page (cookies, analytics, Google sign-in, retention, deletion route) and add a consent banner. The page already claims analytics are used.

---

## 5. Tracking spec: events to capture

All events carry `visitor_id`, `session_id`, `user_id` (if known), `path`, timestamp, and device and referrer from the session.

| Event | Fires when | Key properties |
|---|---|---|
| `page_view` | Every route change | `path, title, referrer, utm_*`, and `college_slug / exam_slug / program_slug` parsed from the path |
| `click_cta` | Any element with `data-track` | `cta` (name), `label`, `location` (section of page), `href` |
| `click_apply` / `click_brochure` / `click_callback` | The corresponding buttons | `college_slug, program` |
| `outbound_click` | Link to another domain (college website, brochure PDF) | `href` |
| `search` | Search submitted | `query, results_count` |
| `filter_applied` | Listing filter changed | `filter, value` |
| `compare_add` / `compare_remove` / `compare_open` | Compare tray | `college_slug` |
| `college_section_view` | Switching tabs on a college page | `college_slug, section` |
| `exam_practice_start` / `exam_practice_submit` | Practice tests | `exam_slug, test, score` |
| `form_view` / `form_start` / `form_submit` / `form_error` | Enquiry form (shows drop-off) | `source, field_errors` |
| `signup_start` / `signup_success` / `login_success` / `login_failure` | Auth | `method` (password or google) |
| `google_login_click` | Google button pressed | n/a |
| `scroll_depth` (25/50/75/100) | Long pages (articles, college) | `path, depth` |
| `time_on_page` | Page hide | `seconds` (active time) |

Naming convention: `snake_case` event names, a fixed property vocabulary, and a single `EVENTS` constant list in `lib/analytics.ts` so names can't drift.

**Identity stitching:** the `tcp_vid` cookie is created on the first visit. When the visitor logs in, registers or submits a lead, the frontend calls `/track/identify` (or the lead/auth call carries `visitorId`) and the backend sets `visitors.user_id` and back-fills `events.user_id` for that visitor. This is what lets the admin read the whole journey that led up to a lead.

---

## 6. Admin views

1. **Leads inbox** (extend): add columns for source, program, stream, city, linked user, and visits-before-lead. Add filters by source and date, and CSV export.
2. **Lead detail drawer:** contact info, what they asked, source page, UTM, and the timeline of pages and clicks from that visitor (last 50 events).
3. **Users** (`/admin/users`, currently a dead link): list with search, provider (email/Google), last login, lead count; detail with profile, leads, and activity timeline; enable or disable an account.
4. **Activity / Analytics dashboard:** visitors, sessions and new vs returning per day; top pages; top clicked CTAs; traffic by source and UTM; funnel *visit → college page → CTA click → form view → lead*; signups by method; live "last 20 events" feed for sanity checks.

---

## 7. Privacy and compliance (India, DPDP Act, plus general good practice)

- A consent banner before anything beyond strictly necessary storage. Until the visitor accepts, either send no events, or send events with no cookie (session-only id). Store the consent state and timestamp on the visitor.
- The lead form's existing consent checkbox must be stored with the lead (`consent`, `consent_at`). Today it is validated and then discarded.
- Hash IPs, don't store raw ones. Don't capture form field values, passwords or any keystrokes in events.
- Retention: raw events 13 months (configurable), leads and users until deletion is requested.
- A user can see and delete their data: "Delete my account" on `/account` anonymises the user and unlinks their leads and events.
- Update the privacy policy to match what we actually do. Google sign-in should request only `openid email profile`.

---

## 8. Phased delivery

Each phase is shippable on its own and ordered by value.

**Phase 1: Student login and session (foundation)**
Migration 029; `POST /auth/google`; `/me`; student cookie and `getCurrentUser`; login action accepting both roles; register logs the user in and saves phone; working Google button; session-aware header; logout; `/account` profile page.
*Done when:* a new user can sign up by email or Google, stays signed in across pages, and appears with a name in the header; an admin still lands in `/admin`.

**Phase 2: Proper lead capture**
Migration 030; extend `LeadCreateSchema` and the enquiry route so nothing typed is lost; `user_id` link; prefill from profile; correct `type` per button, with Brochure creating a lead; replace the 24h reject with repeat handling; backend rate limit; stored consent.
*Done when:* a lead in the database shows stream, city, message, source, linked user, and a second enquiry to the same college is accepted.

**Phase 3: Visitor and click tracking**
Migration 031; `/track` and `/track/identify`; `AnalyticsProvider`, `track()`, `data-track` attributes across the CTAs listed in section 5; consent banner; identity stitching; skip admin routes.
*Done when:* browsing, clicking and submitting a form produces correct rows, and signing in attaches the earlier anonymous activity to the user.

**Phase 4: Admin visibility**
`/admin/users`, lead detail with timeline, analytics dashboard, CSV export, and the "my enquiries" student page.

**Phase 5: Hardening and extras**
Password reset and email verification (needs an email provider), login lockout, OTP on phone (if D5 is approved), event retention job and rollups, optional GA4 or PostHog, account deletion flow, privacy page update.

Rough effort (one developer, including testing): P1 3-4 days, P2 2-3 days, P3 4-5 days, P4 3-4 days, P5 4-6 days. Phases 1 and 2 are mostly independent of 3, so they can run in parallel with two people.

---

## 9. Files likely to change

**Backend:** `models/user.py`, `models/lead.py`, new `models/visitor.py` + `models/event.py`; alembic `029`-`032`; `schemas/auth.py`, `schemas/lead.py`, new `schemas/track.py`; `services/auth.py` (+ Google verify), `services/lead.py`; new `services/track.py`; `repositories/user.py`, `repositories/lead.py`; `routers/auth.py`, `routers/leads.py`, new `routers/me.py`, `routers/track.py`, `routers/admin_users.py`, `routers/admin_analytics.py`; `routers/admin.py` (lead detail, export); `core/config.py` (Google client ID), `core/dependencies.py`, `main.py` (register routers); `requirements.txt` (`google-auth`); `deploy/backend.env.example`.

**Frontend:** `lib/auth-actions.ts`, new `lib/user-session.ts`, `lib/analytics.ts`, `lib/api.ts` (me, google, track, richer lead types); `proxy.ts`; `components/auth/login-form.tsx`, `register-form.tsx`, new `google-sign-in-button.tsx`; `components/site-header.tsx` (+ `mobile-nav.tsx`); `components/enquiry-form.tsx`; `app/api/enquiry/route.ts`, `app/api/auth/register/route.ts`; `app/layout.tsx` (provider and banner); new `app/(site)/account/*`; `components/college/college-masthead.tsx` and the other CTA pages (add `data-track`); `components/admin/leads-inbox.tsx`, `admin-sidebar.tsx`, new admin users and analytics pages; `app/(site)/privacy/page.tsx`.

---

## 10. Risks and open points

- **Google OAuth setup** needs a Google Cloud project, consent screen, authorised JS origins (`localhost:3000` and `career.qualcsi.com`), and the client ID in both env files. Someone with the client's Google account must do this.
- **Event volume:** every click is a row. Batch on the client, keep the table narrow, index only what the admin queries, and have a retention job from day one.
- **Ad blockers** will drop some client-side events from a `/track`-looking path. Name the endpoint neutrally and send it first-party (same origin, through a Next.js rewrite) to lose less.
- **Accuracy of "who":** anonymous visitors are only a cookie id until they identify themselves. Clearing cookies or switching devices splits a person in two. That is normal, and only stitching on login or lead can join them.
- **Existing data:** old leads have no user or source, so the new columns are nullable and old rows stay as they are.
- **Next.js 16** differs from older versions (see `frontend/AGENTS.md`). Read the relevant guide in `node_modules/next/dist/docs/` before touching `proxy.ts`, route handlers, cookies or the root layout.

---

## 11. Admin sidebar: deferred items

Removed from the sidebar on 2026-10-17 because their pages do not exist (each led to a 404). They are in the client's proposal and should come back with their pages:

- **Community:** Reviews (moderation, with a way for students to submit), Questions & Answers.
- **SEO:** Metadata (per-page title and description), Redirects, Sitemaps.
- **Content:** Locations (currently edited under Sections, Location Page), Static Pages.
- **Leads:** Enquiry Forms, Integrations (CRM and WhatsApp).
