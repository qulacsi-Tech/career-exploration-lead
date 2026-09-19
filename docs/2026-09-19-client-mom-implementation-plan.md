# Client MOM & Implementation Plan — roles, College Admin & approvals

> **Internal document.** Carries day estimates and commercial notes.
> Continues [2026-09-04-client-mom-implementation-plan.md](2026-09-04-client-mom-implementation-plan.md).

**Meeting date:** 15 September 2026
**Subject:** College Admin module, user roles & approval workflow
**Prepared by (client side):** Sanket Singh
**Scope:** **UI only.** No backend, no API, no persistence this cycle.
**Status:** Planned 19 September 2026. Three structural questions settled up front (§3); six open with the client (§11).

---

## 1. Minutes of meeting (as received)

### 1.1 Stream display
- No animation is required for displaying streams.
- Streams such as Management, Engineering, etc. should be displayed directly on the website.

### 1.2 College Admin module
- A separate College Admin/College Editor module, apart from the existing Owner module.
- Each college will have one College Admin.
- The College Admin should have an Edit function to update relevant college information.

### 1.3 User roles
Four roles: Super Admin, Admin, College Admin/College Editor, Student.

### 1.4 Edit and delete approval
- Changes made by the College Admin/Editor must not be updated automatically.
- Any edit must first be submitted for approval.
- Changes reflect on the live website only after approval from Admin or Super Admin.
- Deletion requests also require approval before being implemented.

### 1.5 Student reviews
- Student reviews must not be editable or removable by the College Admin/Editor.
- Reviews stay protected from changes made by the college.

### 1.6 College Admin account management
- Only one College Admin account per college.
- Admin/Super Admin can reset the College Admin's password.
- Admin/Super Admin can enable or disable the College Admin's login.
- Login status manageable from the Admin/Super Admin module.

### 1.7 Proposed workflow
College Admin/Editor → Submit Edit/Delete Request → Admin/Super Admin Review → Approve/Reject → Changes Reflected on Website

---

## 2. Status against the current build

Checked against `frontend/src` on 19 September 2026.

| MoM item | Status | Where it stands |
|---|---|---|
| 1.1 Streams without animation | **Done** | `components/stream-grid.tsx` — the shuffling coin deck is gone, six links rendered directly. Back to a server component: no state, no effects, no framer-motion. |
| 1.2 College Admin module | **Not started** | No module, no route, no concept of an assigned college. |
| 1.3 Four roles | **Named only** | `api/auth/register/route.ts` hard-codes `role: "student"` and documents the four-role intent in its header. `admin-sidebar.tsx:13` holds a hard-coded `currentUser` whose role is the display string `"Administrator"` — not a typed value anything branches on. |
| 1.4 Edit/delete approval | **Not started** | No approval concept anywhere. The nearest thing is `isPublished` on collections, which is a draft flag, not a request queue. |
| 1.5 Reviews protected | **Incidentally true** | The Reviews tab in `college-edit-modal.tsx:331` is read-only — but for *everyone*, labelled "Moderation lands with the reviews module in phase 2". A phase note, not a policy. |
| 1.6 One admin per college, reset, enable/disable | **Not started** | `adminNav` links `/admin/users`; the route does not exist. |
| 1.7 Workflow | **Not started** | — |

One item of seven is delivered. The remaining six are one connected feature — a role
model, the UI it gates, and the queue it feeds — which is why they are sequenced as
four dependent workstreams below rather than six independent ones.

### The constraint that shapes everything

There is still no backend: `backend/models/` holds only `__init__.py`, and no screen
in the app persists anything. So this cycle builds the **complete UI and the data
shapes it implies**, over mock records — exactly as the 4 September cycle did. The
mock model *is* the specification handed to whoever builds the API.

Stated plainly so it is not discovered later: **nothing in this cycle is a security
control.** A role model in the browser decides what is *rendered*. The gate that
matters is server-side and does not exist yet.

---

## 3. Structural decisions, settled 19 September 2026

| # | Question | Decision | Consequence |
|---|---|---|---|
| 1 | Where the College Admin module lives | **Role-scoped `/admin`** — one shell, nav filtered by role | The MoM's "separate module" is delivered as a separate *experience*. `CollegeEditModal`, `ResourceAdmin` and `adminNav` are reused, so a field added to a college appears for both audiences without a second edit. A separate route group would have meant two shells and either a duplicated editor or an extraction refactor. |
| 2 | How an edit request is captured | **Field-level diff** — changed fields only, as before/after pairs | A reviewer approving a two-field change sees two rows, not a forty-row record to scan. Two pending requests touching different fields do not clobber each other. Costs a diff builder that walks nested data (`courses[2].fees`) — the fiddly part of workstream K. |
| 3 | Demoing four roles with no auth | **Seeded logins + a dev role switcher** | The client can walk a College Admin's real sign-in journey; development and back-to-back demos use the switcher. The switcher is visibly marked DEMO and is deleted when auth lands. |

---

## 4. Workstream H — Role model & mock session

**The foundation. Everything else depends on it.**

### Mock model

`lib/roles.ts`

```
type Role = "super-admin" | "admin" | "college-admin" | "student"

type Permission =
  | "admin:enter"            // may reach /admin at all
  | "college:edit-direct"    // save lands live
  | "college:submit-change"  // save creates a request
  | "college:delete-direct"
  | "college:request-delete"
  | "requests:review"        // approve / reject
  | "reviews:moderate"
  | "users:manage"           // reset password, enable/disable
  | "users:manage-admins"    // create or demote an Admin / Super Admin

can(role: Role, permission: Permission): boolean
```

A matrix in one file, not `if (role === "admin")` scattered across twenty components.
The single reason: when the client changes their mind about what an Admin may do —
and §11 shows they have not decided yet — it is one table to edit.

Permission names are deliberately about *actions*, not screens. `college:edit-direct`
vs `college:submit-change` is the whole of MoM 1.4 expressed as two permissions the
same editor reads.

### Session

`lib/session.ts` + `components/session-provider.tsx`

- Four seeded accounts (`super@demo`, `admin@demo`, `college@demo` assigned to one
  college, `student@demo`).
- **Cookie-backed, not sessionStorage.** The compare tray uses sessionStorage and is
  right to; a session must be readable by `middleware.ts`, which is where the real
  guard will go. Modelling that now means the day auth lands the guard is replaced,
  not relocated.

### UI

- `/login` validates against the seeded accounts and routes by role: Super Admin and
  Admin to `/admin`, College Admin to `/admin` (scoped dashboard), Student to `/`.
  Replaces the current unconditional `router.push("/admin")`.
- **`middleware.ts` — new file.** No session, or a Student session, on an `/admin`
  path redirects to `/login`. `/admin` is currently reachable by URL by anyone; this
  was flagged as out of scope on 4 Sep and is now in scope.
- `adminNav` items gain `roles: Role[]`. The sidebar, the mobile drawer and the
  breadcrumb already read that one model, so filtering once covers all three.
- `admin-sidebar.tsx:13` reads the session instead of the hard-coded `currentUser` —
  the file's own comment already says "pass the real user in as a prop; nothing else
  here needs to change".
- Dev role switcher, fixed corner, marked DEMO.

**3 days.**

---

## 5. Workstream I — Users & Roles module

`/admin/users` — fills a nav link that currently 404s. MoM 1.3 and 1.6.

Built on `ResourceAdmin`: this is a table with search, an add form and view/edit
dialogs, which is exactly what that shell exists for.

### UI

- **Table:** name, email, role badge, assigned college (College Admins only), login
  status, last active.
- **Row actions:** Reset password (modal, sets a temporary password, shown once),
  Enable/Disable login (confirm dialog — disabling locks someone out), Edit, Delete.
- **Add user:** role select; choosing College Admin reveals a college picker that
  **omits colleges already holding an admin**, with the reason shown inline rather
  than the option quietly missing. This is where MoM 1.6's "only one per college"
  is enforced in the UI.
- **Colleges without an admin** panel. The inverse view is the one an operator
  actually works from — "who still needs onboarding" — and it comes free from the
  same join.
- **Super Admin only:** creating, editing or demoting an Admin or Super Admin
  (`users:manage-admins`). An Admin sees those rows read-only, with the reason on
  hover. Rendering them read-only rather than hiding them is deliberate: an Admin
  who cannot see the Super Admins cannot tell who to ask.

`lib/users-data.ts` carries the mock records and the college assignment.

**3 days.**

---

## 6. Workstream J — College Admin experience

MoM 1.2. Depends on H.

- **`/admin` dashboard branches by role.** A College Admin gets a single-college
  overview — their college, their pending requests, recent student reviews — not the
  directory tiles, which would read as a broken query for someone who owns one record.
- **Nav for a College Admin:** Dashboard, My College, My Requests. Nothing else is
  rendered. Not disabled — absent.
- **"My College"** opens `CollegeEditModal` on their record directly. Same component,
  same tabs, same fields as an Admin sees. No fork.
- **The editor reads the permission, not the role.** With `college:submit-change`
  rather than `college:edit-direct`:
  - Save becomes **Submit for approval**, preceded by a "3 fields changed" summary
    so nobody submits blind.
  - Delete becomes **Request deletion**, with a required reason.
- **Reviews tab locked** with role reasoning — see workstream L.
- **Out-of-scope URLs.** A College Admin typing `/admin/colleges` gets a scoped
  403 screen built on `RouteMessage`, the component that already exists for exactly
  this class of page.

**4 days.**

---

## 7. Workstream K — Approval workflow

MoM 1.4 and 1.7. The core of this cycle. Depends on H and J.

### Mock model

`lib/change-requests.ts`

```
type FieldChange = {
  path: string       // "feesRange", "courses[2].fees"
  label: string      // "Total fees — Executive MBA"
  before: unknown
  after: unknown
}

type ChangeRequest = {
  id: string
  collegeSlug: string
  kind: "edit" | "delete"
  changes: FieldChange[]      // empty for a delete; the record is the before
  reason?: string             // required on a delete
  submittedBy: string
  submittedAt: string
  status: "pending" | "approved" | "rejected" | "stale"
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string         // required on a reject
}
```

`label` is stored, not derived at render time. A diff row reading
`courses[2].fees` is a developer's view of the data; a reviewer needs
"Total fees — Executive MBA". Deriving it in the viewer means the viewer needs to
know the shape of every entity it might display.

### The diff builder

Walks a submitted draft against the live record and emits `FieldChange[]`, including
nested arrays. This is the part that will take the time — courses, cutoffs, rankings
and gallery items are arrays of objects where a row can be added, removed or reordered,
and "reordered" must not read as forty changed fields.

### UI

- **`/admin/approvals`** — the queue. Filter by status and college, oldest first by
  default. Diff viewer per request: before → after, one row per changed field.
  Approve, or Reject with a reason (required — a rejection with no reason generates
  a support ticket). Bulk approve across selected requests.
- **Pending count** on the sidebar item and as a dashboard tile.
- **College Admin's "My Requests"** — status per request, the reviewer's rejection
  reason shown in full, and resubmit from a rejected request.
- **Pending banner in the editor.** A field with an open request is marked, so an
  editor does not submit a second, conflicting change to it.
- **Stale requests.** If an Admin edits a field directly while a request against it
  is open, the request is marked `stale` and the reviewer is told what moved
  underneath it. The alternative — approving it and silently reverting the Admin's
  edit — is the failure mode that erodes trust in the whole queue.

### What deliberately does not change

**The public site.** It reads live records; a pending request is not a live record.
There is no change to any `(site)` route in this workstream, and that is the proof the
model is right rather than an omission.

**5 days.**

---

## 8. Workstream L — Review protection

MoM 1.5. Small, but it is a policy and should read as one.

Reviews are already read-only in `college-edit-modal.tsx` — but for everyone, and
labelled as an unfinished phase-2 feature. Three changes:

1. **Role-driven.** `can(role, "reviews:moderate")` — permanently false for a College
   Admin; true for Admin and Super Admin, behind the phase-2 reviews module.
2. **Copy states the rule.** "Student reviews cannot be edited or removed by a
   college" replaces "Moderation lands with the reviews module in phase 2". The first
   is a policy a college admin should understand; the second reads like something that
   will be unlocked later.
3. **Reviews excluded from the diff builder.** No change request can carry a review
   edit even if a future field is added to that tab. Belt and braces, and cheap.

**1 day.**

---

## 9. Workstream M — Cleanups

Folded in because this cycle touches the admin shell, the nav model and the lint
config anyway.

- **Two lint errors** — `ui/section-journey-connector.tsx:35` declares a `Rope`
  component inside render (`react-hooks/static-components`), flagged twice. The build
  passes; `npm run lint` does not.
- **~620 lines of dead code** — `ui/circuit-rope.tsx` (204), `site-logo-plated.tsx`
  (256), `site-log-copy.tsx` (158, and the filename is a typo). Zero references each.
  Plus `RecommendedProgramCard` and `UniversityCard` imported but unused in the
  homepage. `theme-switcher.tsx` is also unused but is deliberately parked with an
  explanation — it stays.
- **`gsap` and `@gsap/react`** are in `dependencies` and appear nowhere in `src`. All
  animation is framer-motion. Remove.
- **A 38 MB unreferenced SVG** is committed at
  `frontend/design-assets/vecteezy_hand-drawn-line-leaves-art-background_6388979.svg`
  — the only file in that directory, referenced nowhere. It is larger than the rest of
  the repository combined. Remove; a history rewrite is a separate call.
- **Honest nav.** Nine `phase: 1` items in `adminNav` have no route and 404 on click
  (Leads Inbox, Enquiry Forms, Locations, Static Pages, three SEO screens, Users &
  Roles). Workstream I builds one of them. The rest get a "not in this build" state —
  the same treatment `phase: 2` already gets — rather than presenting dead links as
  ready. Also `mock-data.ts:866` points a "view all" at `/locations`; the route is
  `/location/[slug]`, singular, with no index.
- **`sitemap.ts` and `robots.ts`** do not exist. Out of scope here, noted because the
  collections system exists for SEO and carries careful canonical handling that
  nothing is currently advertising.

**1.5 days**, excluding sitemap/robots.

---

## 10. Sequencing & estimates

```
Week 1     H: role model & mock session   ──┐ blocks everything
                                             │
           I: users & roles (needs H)      ──┘

Week 2     J: college admin experience (needs H)
           K: change-request model + diff builder (needs J)

Week 3     K: approval queue UI
           L: review protection
           M: cleanups
           Polish & review pass
```

| Workstream | Days |
|---|---|
| H — Role model & mock session | 3 |
| I — Users & Roles module | 3 |
| J — College Admin experience | 4 |
| K — Approval workflow | 5 |
| L — Review protection | 1 |
| M — Cleanups | 1.5 |
| **Total** | **~17.5 days** |

Excludes QA and client review cycles. All UI over mock data.

### Explicitly out of scope this cycle

Data models, migrations, API endpoints, real authentication, password hashing, email
delivery for password resets, and audit logging. The seeded logins are a demo device,
not a login system.

**Carry to the client:** ~17.5 days is a little over three weeks for one developer.
Workstreams I and J can run in parallel once H lands if a second pair of hands is
available, which brings it inside three.

---

## 11. Open questions for the client

Assumptions are recorded so work is not blocked; each will be built as stated unless
corrected.

| # | Question | Working assumption |
|---|---|---|
| 1 | Does an Admin's own edit go through the queue, or land live? | **Lands live.** Only a College Admin is queued. The MoM only ever constrains the College Admin. |
| 2 | Can a Super Admin approve their own submitted request? | Moot under (1), but the permission matrix will allow it rather than build a second-reviewer rule nobody asked for. |
| 3 | A rejected request — closed, or editable and resubmittable? | **Resubmittable**, carrying the reviewer's reason. Closing it makes a typo cost a fresh submission. |
| 4 | Disabling a College Admin's login — what happens to their pending requests? | **Requests stand.** They are the college's proposed changes, not the person's. |
| 5 | Which tabs may a College Admin edit? | **All except Reviews.** Flagging that this includes **SEO** — meta title, description and canonical are ranking levers, and handing them to a college is a commercial decision, not a technical one. |
| 6 | One College Admin per college — how should a multi-campus institution be handled? | Treated as one college, one admin, per the MoM. Raise if any client record is multi-campus. |

---

## 12. What this cycle leaves ready for the backend

The mock models are the API specification:

- `lib/roles.ts` — the role enum and permission matrix, to be re-implemented
  server-side where it counts.
- `lib/users-data.ts` — the user record, including college assignment and login status.
- `lib/change-requests.ts` — the request record and the field-diff shape.
- `middleware.ts` — the guard's location, with a mock check to be swapped for a real
  session lookup.

`api/auth/register/route.ts` already documents the four steps its handler needs when
the user store exists, and already refuses a client-supplied role. That contract holds.
