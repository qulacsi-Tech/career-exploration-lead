# College / University Admin: plan

**Date:** 2026-10-17
**Status:** Phase A built (not yet run end to end). Phases N and B are planned. Revised after review: edits go through approval (confirmed), and notifications, real-time delivery and messaging were added (section 11).
**Builds on:** the client's notes of 19 Sep (`2026-09-19-client-mom-implementation-plan.md`, sections 1.2 to 1.7 and workstreams J and K), the Super Admin role added today, and the college editor in `components/admin/college-editor/`.

---

## 1. The idea in one paragraph

Each college or university gets **one College Admin account**. A Super Admin or Admin creates it from a new **Administrative** tab in that college's edit dialog. The college admin signs in at the normal login page and lands in the **same admin panel**, but scoped: they see only their own college, its edit screens, and **only the leads for that college**. What they change on the college page goes live only after an Admin or Super Admin approves it (the client's rule 1.4). Everything is enforced in the backend, not by hiding menu items.

## 2. Roles after this change

| Role | Sees | Can do |
|---|---|---|
| Student (`USER`) | The public site, My account | Enquire, view own history |
| **College Admin** (`COLLEGE_ADMIN`, new) | Their one college only | View and propose edits to their college, manage its leads (status, reply), see its page statistics |
| Admin (`ADMIN`) | Whole panel | Everything content-related, approve or reject college changes, create, reset and disable College Admins, enable or disable general accounts |
| Super Admin (`SUPER_ADMIN`) | Whole panel | All of the above, plus create and disable Admins and Super Admins |

The label reads "College admin" or "University admin" from the college's existing `institution_type`.

## 3. Decisions to confirm (recommendation first)

1. **Do College Admin edits go live straight away?** **Decided: no.** Every edit and every deletion is submitted, and an Admin or Super Admin approves it first (1.4, 1.7). Delivery is split so that nothing is ever published without approval: *Phase A* gives the college admin leads plus a **read-only** view of their college, and *Phase B* adds editing through approval.
2. **One College Admin per college**, strictly (1.6). Enforced by the database, not by the form.
3. **How the first password is delivered.** There is no email provider yet. Recommended for now: the Admin sets a temporary password in the dialog, shares it with the college, and the college admin is **forced to change it at first login**. Email invitations and reset links move to Phase C, which is also where password reset for everyone lands.
4. **Do College Admins see a lead's browsing history ("what they clicked before enquiring")?** Recommended **no**: they see the enquiry itself (name, phone, email, what was asked, consent), because the privacy policy says details go to the institution. The journey stays with the main team.
5. **Leads with no college** (general counselling requests) stay with the main team only.

## 4. What the College Admin sees

Sidebar (everything else is absent, and refused if typed into the address bar):

- **Dashboard:** leads received, new leads, and their college page's views and button clicks (from the tracking we already store, filtered by `college_slug`).
- **My college:** the same editor as today, scoped to one college. Tabs: College Info, Courses & Fees, Admissions, Placements, Cut-Offs, Gallery, Infrastructure, Faculty, Compare, Q&A, Scholarships, News, SEO. **Reviews is read-only** (client rule 1.5). Rankings stay fed by the ranking lists, as now. The Administrative tab is not shown to them. In Phase A everything is read-only; in Phase B "Save" becomes "Submit for approval" with a summary of what changed.
- **Leads:** only leads whose `college_slug` is theirs. Status changes and replies work as for admins; replies show their name.
- **My requests** (Phase B): each submitted change with its status and the reviewer's note when rejected.

## 5. What the Admin / Super Admin gets

- **Administrative tab** in the college edit dialog (your screenshot). If no college admin exists: a short form (name, email, temporary password) and a **Create college admin** button. If one exists: their name, email, status, last sign-in, and buttons **Reset password**, **Disable / Enable**, **Remove** (frees the college for a new person).
- **Users page:** a third tab, **College accounts**, showing each account with its college, searchable and paginated like the other two. Admins can enable or disable them (MoM 1.6); creation is from the college's own dialog.
- **Approvals** (Phase B): a queue of pending changes and deletion requests, oldest first, with a field-by-field before and after, Approve and Reject (with a note). Approving writes the change to the live college; rejecting does not.

## 6. Data model

**Migration 033 (Phase A)**
- `userrole` enum gains `COLLEGE_ADMIN`.
- `users.college_id` (UUID, FK to `colleges`, `ON DELETE SET NULL`) and a **unique partial index on `college_id` where `role = 'COLLEGE_ADMIN'`**, which is the one-per-college rule.
- `users.must_change_password` (bool, default false).

**Migration 034 (Phase B)** `change_requests`: `id`, `college_id`, `requested_by`, `kind` (edit or delete), `payload` (JSONB, the proposed college record), `base_updated_at` (the live record's version when they started, to catch someone else having changed it since), `status` (pending, approved, rejected, withdrawn), `reviewed_by`, `review_note`, `created_at`, `decided_at`. The field-level diff is computed on the server by comparing `payload` with the live record.

## 7. Backend design: where the real security is

- **`require_admin` stays as it is** (Admin and Super Admin only). A College Admin therefore cannot reach any of today's admin endpoints by accident.
- **New dependency `StaffScope`** accepts all three admin-panel roles and returns `{role, college_slug | None}`, read from the database on every request (as `require_admin` now does). Only the endpoints a college admin needs use it, and each one applies the scope itself:
  - college record `GET` for their own slug, otherwise 403;
  - leads list, detail, status change, reply: the query is **filtered by `lead.college_slug == their college`** in the repository, so another college's lead is a 404, not a hidden row;
  - analytics for their college only;
  - image uploads (they need them for Gallery), size-capped as now.
- Phase A has **no write endpoint for college content** for this role. Phase B adds `POST /college/change-requests` (create, list own, withdraw) and the admin-side review endpoints. The existing `PUT /{slug}/record` stays Admin and Super Admin only.
- Disabled, removed or moved college admins lose access on their next request, because the role and college come from the database.
- Admin-side endpoints to manage the account: create, reset password (sets a temporary one and `must_change_password`), enable or disable, remove. Each checks the caller is Admin or Super Admin; creating a second admin for the same college is refused with a clear message.

## 8. Frontend design

- `lib/roles.ts` gains `COLLEGE_ADMIN` and `canUsePanel(role)`; the login action, header menu and `/admin` guard use it. The admin cookie is set for all three roles.
- `/admin` layout reads the signed-in role once (from `GET /me`) and gives the shell a **role-filtered nav**. Each admin page that is not allowed for a college admin redirects to their dashboard. This is convenience: the API is the gate.
- Reuse, not rebuild: `CollegeRecordEditor` takes a `mode` (`full`, `readonly`, `submit`) and hides the Administrative tab and the admin-only fields; `LeadsInbox` is reused with the scoped data and without the journey button.
- First login with `must_change_password` goes to a **Set a new password** screen before anything else.
- Idle logout and the consent banner already cover this role (the banner and tracking skip `/admin`).

## 9. Delivery

| Phase | What ships | Rough effort |
|---|---|---|
| **A** | Role, migration 033, Administrative tab (create, reset, disable, remove), login and scoped shell, forced password change, scoped Leads and Dashboard, read-only My college, College accounts tab on Users | 4 to 5 days |
| **N** | Notifications for every role: bell, list, acknowledge, clear all, live updates over a WebSocket (section 11). First sources: new lead for a college, reply to a student, account events | 3 to 4 days |
| **B** | Change requests: submit-for-approval editor with change summary, approvals queue, rejection notes, deletion requests, My requests, stale-edit detection. **Messages** between college admin and platform team (section 11.3) | 7 to 8 days |
| **C** | Email invitations and reset links, email copies of notifications, an audit log of who approved what | 3 to 4 days, shared with Phase 5 |

Order: A, then N, then B. B needs both: approvals are what notifications and messages exist to carry.

## 10. Risks and open points

- **Large records.** A college record includes courses, placements and cut-offs rewritten as a set. A change request stores the whole proposed record, which is simple and exact; a diff view makes it readable. Partial patches would be more compact but harder to get right.
- **Two editors at once.** If an Admin edits a college while a request is pending, the request's `base_updated_at` no longer matches. Approval then shows a warning and asks the reviewer to confirm, rather than silently overwriting.
- **Slug and name.** The page address never changes (already true), so leads and requests stay attached. Renaming a college does not move its leads.
- **Deleting a college** removes its College Admin's link (`SET NULL`); the account is disabled rather than left half-working.
- **Testing.** The scoping rules are the part that must not leak. Phase A should ship with tests that a College Admin cannot read or change another college's record or leads, and cannot call any Admin-only endpoint.

---

## 11. Requests, messages and notifications (added after review)

### 11.1 The flow in one picture

```
College admin edits  ->  "Submit for approval"
                         |
                         v   notification to EVERY Admin and Super Admin (needs acknowledgement)
                   Change request: pending
                         |
        any Admin or Super Admin can open it and review it
                         |
        Approve  ->  change is written to the live college   Reject  ->  nothing changes, reason sent
                         |                                        |
                         v                                        v
     notification to the college admin (needs acknowledgement)  <-+
     the other platform admins' notifications become "Handled by <name>"
```

- **Atomic decision.** Approve and Reject run as one conditional update (`WHERE status = 'pending'`). If two admins click at the same moment, the second is told "already decided by <name>". Nothing is applied twice.
- **Approve writes the change.** Only at that moment is the proposed record applied to the live college, using the same validation as today's editor. A change that no longer validates (for example a similar-college pin that was deleted meanwhile) is refused with a clear message and stays pending.
- **Every request keeps its history:** who proposed it, when, who decided, the note, and when the college admin acknowledged the outcome.

### 11.2 Notifications, for all four roles

One shared system. Recipients are decided on the server, never by the browser.

| Event | Who is notified | Needs acknowledgement |
|---|---|---|
| College admin submits an edit or a deletion request | All Admins and Super Admins | Yes |
| A request is approved or rejected | The college admin who sent it | Yes |
| College admin starts or continues a message thread | All Admins and Super Admins | Yes |
| Platform team replies in a thread | The college admin | Yes |
| New lead for a college | That college's admin | No |
| Reply to a student's enquiry | The student | No |
| Account created, password reset, account disabled or enabled | The person affected | Yes |
| A new college admin or administrator is created | Super Admins | No |

States of one notification: **unread**, then **read** (seen in the list), then **acknowledged** (the person pressed Acknowledge; kept with who and when), then **cleared** (hidden from their list). A notification that needs acknowledgement stays pinned at the top and keeps the badge counting until it is acknowledged.

- **Acknowledge** one, or **Acknowledge all**.
- **Clear all** asks for confirmation, then acknowledges and hides everything in the person's list in one step. The acknowledgement time is still recorded, so a reviewer can see "acknowledged by the college admin on ...".
- **When someone else handles it:** a notification sent to several platform admins is shared work. Once one of them decides the request or answers the thread, everyone else's copy changes to "Handled by <name>", no longer needs acknowledgement, and can be cleared.
- Surfaces: a bell with a count in the admin top bar and in the public site header (for students), a dropdown of the latest, and a full page at `/admin/notifications` and `/account/notifications`.

### 11.3 Messages

A plain thread between a college admin and the platform team, in addition to notifications.

- **Start:** a college admin writes to "TopCollegePath team" about their college, optionally attached to one of their change requests (so a rejection can be discussed in context). It goes to **every** Admin and Super Admin as a shared inbox, not to one person.
- **Platform side:** an inbox listing open threads. The first Admin or Super Admin who replies marks the thread **resolved for the team**: the other platform admins' notifications become "Handled by <name>". They can still read it and add to it.
- **Follow-up:** if the college admin writes again, the thread **reopens** and everyone on the platform side is notified again.
- **Visibility:** a college admin sees only their own college's threads. Platform admins see all. Students never see these.
- **Rejection notes** from a request review are posted into the request's thread, so the whole conversation about one change sits in one place.

### 11.4 Real-time delivery with a WebSocket

- **What goes over the socket:** small events only (`notification.created`, `notification.updated`, `thread.message`). The page then fetches the actual record. The database is the source of truth; the socket is a nudge, so a missed event is never a lost notification.
- **Fallback:** the client reconnects with backoff and fetches anything newer than the last one it saw; if a socket cannot connect at all, it polls every 60 seconds.
- **Several backend workers.** The production image runs two workers, and a notification created in one must reach a socket held by the other. We have no Redis. Recommended: **Postgres `LISTEN/NOTIFY`**. Writing a notification also issues `NOTIFY` with the row's id; each worker listens on one connection and forwards to its own sockets. No new service to run, and it is transactional (nothing is announced for a row that rolled back).
- **Endpoint:** `GET /api/v1/ws`. It sits under `/api/*`, so the existing Caddy rule already routes it to the backend and proxies the upgrade. No new proxy setting.
- **Authentication:** the browser fetches a **60-second, single-use ticket** from a Server Action (which can read the httpOnly cookie) and connects with it. This keeps the token out of the page and away from cross-site hijacking of the socket. The server also checks the account is active, and re-checks it periodically.
- **Revocation:** disabling an account, or an idle sign-out, closes that user's sockets.
- **Limits:** per-user connection cap, message-size cap, and the client only receives; it does not send data over the socket.

### 11.5 Data model (Phase N and B)

- `notifications`: `id`, `recipient_id`, `kind`, `title`, `body`, `link`, `entity_type`, `entity_id`, `requires_ack`, `read_at`, `acknowledged_at`, `cleared_at`, `resolved_by`, `resolved_at`, `created_at`. Index on `(recipient_id, cleared_at, created_at)`.
- `message_threads`: `id`, `college_id`, `subject`, `change_request_id` (nullable), `status` (open or resolved), `created_by`, `resolved_by`, `resolved_at`, `updated_at`.
- `thread_messages`: `id`, `thread_id`, `sender_id`, `body`, `created_at`.
- `change_requests`: as in section 6.
- A single `notify()` service used by every producer, so adding a new event is one call.

### 11.6 API sketch

- `GET /notifications` (paged, filter by unread), `GET /notifications/count`, `POST /notifications/{id}/acknowledge`, `POST /notifications/acknowledge-all`, `POST /notifications/clear-all`, `POST /notifications/{id}/clear`.
- `POST /ws/ticket` (called from the frontend's Server Action), `GET /ws`.
- `GET/POST /threads`, `POST /threads/{id}/messages`, `POST /threads/{id}/resolve`, scoped by role.
- `POST /college/change-requests`, `GET /college/change-requests`, `POST .../withdraw` (college admin). `GET /admin/change-requests`, `GET /admin/change-requests/{id}` (with the field diff), `POST .../approve`, `POST .../reject` (platform).

### 11.7 Decisions to confirm

1. **Clear all** acknowledges as it clears (recorded). The alternative is that Clear all skips anything still needing acknowledgement. Recommended: the first, with a confirmation, because forcing one-by-one acknowledgement of a long list gets bypassed in practice.
2. **A platform reply resolves a thread** for the team, and a follow-up from the college admin reopens it. The alternative is an explicit "Resolve" button only. Recommended: reply resolves, because it matches "once anyone reviews it, it is resolved", with a manual Resolve for threads that need no reply.
3. **Email copies** of notifications wait for Phase C (no email provider yet). Until then, notifications are in the app only, and a person who is not signed in sees them at next login.
4. **Postgres `LISTEN/NOTIFY`** for fan-out across workers, not Redis.
5. **Which events need acknowledgement.** The table in 11.2 is a proposal.
