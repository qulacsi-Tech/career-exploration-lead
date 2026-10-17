# College / University Admin: plan

**Date:** 2026-10-17
**Status:** plan only, for review. No code written.
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

1. **Do College Admin edits go live straight away?** The client wrote **no**: every edit and every deletion is submitted, and an Admin or Super Admin approves it first (1.4, 1.7). So the plan splits delivery: *Phase A* gives the college admin leads plus a **read-only** view of their college, and *Phase B* adds editing through approval. Nothing is ever published without approval.
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
| **B** | Edit through approval: submit-for-approval editor with change summary, approvals queue, rejection notes, My requests, deletion requests, stale-edit detection | 5 to 6 days |
| **C** | Email invitations and reset links, in-app and email notification when a request is decided, an audit log of who approved what | 3 to 4 days, shared with Phase 5 |

## 10. Risks and open points

- **Large records.** A college record includes courses, placements and cut-offs rewritten as a set. A change request stores the whole proposed record, which is simple and exact; a diff view makes it readable. Partial patches would be more compact but harder to get right.
- **Two editors at once.** If an Admin edits a college while a request is pending, the request's `base_updated_at` no longer matches. Approval then shows a warning and asks the reviewer to confirm, rather than silently overwriting.
- **Slug and name.** The page address never changes (already true), so leads and requests stay attached. Renaming a college does not move its leads.
- **Deleting a college** removes its College Admin's link (`SET NULL`); the account is disabled rather than left half-working.
- **Testing.** The scoping rules are the part that must not leak. Phase A should ship with tests that a College Admin cannot read or change another college's record or leads, and cannot call any Admin-only endpoint.
