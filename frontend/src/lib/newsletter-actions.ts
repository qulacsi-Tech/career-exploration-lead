"use server";

import { newsletterStatus, subscribeNewsletter, unsubscribeNewsletter } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";
import { emailProblem } from "@/lib/field-rules";

/**
 * Subscribes an address to the weekly updates. No sign-in is needed: the API makes an account for an address that
 * has none (the owner sets a password later with "Forgot password" or by registering with the same email).
 */
export async function subscribeToNewsletter(email: string): Promise<{ ok: boolean; message: string }> {
  const problem = emailProblem(email);
  if (problem) return { ok: false, message: problem };
  try {
    await subscribeNewsletter(email.trim().toLowerCase());
    return { ok: true, message: "You are subscribed. Watch your inbox." };
  } catch (err) {
    return { ok: false, message: err instanceof Error && err.message ? err.message : "We could not subscribe you just now. Please try again." };
  }
}

/** Stops the weekly updates for an address. */
export async function unsubscribeFromNewsletter(email: string): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await unsubscribeNewsletter(email.trim().toLowerCase());
    return { ok: true, message: result.message };
  } catch (err) {
    return { ok: false, message: err instanceof Error && err.message ? err.message : "We could not unsubscribe you just now. Please try again." };
  }
}

/** For a signed-in visitor: their account's email and whether it is subscribed. `null` when nobody is signed in. */
export async function loadNewsletterStatus(): Promise<{ email: string; subscribed: boolean } | null> {
  const token = await getUserToken();
  if (!token) return null;
  try {
    return await newsletterStatus(token);
  } catch {
    return null;
  }
}
