"use server";

import { subscribeNewsletter } from "@/lib/api";
import { emailProblem } from "@/lib/field-rules";
import { getUserToken } from "@/lib/user-session";

/** Subscribes an address to the weekly updates. Only a signed-in account can: the API checks the session too. */
export async function subscribeToNewsletter(email: string): Promise<{ ok: boolean; message: string }> {
  const token = await getUserToken();
  if (!token) return { ok: false, message: "Please sign in to subscribe." };
  const problem = emailProblem(email);
  if (problem) return { ok: false, message: problem };
  try {
    await subscribeNewsletter(email.trim().toLowerCase(), token);
    return { ok: true, message: "You are subscribed. Watch your inbox." };
  } catch (err) {
    return { ok: false, message: err instanceof Error && err.message ? err.message : "We could not subscribe you just now. Please try again." };
  }
}
