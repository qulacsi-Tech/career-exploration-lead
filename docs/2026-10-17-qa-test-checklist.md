# QA test checklist: accounts, college admin, notifications and tracking

**Date:** 2026-10-17
**For:** the testing team
**What this covers:** everything built on 17 October 2026 on top of the existing site.

> **Status of the build:** none of this has been run end to end against a database by the developers. It has been type-checked and linted only. Expect to find bugs, and please report each with the test ID, the account used, what you did, what you expected and what happened (screenshots and the browser console help).

---

## 0. Before you start

### 0.1 Environment

| Item | Value |
|---|---|
| Website | `http://localhost:3000` (or the test server) |
| API | `http://localhost:8000/api/v1` |
| API docs (Swagger) | `http://localhost:8000/api/docs` |
| Database | The backend must be **restarted** first so migrations 029 to 036 apply (it applies them at start-up). |
| Google sign-in | Needs `GOOGLE_CLIENT_ID` in the backend `.env` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in the frontend `.env.local`, with the site address under *Authorised JavaScript origins* in Google Cloud. Restart both after changing them. |
| Browsers | Test in at least Chrome plus one other. Use a **private window** for each extra account so sessions do not mix. |

### 0.2 Accounts you will need

Create these once and reuse them. "Platform" means the TopCollegePath team.

| Name used below | How to get it | Role |
|---|---|---|
| **Super Admin** | The account made from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (the migration promotes the oldest admin to Super Admin) | Super Admin |
| **Admin** | Super Admin: Users, **Add administrator**, role *Admin* | Admin |
| **Student A** | Register at `/register` with email and password | Student |
| **Student B (Google)** | Sign in with a Google account that has no account yet | Student, no password |
| **College Admin 1** | Admin: open college **X** in `/admin/colleges`, tab **Administrative**, create | College admin of college X |
| **College Admin 2** | Same, for a different college **Y** | College admin of college Y |

Note two colleges, **X** and **Y**, and send a few enquiries to each as a student (see section 3), with the consent box ticked.

### 0.3 Things that are intentionally not there yet

- No emails are sent anywhere (no password reset by email, no email verification, no email copies of notifications).
- A college admin can edit but cannot publish: every change goes through approval.
- The Messages and Approvals pages do not refresh by themselves; reload to see new items. The bell updates live for staff.
- The "Forgot password" screen was removed on purpose (section 1.8).

---

## 1. Sign-up, sign-in and passwords

Routes: `/login`, `/register`, `/change-password`, `/account`. API: `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`, `GET/PATCH /me`, `POST /me/password`, `POST /me/password/set`.

| ID | Test | Steps | Expected |
|---|---|---|---|
| AUTH-01 | Register with email | `/register`: fill name, email, optional phone, password (letter + number, 8+), confirm, tick terms, submit | Account is created **and you are signed in**, landing on `/account?welcome=new` with the banner "Your account is created". Header shows your name. |
| AUTH-02 | Register validation | Submit with a short password, a mismatching confirm, no terms, a bad email, a bad phone | Each shows a message beside the field. Nothing is created. |
| AUTH-03 | Duplicate email | Register again with an existing email | "An account with this email already exists." under the email field. |
| AUTH-04 | Login (student) | `/login` with Student A | Lands on `/account` (or the `?next=` page if you came from one). |
| AUTH-05 | Login (platform admin) | `/login` with Admin or Super Admin | Lands on `/admin`. |
| AUTH-06 | Wrong password | Wrong password for a real account | "Invalid email or password." Same message for an unknown email. |
| AUTH-07 | Show / hide password | On `/login`, `/register` (both fields), `/change-password` (all three), `/account` Password card, **Add administrator** dialog, college **Administrative** tab (create and reset), Users **Reset password** dialog: click the eye | Text shows and hides. The button is a real button (works by keyboard). |
| AUTH-08 | Safe `?next=` | Open `/login?next=https://evil.example` and `/login?next=//evil.example`, sign in | Never leaves the site; goes to `/account`. `?next=/account/enquiries` works. |
| AUTH-09 | Header menu | Signed in: click your name | Menu shows **My account**, **Log out**, and **Admin panel** for any panel role. Logging out clears the session. |
| AUTH-10 | Sign in with Google (new) | `/login` or `/register`: **Continue with Google**, choose an account with no account yet | New account created. Lands on `/account?welcome=new`, banner "Welcome, <name>! Your account is created". Avatar/name from Google in the header. |
| AUTH-11 | Sign in with Google (existing email) | Register Student A by email, then sign in with Google using the **same email** | Signs in to the **same** account (no duplicate in Users). Banner says "Welcome back". |
| AUTH-12 | Google, missing config | Remove the client ID and reload `/login` | In development a dashed note explains the button is missing. In production no button. |
| AUTH-13 | Google account adds a password | Student B (Google): `/account`, **Add a password**, enter password twice, save | "Your password is saved." Log out. Sign in at `/login` with the email and that password. Also check **Continue with Google** still works. |
| AUTH-14 | Add password twice | After AUTH-13, the card now says **Change password** | Needs the current password. A wrong current password is refused. |
| AUTH-15 | Google-only account tries a password | Student B before adding a password: sign in with email + any password | "This account uses Google sign-in. Choose Continue with Google." |
| AUTH-16 | Change password | `/account` as Student A: current, new, confirm | Saved. Old password no longer works; new one does. |
| AUTH-17 | Lockout | Enter a wrong password **5 times** for one account, then the right one | The right one is refused: "Too many failed sign-in attempts. Try again in N minutes." After 15 minutes (or an admin reset, AUTH-19) it works. A good sign-in resets the count. |
| AUTH-18 | Temporary password | See ADM-10 and COL-03 | After signing in with a temporary password you are sent to `/change-password`; nothing else opens until it is replaced. |
| AUTH-19 | Reset clears a lockout | Lock an account (AUTH-17), then an admin resets its password (ADM-10) | The person can sign in with the temporary password. |
| AUTH-20 | Idle sign-out | Sign in, do nothing for **3 minutes** (tip: ask a developer to shorten `IDLE_BEFORE_WARNING_MS` in `components/auth/idle-logout.tsx` to test faster) | A dialog "Are you still there?" counts down 60 seconds. **Stay signed in** restarts the clock. Doing nothing signs you out and `/login` says you were signed out for inactivity. **Log out now** works. |
| AUTH-21 | Idle across tabs | Two tabs signed in. Work in tab 1 only | Tab 2 does not time out while tab 1 is active. Signing out in one tab signs out the other. |
| AUTH-22 | Forgot-password removed | Look at `/login`. Open `/forgot-password` | No "Forgot password?" link. `/forgot-password` redirects to `/login`. |

## 2. My account (student area)

Routes: `/account` (Profile), `/account/enquiries`, `/account/replies`, `/account/notifications`, `/account/activity`. API: `GET /me`, `PATCH /me`, `GET /me/leads`, `GET /me/activity`, `POST /me/replies/read`, `GET /geo/india`.

| ID | Test | Steps | Expected |
|---|---|---|---|
| ACC-01 | Access | Open `/account` signed out | Redirects to `/login?next=/account`, and returns after sign-in. |
| ACC-02 | Header block | Signed in | Avatar (or initial), name, email ("Google account" if Google), **Member ID** like `TCP-U-XXXXXXXX`. |
| ACC-03 | Tabs | Click Profile, Enquiries, Replies, Notifications, Activity | Each opens; the active tab is highlighted. Enquiries shows a count; Replies shows an unread count. |
| ACC-04 | Dropdowns | Profile tab | **State** and **City** are dropdowns (state first, then its districts, plus "Other: type the city"). **Stream** and **Exam** are dropdowns fed from admin data. None is free text. |
| ACC-05 | Save profile | Choose values, add a phone, save; reload | Values persist and show selected again. Changing the state clears the old district. A typed city under "Other" comes back correctly. |
| ACC-06 | Invalid phone | Enter `12` | Rejected with a message. |
| ACC-07 | Prefill | After ACC-05, open `/enquiry` | Name, email, phone and stream are filled in. Anything you already typed is not overwritten. |
| ACC-08 | Enquiries tab | After sending enquiries (section 3) | Each shows college/programme, type, date, status chip, your message, and a reference `TCP-XXXXXXXX`. Empty state has a "Request a callback" button. |
| ACC-09 | Replies tab | After an admin replies (LEAD-06) | The reply shows under the right enquiry with the sender name; unread ones are highlighted and marked "New". Opening the tab clears the unread count. |
| ACC-10 | Activity tab | Browse a few college pages (analytics accepted), click buttons, send an enquiry | Timeline of: account created, last sign-in, enquiries sent, replies received, **colleges/exams/programmes viewed**, **buttons clicked**. Newest first. |
| ACC-11 | Anonymous activity attaches | Browse as a visitor (accept analytics), then sign in | The pages you viewed before signing in appear in Activity. |
| ACC-12 | Past leads claimed | Send an enquiry anonymously with email `e`, then sign in with Google using email `e` | The earlier enquiry appears under Enquiries. |

## 3. Enquiries (leads) and the admin inbox

Routes: `/enquiry`, college pages (`/college/<slug>`, `?enquire=1` opens the dialog), `/admin/leads`, `/admin/leads/export`. API: `POST /leads`, `GET /admin/leads`, `PATCH /admin/leads/{id}`, `POST /admin/leads/{id}/replies`, `GET /admin/leads/export.csv`, `GET /admin/leads/{id}/journey`.

| ID | Test | Steps | Expected |
|---|---|---|---|
| LEAD-01 | Submit (anonymous) | `/enquiry`, fill everything, tick consent, submit | Success panel with a reference. Lead appears in `/admin/leads`. |
| LEAD-02 | Nothing is lost | Open the lead's **Details** in the admin inbox | Shows stream, city, message, programme, "came from", consent "Given", and the college if there was one. (Before this work these were dropped.) |
| LEAD-03 | Validation | Submit with no consent, a bad email, no stream | Messages beside each field; form keeps what you typed. |
| LEAD-04 | Repeat enquiry | Submit the same enquiry (same phone, college, programme) twice within 24 hours | No error. The visitor sees the normal success. In the admin Details, "Asked again: 1 more time". Only one lead row. |
| LEAD-05 | Signed-in enquiry | Send as Student A | Lead shows "Signed in when sent". It appears in the student's Enquiries tab. |
| LEAD-06 | Admin reply | Admin inbox, open Details on Student A's lead, write a reply, send | Appears in the Details. The student gets a notification and sees it under Replies. For an **anonymous** lead there is no reply box, only a note to call. |
| LEAD-07 | Status | Change status in the inbox | Saved; filter chips (`New`, `Contacted`, ...) filter correctly. |
| LEAD-08 | Journey | Open Details on a lead from a visitor who accepted analytics, **Show pages and clicks** | Timeline of pages and clicks before the enquiry, plus first-visit source and device. Not shown when the visitor had not accepted analytics. |
| LEAD-09 | Export CSV | Click **Export CSV** (also with a status filter in view) | A `leads-<date>.csv` downloads. Opens in Excel with correct characters (including non-English names). Respects the filter. |
| LEAD-10 | CSV safety | Send a lead whose name is `=1+1` and export | In the file the cell starts with an apostrophe (text), not a calculated `2`. |
| LEAD-11 | Enquiry route in production | On the deployed site, send an enquiry | Works. (Previously the old `/api/enquiry` address never reached the app.) |

## 4. Consent banner and visitor tracking

Routes: banner on all public pages; `POST /collect` (the browser sends batches here, not to be called by hand); admin `/admin/analytics`. API: `POST /track`, `GET /admin/analytics`.

| ID | Test | Steps | Expected |
|---|---|---|---|
| TRK-01 | Banner | First visit (private window) | Bottom banner: "We use cookies to understand how you use TopCollegePath ..." with **No thanks** / **Accept** and a privacy link. Not shown on `/admin`. |
| TRK-02 | Decline | Click **No thanks**, browse and click around | Banner disappears and does not return. No `tcp_vid` cookie is set. Nothing is recorded (nothing in analytics, no requests to `/collect` in the Network tab). |
| TRK-03 | Accept | Click **Accept**, browse | `tcp_consent=granted` and `tcp_vid` cookies are set. The page you are on counts as viewed. |
| TRK-04 | Events | After accepting: view college pages, click Request a Callback / Apply Now / Brochure, scroll, search, add to compare, start and send an enquiry form | `/admin/analytics` later shows page views, button clicks, searches, and the funnel steps. Batches are sent about every 15 seconds, or when you leave/hide the page. |
| TRK-05 | Dashboard | `/admin/analytics`, switch 7/14/30/90 days | Tiles (visitors, visits, page views, enquiries, new accounts), a visitors-per-day chart, the funnel, sources, devices, top pages, top buttons, top colleges. Empty periods show a message, not an error. |
| TRK-06 | Admin not tracked | Browse `/admin/...` with analytics accepted | Nothing from admin pages is recorded. |
| TRK-07 | Bots | Call the site with `curl` using a `bot` user agent | Nothing is recorded. |
| TRK-08 | Privacy page | `/privacy` | Mentions Google sign-in, the optional analytics cookie, what is recorded, and 13-month retention. |

## 5. Admin: Users, roles and permissions

Routes: `/admin/users`, `/admin/users/[id]`. API: `GET /admin/users` (`?group=general|administrative|college`, `page`, `q`), `GET /admin/users/counts`, `GET /admin/users/{id}`, `PATCH /admin/users/{id}`, `POST /admin/users`, `POST /admin/users/{id}/reset-password`.

**Permission matrix to verify**

| Action | Super Admin | Admin | College Admin | Student |
|---|---|---|---|---|
| Open `/admin/users` | Yes | Yes | No (sent back to dashboard) | No |
| Create Admin / Super Admin | Yes | **No** | No | No |
| Enable / disable a student | Yes | Yes | No | No |
| Enable / disable a college admin | Yes | Yes | No | No |
| Enable / disable an Admin or Super Admin | Yes | **No** (read only) | No | No |
| Disable their own account | **No** | **No** | n/a | n/a |
| Reset a student's or college admin's password | Yes | Yes | No | No |
| Reset an Admin's or Super Admin's password | Yes | **No** | No | No |

| ID | Test | Steps | Expected |
|---|---|---|---|
| ADM-01 | Three tabs | `/admin/users` | **General accounts**, **Administrative accounts**, **College accounts**, each with a count. General lists students; Administrative lists Admins and Super Admins with a role badge; College lists college admins with their college. |
| ADM-02 | Pagination and search | With more than 25 accounts, page through each tab; search by name and email | The page, tab and search are in the URL. Pagination is done by the server (25 per page). |
| ADM-03 | Add administrator | Super Admin: **Add administrator**, fill, choose a role | Account appears under Administrative. They can sign in. |
| ADM-04 | Admin cannot add | Sign in as Admin | No **Add administrator** button. A direct API call (`POST /admin/users`) returns 403. |
| ADM-05 | Admin vs administrators | As Admin, open the Administrative tab | List is visible but there are no Enable/Disable/Reset buttons on administrator rows. API `PATCH /admin/users/<super admin id>` returns 403. |
| ADM-06 | Disable a student | Admin or Super Admin, **Disable** (confirm) on a student | Student cannot sign in ("This account has been disabled"). **Enable** restores. |
| ADM-07 | Disabled takes effect now | While a disabled user is signed in, disable them | Their next request fails; a disabled admin loses access at once, not when the token expires. |
| ADM-08 | Not yourself | Look at your own row | No Disable / Reset buttons on it. API refuses. |
| ADM-09 | Detail page | Click a user's name | Profile facts, their enquiries, and activity timeline (if they accepted analytics). Buttons follow the matrix. |
| ADM-10 | Reset password | Row or detail page: **Reset password**, enter a temporary password | Confirms "pass it on now". The person signs in with it and is sent to `/change-password` (AUTH-18). Works for students as well as staff. |
| ADM-11 | Weak temporary password | Enter `abc` | Refused with the password rule. |
| ADM-12 | Sidebar footer | Look at the bottom of the admin sidebar | Shows the **real** signed-in name and role (not "Asha Menon"). |

## 6. College / University admin

### 6.1 Creating and managing the account (platform side)

Route: `/admin/colleges` → open a college → **Administrative** tab. API: `GET|POST|PATCH|DELETE /admin/colleges/{slug}/admin`, `POST /admin/colleges/{slug}/admin/reset-password`.

| ID | Test | Steps | Expected |
|---|---|---|---|
| COL-01 | Create | Open college X, **Administrative**, enter name, email, temporary password, **Create** | Account created and shown with status Active and "Still on the temporary password". Platform admins get a notification. |
| COL-02 | One per college | Try to create a second admin for the same college | Not offered in the UI; API returns 409 "already has an admin". |
| COL-03 | First sign-in | Sign in as College Admin 1 | Sent to `/change-password`. Cannot open the panel until a new password is saved; then lands on `/admin`. |
| COL-04 | Reset | **Reset password** in the tab | New temporary password; they must change it at next sign-in. |
| COL-05 | Disable / Enable | Disable, then try to sign in; Enable | Disabled cannot sign in. Enabled can. |
| COL-06 | Remove | **Remove** (confirm) | Account gone; the college can be given a new admin. Platform admins get a notification. |
| COL-07 | College accounts tab | `/admin/users?tab=college` | Lists them with their college; Enable/Disable/Reset work as in section 5. |

### 6.2 What a college admin sees

| ID | Test | Steps | Expected |
|---|---|---|---|
| COL-10 | Menu | Sign in as College Admin 1 | Sidebar has only: **Dashboard**, **Notifications**, **College record**, **My requests**, **Messages**, **Leads (Inbox)**. |
| COL-11 | Wrong pages | Type `/admin/users`, `/admin/colleges`, `/admin/analytics`, `/admin/approvals` | Sent back to `/admin`. (And the API refuses even if the address bar is bypassed, see section 11.) |
| COL-12 | Dashboard | `/admin` | Their college name, tiles (enquiries, new enquiries, page views, visitors, button clicks over 14 days) and two charts. Numbers are for **their college only**. |
| COL-13 | Leads | `/admin/leads` | Only enquiries for **their** college **where the sender agreed to be contacted**. No "Show pages and clicks" button. Status changes and replies work. Replies show as "<name>, <college>". |
| COL-14 | Leads export | **Export CSV** | Only their consented leads; no "Came from" column. |
| COL-15 | New lead notification | Student sends an enquiry to college X with consent | College Admin 1's bell shows "New enquiry from ...". Not shown for college Y's admin. |

### 6.3 Editing through approval (college side)

Routes: `/admin/college`, `/admin/requests`. API: `GET /college/record`, `POST /college/change-requests`, `GET /college/change-requests`, `POST /college/change-requests/{id}/withdraw`.

| ID | Test | Steps | Expected |
|---|---|---|---|
| REQ-01 | Edit tabs | `/admin/college`, **Edit your college** | The college editor opens with all tabs **except Administrative**. **Reviews** is visible but read-only with a note. |
| REQ-02 | View only | **View the record** | Same tabs, every field disabled, no save. |
| REQ-03 | Submit | Change a field (e.g. About), optionally add a note, **Submit for approval** | Confirmation; banner "waiting for review". **The live college page is unchanged.** |
| REQ-04 | No changes | Open the editor and submit without changing anything | Refused ("You have not changed anything"). The Submit button stays disabled until something changes. |
| REQ-05 | One at a time | While one is waiting, try to edit again | **Edit** is replaced by view only; the API refuses a second request (409). |
| REQ-06 | My requests | `/admin/requests` | Each request with kind, date, status, your note, the reviewer's reason if rejected. |
| REQ-07 | Withdraw | **Withdraw** a waiting request | Becomes "Withdrawn"; platform admins' notification turns to "Handled by <name> (withdrawn)"; you can submit again. |
| REQ-08 | Removal request | **Ask to remove the college**, give a reason, send | A removal request is created (reason required, 5+ characters). The college stays live. |
| REQ-09 | Reviews protected | Try to change a review in the Reviews tab | Fields are disabled. Even a hand-made request keeps the reviews unchanged. |

## 7. Approvals (platform side)

Routes: `/admin/approvals`, `/admin/approvals/[id]`. API: `GET /admin/change-requests`, `GET /admin/change-requests/{id}`, `POST .../approve`, `POST .../reject`.

| ID | Test | Steps | Expected |
|---|---|---|---|
| APP-01 | Notification | After REQ-03, as Admin / Super Admin | Bell shows "<College> submitted an edit for approval", pinned and asking for acknowledgement, with a link to the request. **Every** Admin and Super Admin receives it. |
| APP-02 | Queue | `/admin/approvals` | **Waiting** tab lists pending requests oldest first; **Decided** and **All** tabs work; paginated. |
| APP-03 | Comparison | Open a request | Field-by-field "Now" and "Proposed". Lists (courses, gallery, etc.) show what was added, removed and edited. The college's note is shown. Links to the live page and conversation. |
| APP-04 | Approve | **Approve and publish** | Request becomes Approved. **The public college page now shows the change.** College Admin gets a notification (needs acknowledgement). Other platform admins' notifications show "Handled by <you>". |
| APP-05 | Reject | **Reject**, enter a reason | Becomes Rejected. College Admin sees the reason in **My requests**, gets a notification, and the reason appears in a Messages conversation they can answer. The live college is unchanged. Reason is required. |
| APP-06 | First decision wins | Two admins open the same request; one approves, the other then approves or rejects | The second gets "Already approved by <name>". Nothing is applied twice. |
| APP-07 | Stale warning | Open a request, then edit the same college in the platform editor and save, then approve | A warning says the college changed after the edit was written; approving asks you to confirm before overwriting. |
| APP-08 | Approve a removal | Approve a removal request (on a **test** college) | The college is deleted. Do not run this on real data. |
| APP-09 | Admin only | As College Admin open `/admin/approvals` | Sent back to `/admin`; API returns 403. |

## 8. Messages

Route: `/admin/messages` (one page; shows a different view per role). API: college side `GET|POST /college/threads`, `GET /college/threads/{id}`, `POST /college/threads/{id}/messages`; platform side `GET /admin/threads`, `GET /admin/threads/{id}`, `POST /admin/threads/{id}/messages`, `POST /admin/threads/{id}/resolve`.

| ID | Test | Steps | Expected |
|---|---|---|---|
| MSG-01 | Start (college) | College admin: **New message** (or "Write to the team about this" on a request), subject and text, send | Conversation opens. Every Admin and Super Admin gets a pinned notification "Message from <college>". |
| MSG-02 | Platform inbox | Admin: `/admin/messages` | Shared list with filters **Waiting / Resolved / All**; each row shows the college, subject, last message, status. |
| MSG-03 | Reply resolves | Admin A replies | Thread becomes **Resolved** for the team. Admin B's notification turns to "Handled by Admin A". The college admin gets a notification. |
| MSG-04 | Follow-up reopens | College admin writes again | Thread returns to **Waiting**; all platform admins are notified again. |
| MSG-05 | Mark handled | Admin: **Mark handled** on a waiting thread | Resolved without a reply; others see "Handled by". |
| MSG-06 | Scope | College Admin 2 tries to open College Admin 1's thread id | Not found (404). Each college sees only its own conversations. |
| MSG-07 | Students | A student opens `/admin/messages` | Cannot (no admin access). |

## 9. Notifications and live updates

Routes: bell in the admin top bar and the public header; full pages `/admin/notifications` and `/account/notifications`. API: `GET /notifications`, `GET /notifications/count`, `POST /notifications/read`, `POST /notifications/{id}/acknowledge`, `POST /notifications/{id}/clear`, `POST /notifications/acknowledge-all`, `POST /notifications/clear-all`, `POST /ws/ticket`, WebSocket `GET /ws`.

| ID | Test | Steps | Expected |
|---|---|---|---|
| NOT-01 | Bell count | Cause a notification (e.g. reply to a student's enquiry) | The bell shows a count. Red when something still needs acknowledging. |
| NOT-02 | Open list | Click the bell | Latest notifications; unread ones are dotted; opening marks them seen, but anything needing acknowledgement **keeps the count up**. |
| NOT-03 | Acknowledge | Click **Acknowledge** on a pinned one | It stops being pinned and shows "Acknowledged <time>". Count drops. |
| NOT-04 | Cannot clear unacknowledged | Try to clear a pinned one | There is no clear (x) button until it is acknowledged. (API returns an error.) |
| NOT-05 | Acknowledge all | **Acknowledge all (n)** | All pinned become acknowledged. |
| NOT-06 | Clear all | **Clear all** | Asks for confirmation (mentions how many still need acknowledging). Afterwards the list is empty and the count is 0. The acknowledgement time is still kept. |
| NOT-07 | Handled by | Admin A decides a request; look at Admin B's bell | Admin B's copy reads "Handled by Admin A" and no longer asks for acknowledgement. |
| NOT-08 | Live update (staff) | Two windows: admin in one, a student sends an enquiry / college admin submits an edit in the other | The admin's bell updates **without a reload** (within about a second). |
| NOT-09 | Live update (other tab) | Same admin in two tabs; acknowledge in one | The other tab's count updates. |
| NOT-10 | Student, no socket | As a student, open DevTools, Network, filter "WS" | **No WebSocket** for students. The count loads with the page and refreshes when you return to the tab after a while. |
| NOT-11 | Staff socket | As an admin, Network, WS | One socket to `/api/v1/ws?ticket=...`. No repeating "count" requests while it is connected. |
| NOT-12 | Reconnect | Stop and restart the backend while an admin page is open | The socket reconnects on its own (retries with a growing delay). Counts correct afterwards. |
| NOT-13 | Hidden tab | Leave an admin tab in the background for 5+ minutes, then return | Socket closes in the background and reconnects on return; counts are current. |
| NOT-14 | Full pages | `/admin/notifications`, `/account/notifications` | The same list as the bell, latest 50. Public header bell links to the right page for the role. |
| NOT-15 | Which events | Check these notify the right people: new consented lead → that college's admin; reply to enquiry (by platform or college admin) → the student; request submitted → all Admins + Super Admins; request approved/rejected → the college admin; message from college → all platform admins; reply → the college admin; college admin created/removed → platform admins (not the one who did it) | Each arrives once, with the right link. |
| NOT-16 | Privacy of notifications | Try to acknowledge another person's notification id via the API | Not found (404). |

## 10. Admin panel housekeeping

| ID | Test | Steps | Expected |
|---|---|---|---|
| NAV-01 | Removed items | Check the sidebar as Admin | No **Community**, **SEO**, **Enquiry Forms**, **Integrations**, **Locations** or **Static Pages** entries (their pages never existed). Every remaining link opens a real page. |
| NAV-02 | Platform menu | Admin sidebar | Overview: Dashboard, **Approvals**, **Messages**, **Notifications**. Leads: Inbox, **Visitor Analytics**. Settings: **Users & Roles**, Site Settings. |
| NAV-03 | Signed-in user | Footer of the sidebar | Real name and role label (Super admin / Admin / College admin). |

## 11. Security and negative tests (please try to break these)

These are the rules most important to get right. All should be refused.

| ID | Attempt | Expected |
|---|---|---|
| SEC-01 | College Admin 1 requests `GET /college/leads` and checks no lead for college Y appears (or its CSV) | Only college X's consented leads. |
| SEC-02 | College Admin 1 calls `PATCH /college/leads/<id of a college Y lead>` and `POST .../replies` | 404. |
| SEC-03 | College Admin 1 calls any `/admin/...` endpoint (leads, users, analytics, change-requests, a college record) | 403. |
| SEC-04 | Admin / Super Admin calls `/college/...` endpoints | 403 (they use the admin versions). |
| SEC-05 | Any request to a protected endpoint without a token | 401. |
| SEC-06 | Use a disabled account's old token | 401 straight away. |
| SEC-07 | College admin on a temporary password calls `/college/...` | 403 with code `PASSWORD_CHANGE_REQUIRED`; `/me` still works so they can change it. |
| SEC-08 | A socket ticket (from `POST /ws/ticket`) used as `Authorization: Bearer` | 401. A ticket used twice for `/ws` | Second connection refused. |
| SEC-09 | Open the socket from a page on another origin | Refused (origin check). |
| SEC-10 | Student tries `/admin` | Sent to login; API 403. |
| SEC-11 | An Admin tries to create an administrator, disable a Super Admin, or reset one's password via the API | 403. |
| SEC-12 | `/login?next=` with an external address | Ignored. |
| SEC-13 | Submit an enquiry with the hidden "company" box filled | Appears to succeed but is not stored (spam trap). |
| SEC-14 | Submit more than 5 enquiries in a minute from one address | Rate limited with a message. |
| SEC-15 | Stored text with HTML or `<script>` in name, message, notes, reply, thread | Shown as text everywhere, never run. |

## 12. Regression areas (existing features touched)

Please do a quick pass on these, because shared code changed.

- Public site: home, college listing, college detail (all tabs), compare tray, exams, articles, study abroad, search. Pages should load as before and stay fast.
- Existing **enquiry modal** on a college page (`?enquire=1&program=...`).
- Admin: **Colleges** list and the full college editor (all tabs and Save), Exams, Articles, Courses, Programmes, Rankings, Collections, Sections.
- Admin **Leads inbox** status filter and pagination.
- Admin **dashboard** numbers.
- Logging out from the admin sidebar ends both the admin and student session.

---

## Appendix A: pages (routes) by role

| Route | Who | Purpose |
|---|---|---|
| `/login`, `/register` | Everyone | Sign in, sign up (email or Google) |
| `/change-password` | Anyone on a temporary password | Replace it before continuing |
| `/forgot-password` | Everyone | Redirects to `/login` (reset is by an admin) |
| `/enquiry` | Everyone | Counselling enquiry form |
| `/account` | Signed in | Profile, welcome message, Password card |
| `/account/enquiries` | Signed in | Their enquiries |
| `/account/replies` | Signed in | Replies to their enquiries |
| `/account/notifications` | Signed in | Notifications |
| `/account/activity` | Signed in | Timeline of what they did |
| `/admin` | Panel roles | Platform dashboard; college dashboard for a college admin |
| `/admin/leads` | Panel roles | Lead inbox (all leads, or the college's own) |
| `/admin/leads/export` | Panel roles | CSV download |
| `/admin/analytics` | Admin, Super Admin | Visitor analytics |
| `/admin/users`, `/admin/users/[id]` | Admin, Super Admin | Accounts, roles, resets |
| `/admin/colleges` | Admin, Super Admin | Colleges list and editor (Administrative tab) |
| `/admin/approvals`, `/admin/approvals/[id]` | Admin, Super Admin | Review college admins' changes |
| `/admin/messages` | Panel roles | Conversations (platform inbox or college view) |
| `/admin/notifications` | Panel roles | Notifications |
| `/admin/college` | College admin | Their college: edit for approval, view, ask for removal |
| `/admin/requests` | College admin | Their change requests |
| `/collect` | Browser only | Receives analytics batches (not for manual use) |

## Appendix B: API routes added or changed (prefix `/api/v1`)

| Area | Routes |
|---|---|
| Auth | `POST /auth/register` (phone, marketing consent), `POST /auth/login` (lockout), `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout` |
| Me | `GET /me`, `PATCH /me`, `POST /me/password`, `POST /me/password/set`, `GET /me/leads`, `GET /me/activity`, `POST /me/replies/read` |
| Geo | `GET /geo/india` (states and districts) |
| Leads | `POST /leads` (more fields, links the user), `GET /admin/leads`, `PATCH /admin/leads/{id}`, `POST /admin/leads/{id}/replies`, `GET /admin/leads/export.csv`, `GET /admin/leads/{id}/journey` |
| Tracking | `POST /track` (called by the site's server), `GET /admin/analytics` |
| Users (platform) | `GET /admin/users`, `GET /admin/users/counts`, `GET /admin/users/{id}`, `PATCH /admin/users/{id}`, `POST /admin/users`, `POST /admin/users/{id}/reset-password` |
| College admin account | `GET|POST|PATCH|DELETE /admin/colleges/{slug}/admin`, `POST /admin/colleges/{slug}/admin/reset-password` |
| College portal | `GET /college/me`, `/college/record`, `/college/pools`, `/college/dashboard`, `/college/leads`, `/college/leads/export.csv`, `PATCH /college/leads/{id}`, `POST /college/leads/{id}/replies` |
| Change requests | College: `POST|GET /college/change-requests`, `POST /college/change-requests/{id}/withdraw`. Platform: `GET /admin/change-requests`, `GET /admin/change-requests/{id}`, `POST .../approve`, `POST .../reject` |
| Messages | College: `GET|POST /college/threads`, `GET /college/threads/{id}`, `POST /college/threads/{id}/messages`. Platform: `GET /admin/threads`, `GET /admin/threads/{id}`, `POST /admin/threads/{id}/messages`, `POST /admin/threads/{id}/resolve` |
| Notifications | `GET /notifications`, `GET /notifications/count`, `POST /notifications/read`, `POST /notifications/{id}/acknowledge`, `POST /notifications/{id}/clear`, `POST /notifications/acknowledge-all`, `POST /notifications/clear-all`, `POST /ws/ticket`, WebSocket `/ws` |

## Appendix C: automated tests

20 backend tests cover the access rules (college admin walls, role matrix, lockout, socket ticket, CSV safety, change-request flow, messages). They run in CI after the seed step (`pytest` in `backend/`). They have not been run yet; if one fails in CI, that is a lead for manual testing of the same area.
