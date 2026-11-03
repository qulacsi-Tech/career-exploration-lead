"use server";

import { submitPractice } from "@/lib/api";

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
