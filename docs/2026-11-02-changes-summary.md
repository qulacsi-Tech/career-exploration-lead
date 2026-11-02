# What changed on 2 November 2026

A plain-language summary of today's work on TopCollegePath. Each item says what a visitor, a student or the team will now see or be able to do.

---

## 1. College list page

- **Ranking on the left, other rankings on the right.** When someone opens the list through a ranking (for example "NIRF Engineering"), that ranking and the college's place in it now show in the big block on the left. The college's other rankings sit in the top-right chip, and hovering it shows the rest.
- **Rank chip is bigger.** The ranking chip is larger, and the rank number sits in a raised gold square so it stands out.
- **Short names.** Rankings use the short name set in the admin (with the full name on hover); where none is set, the full name is shown.
- **Only rankings with colleges.** The Ranking filter on the left lists only rankings that actually contain colleges.
- **Highest package** now sits in its own tile beside Exams accepted, with even spacing, in one compact row.
- **Badges are now controlled from the admin.** "Featured", "Top rated" and "Most viewed" can be ticked per college under College Info, instead of being worked out automatically.

## 2. College page

- **Bigger logo** on the college masthead.
- **Courses & Fees** counts and lists each course once (for example "PGDM", "MBA"), instead of every specialisation separately.
- **Overview card** never shows an empty white box. Any missing figure shows a soft "No data available" placeholder.
- **Top Recruiters:** each company can show its **logo only** (the default), **name only**, or **both**. The choice is made by clicking the logo in the college editor. Logos are also drawn larger so they are readable.

## 3. Sign-in, registration and student actions

On a college page, **Write a review**, **Ask a question** and **Ask a counsellor** now open a form, but only for signed-in students.

- A visitor who is not signed in gets a compact log-in / create-account window with the TopCollegePath logo and Google sign-in, in the same style as the login page. Registration uses the same fields as the register page.
- Fields are validated as the person types (for example, mobile numbers are capped at 10 digits and must start with 6–9).
- As soon as sign-in works, the page switches to the signed-in view. There is no waiting and no redirect.
- After registering, a short **"One more step"** form asks for state, city, stream and (optionally) the exam they are preparing for. The same details appear on their account page. Then they carry on with what they were doing.

## 4. Questions and answers

- A student's **question or concern** goes to both the platform team and that college's admin.
- **Either can answer.** A platform admin's answer shows as **"Replied by Career Experts"**, a college admin's as **"Replied by College"**. The latest answer replaces the earlier one.
- The platform team decides which answers are **shown on the college's Q&A page**. A college admin's change goes back for approval first.
- Other signed-in students can mark an answer **Helpful**; the count is shown. Visitors who are not signed in are asked to sign in or register first.
- Admins use a new **Questions** screen (platform team: all colleges; college admin: their own college).

## 5. Reviews

- Students write reviews with a course, a batch (for example 2002–2006), star ratings for **Placements, Faculty, Infrastructure and Campus life**, and a written review.
- A new review **waits for approval** by the platform team before it appears. It does not go to the college admin.
- Each review now has **Like and Dislike** buttons with counts (sign-in required). The old "Report" link is removed. The platform team can see the likes and dislikes in the college editor.

## 6. Student account

New **Questions** and **Reviews** tabs show everything the student has asked or written, with its status (waiting, answered, live, waiting for approval) and who replied. The **Activity** timeline now includes questions, answers and reviews.

## 7. Admin panel

- **Sidebar regrouped** into clearer folders: Colleges (All Colleges, Collections, Rankings), Courses (Catalogue, Online Programmes), Exams, Website (Homepage, Navigation, News, Login & Signup), Leads, Activity (Questions, Approvals, Messages, Notifications) and Settings. "Articles" is renamed **News**.
- **Analytics button on the college list.** One window per college with an overview (page views, leads, questions, reviews, and what needs attention), plus tabs for its leads, Q&A and reviews.
- **Sponsored colleges.** A college can be marked **Sponsored** in the editor. The platform team can then pick leads (by hand, or "the newest 50" filtered by stream, city or type) and **share them in bulk** with that college. Only leads whose sender agreed to be contacted can be shared. The college admin sees them in their own Leads inbox, marked "Shared with you", and can export them. Shared leads can be taken back.

## 8. Smaller fixes

- A harmless build warning about the page-search highlight colours was removed.

---

## Notes for the technical team

Five new database migrations (052–056) were added: listing badges, recruiter display mode, questions, review votes, and sponsored colleges / lead sharing. They run with the usual `alembic upgrade head`; restart the backend afterwards.
