"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ApiError,
  changeMyPassword,
  collegeGetPools,
  collegeGetRecord,
  collegeReplyToLead,
  collegeUpdateLeadStatus,
  LEAD_STATUSES,
  type CollegePools,
  type LeadStatus,
  type LoadedCollegeRecord,
} from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-session";

/**
 * What a college admin can do from the panel. Each call goes to an endpoint that
 * scopes everything to the college on their account, so nothing here names a
 * college: there is no way to ask for another one.
 */

type Result = { ok: true } | { error: string };

async function run<T>(call: (token: string) => Promise<T>, fallback: string): Promise<{ data: T } | { error: string }> {
  const token = await requireAdminToken();
  try {
    return { data: await call(token) };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      // 403 also means "choose a new password first" for a new account.
      if (err.status === 403 && /password/i.test(err.message)) redirect("/change-password");
      redirect("/login");
    }
    if (err instanceof ApiError) return { error: err.message };
    return { error: fallback };
  }
}

export async function loadMyCollegeRecord(): Promise<LoadedCollegeRecord | { error: string }> {
  const result = await run(collegeGetRecord, "Could not load your college. Try again.");
  return "data" in result ? result.data : result;
}

export async function loadMyCollegePools(): Promise<CollegePools | { error: string }> {
  const result = await run(collegeGetPools, "Could not load the lists. Try again.");
  return "data" in result ? result.data : result;
}

export async function collegeSetLeadStatus(id: string, status: string): Promise<Result> {
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) return { error: "Unknown status." };
  const result = await run((token) => collegeUpdateLeadStatus(token, id, status as LeadStatus), "Could not save. Try again.");
  if ("error" in result) return result;
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function collegeReply(id: string, body: string): Promise<Result> {
  const text = body.trim();
  if (text.length < 2) return { error: "Write a reply first." };
  const result = await run((token) => collegeReplyToLead(token, id, text), "Could not send the reply. Try again.");
  if ("error" in result) return result;
  revalidatePath("/admin/leads");
  return { ok: true };
}

export type PasswordState = { error?: string } | undefined;

/** Replaces the password: how a college admin leaves their temporary one behind. */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Enter your current password." };
  if (next.length < 8 || !/[a-zA-Z]/.test(next) || !/\d/.test(next))
    return { error: "The new password needs at least 8 characters, with a letter and a number." };
  if (next !== confirm) return { error: "The two new passwords do not match." };

  const token = await requireAdminToken();
  try {
    await changeMyPassword(token, current, next);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not change the password." };
  }
  redirect("/admin");
}
