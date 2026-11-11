"use server";

import { deleteSavedCollege, getMySavedSlugs, putSavedCollege } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";

/** The slugs of the colleges the signed-in student saved. `null` when nobody is signed in. */
export async function loadSavedSlugs(): Promise<string[] | null> {
  const token = await getUserToken();
  if (!token) return null;
  try {
    return await getMySavedSlugs(token);
  } catch {
    return null;
  }
}

/** Saves a college to the signed-in student's profile, or takes it off the list. */
export async function setCollegeSaved(slug: string, saved: boolean): Promise<{ ok: boolean; message?: string }> {
  const token = await getUserToken();
  if (!token) return { ok: false, message: "Please sign in to save colleges." };
  try {
    if (saved) await putSavedCollege(token, slug);
    else await deleteSavedCollege(token, slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error && err.message ? err.message : "We could not update your saved colleges. Please try again." };
  }
}
