"use server";

import { getAttemptStatus, getExamLeaderboard, getExamStats, submitPractice, type ExamLeaderboard, type ExamStats } from "@/lib/api";

type AttemptResult = Awaited<ReturnType<typeof submitPractice>>;
import { getUserToken } from "@/lib/user-session";

/**
 * Sends a finished paper to be scored. It goes from the signed-in account (the token never reaches the browser),
 * and the API refuses it without one.
 */
export async function submitPracticeAttempt(
  slug: string,
  responses: Record<string, { status: string; saved?: unknown; secondsSpent: number }>,
): Promise<{ ok: true; result: AttemptResult } | { ok: false; needsSignIn?: boolean; message: string }> {
  const token = await getUserToken();
  if (!token) return { ok: false, needsSignIn: true, message: "Please sign in to submit your test." };
  try {
    return { ok: true, result: await submitPractice(slug, responses, token) };
  } catch (err) {
    return { ok: false, message: err instanceof Error && err.message ? err.message : "We could not submit your test just now." };
  }
}

/** The signed-in student's attempts on a test: allowed, used, left. `null` when nobody is signed in. */
export async function loadAttemptStatus(slug: string): Promise<{ allowed: number | null; used: number; left: number | null } | null> {
  const token = await getUserToken();
  if (!token) return null;
  try {
    return await getAttemptStatus(token, slug);
  } catch {
    return null;
  }
}

/** An exam's practice statistics, with where the signed-in student stands (when there is one). `null` when unavailable. */
export async function loadExamStats(examSlug: string): Promise<ExamStats | null> {
  const token = await getUserToken();
  try {
    return await getExamStats(examSlug, token);
  } catch {
    return null;
  }
}

/** An exam's practice leaderboard, with the signed-in student's own row marked. `null` when unavailable. */
export async function loadExamLeaderboard(examSlug: string): Promise<ExamLeaderboard | null> {
  const token = await getUserToken();
  try {
    return await getExamLeaderboard(examSlug, token);
  } catch {
    return null;
  }
}
