"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ApiError, getCollegeQuestions, getExams, getHomeData, getIndiaGeo, getMe, getReviewVotes, postHelpful, postReviewVote, postQuestion, postReview, submitLead, updateMe, type CollegeQuestion, type IndiaGeo, type ReviewInput, type ReviewVotes } from "@/lib/api";
import { CONSENT_COOKIE, VISITOR_COOKIE } from "@/lib/analytics-cookies";
import { getUserToken } from "@/lib/user-session";
import { phoneProblem, stripPhone } from "@/lib/field-rules";

/**
 * What a signed-in student can do on a college's pages: write a review, ask a question, ask a counsellor.
 *
 * Each one needs the student session (the dialogs sign people in first), and says so plainly when it is
 * missing, so an expired session sends the person back to sign in instead of failing quietly.
 */
export type EngageResult = { ok: true; message: string } | { ok: false; message: string; needsSignIn?: boolean };

const SIGN_IN: EngageResult = { ok: false, needsSignIn: true, message: "Please sign in to continue." };

/** Saves a review. It waits for the platform team to approve it before it shows. */
export async function submitReview(slug: string, input: ReviewInput): Promise<EngageResult> {
  const token = await getUserToken();
  if (!token) return SIGN_IN;
  try {
    const result = await postReview(slug, input, token);
    revalidatePath(`/college/${slug}`, "layout");
    return { ok: true, message: result.message };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return SIGN_IN;
    return { ok: false, message: err instanceof ApiError ? err.message : "We could not save your review just now. Please try again." };
  }
}

export type QueryInput = {
  /** A question or concern for the college, or a request to be called by a counsellor. */
  kind: "query" | "concern" | "counsellor";
  message: string;
  /** Asked for only when the account has no number yet. */
  phone?: string;
  sourceUrl?: string;
};

/**
 * Sends a question, a concern or a counselling request to the team as a lead tied to the student's account.
 * Their name, email and number come from the account, so nothing is typed twice.
 */
export async function submitCollegeQuery(slug: string, input: QueryInput): Promise<EngageResult> {
  const token = await getUserToken();
  if (!token) return SIGN_IN;

  const message = input.message.trim();

  // A question or a concern goes to the college's Q&A flow: the team and the college admin both see it.
  if (input.kind !== "counsellor") {
    if (message.length < 10) return { ok: false, message: "Write a little more, at least 10 characters." };
    try {
      const result = await postQuestion(slug, { kind: input.kind === "concern" ? "concern" : "question", message }, token);
      revalidatePath("/account", "layout");
      return { ok: true, message: result.message };
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return SIGN_IN;
      return { ok: false, message: err instanceof ApiError ? err.message : "We could not send that just now. Please try again." };
    }
  }

  let profile;
  try {
    profile = await getMe(token);
  } catch {
    return SIGN_IN;
  }
  const phone = stripPhone(profile.phone || input.phone || "");
  const phoneError = phoneProblem(phone, true);
  if (phoneError) return { ok: false, message: phoneError };

  const jar = await cookies();
  const visitorId = jar.get(CONSENT_COOKIE)?.value === "granted" ? jar.get(VISITOR_COOKIE)?.value : undefined;
  try {
    await submitLead(
      {
        name: profile.name,
        phone,
        email: profile.email,
        collegeSlug: slug,
        type: "counselling",
        stream: profile.preferredStream ?? undefined,
        city: profile.city ?? undefined,
        message: `Counselling request: ${message || "Please call me about admissions."}`.slice(0, 1000),
        source: "college-counsellor",
        sourceUrl: input.sourceUrl,
        consent: true,
        visitorId,
      },
      token,
    );
    return { ok: true, message: "Thank you! A counsellor will call you within 24 hours." };
  } catch {
    return { ok: false, message: "We could not send that just now. Please try again." };
  }
}

export type ProfileChoices = { geo: IndiaGeo; streams: { slug: string; name: string }[]; exams: { slug: string; name: string }[] };

/** The lists behind the "one more step" dialog: the same ones the account page offers. A list that cannot load is empty, not an error. */
export async function getProfileChoices(): Promise<ProfileChoices> {
  const [geo, streams, exams] = await Promise.all([
    getIndiaGeo().catch(() => ({}) as IndiaGeo),
    getHomeData().then((h) => h.streams.map((s) => ({ slug: s.slug, name: s.name }))).catch(() => []),
    getExams({ limit: 100 }).then((r) => r.data.map((e) => ({ slug: e.slug, name: e.name }))).catch(() => []),
  ]);
  return { geo, streams, exams };
}

/** Saves where the student is and what they are looking for, the details a counsellor needs. Stream, state and city are required. */
export async function saveProfileDetails(input: { state: string; city: string; stream: string; exam: string }): Promise<EngageResult> {
  const token = await getUserToken();
  if (!token) return SIGN_IN;
  const state = input.state.trim();
  const city = input.city.trim();
  if (!state) return { ok: false, message: "Choose your state." };
  if (city.length < 2 || !/^[\p{L}\p{M}][\p{L}\p{M} .'’()-]*$/u.test(city)) return { ok: false, message: "Enter your city or district, in letters." };
  if (!input.stream.trim()) return { ok: false, message: "Choose the stream you are interested in." };
  try {
    await updateMe(token, {
      state: state.slice(0, 100),
      city: city.slice(0, 100),
      preferredStream: input.stream.trim().slice(0, 100),
      targetExam: input.exam.trim().slice(0, 100) || null,
    });
    return { ok: true, message: "Saved." };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return SIGN_IN;
    return { ok: false, message: "We could not save your details just now. Please try again." };
  }
}

/** The Q&A page's list, with the signed-in student's own "helpful" marks. A failure is an empty list, not an error page. */
export async function loadCollegeQuestions(slug: string): Promise<{ items: CollegeQuestion[]; signedIn: boolean }> {
  const token = await getUserToken();
  try {
    return { items: await getCollegeQuestions(slug, token), signedIn: !!token };
  } catch {
    return { items: [], signedIn: !!token };
  }
}

/** Marks a published answer helpful, or takes the mark back. Needs a signed-in student. */
export async function toggleHelpful(id: string): Promise<{ ok: true; helpful: number; helpfulByMe: boolean } | { ok: false; message: string; needsSignIn?: boolean }> {
  const token = await getUserToken();
  if (!token) return { ok: false, needsSignIn: true, message: "Please sign in to continue." };
  try {
    return { ok: true, ...(await postHelpful(id, token)) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, needsSignIn: true, message: "Please sign in to continue." };
    return { ok: false, message: err instanceof ApiError ? err.message : "Could not save that. Please try again." };
  }
}

/** Likes and dislikes on a college's reviews, with the signed-in student's own choice. A failure is an empty map. */
export async function loadReviewVotes(slug: string): Promise<Record<string, ReviewVotes>> {
  try {
    return await getReviewVotes(slug, await getUserToken());
  } catch {
    return {};
  }
}

/** Likes or dislikes a review; the same choice again takes it back. Needs a signed-in student. */
export async function voteReview(id: string, vote: "like" | "dislike"): Promise<({ ok: true } & ReviewVotes) | { ok: false; message: string; needsSignIn?: boolean }> {
  const token = await getUserToken();
  if (!token) return { ok: false, needsSignIn: true, message: "Please sign in to continue." };
  try {
    return { ok: true, ...(await postReviewVote(id, vote, token)) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, needsSignIn: true, message: "Please sign in to continue." };
    return { ok: false, message: err instanceof ApiError ? err.message : "Could not save that. Please try again." };
  }
}
