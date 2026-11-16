"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-session";
import {
  adminDeleteCommunity,
  adminDeletePost,
  adminDeleteReply,
  adminHidePost,
  adminHideReply,
  adminRestrictCommunity,
  adminSetStanding,
} from "@/lib/community-api";

/** The platform team's moderation of exam communities. Each returns the API's own sentence for the toast. */
export type ModerationResult = { ok: true; message: string } | { ok: false; message: string };

async function moderate(call: (token: string) => Promise<{ message: string }>): Promise<ModerationResult> {
  const token = await requireAdminToken();
  try {
    const { message } = await call(token);
    revalidatePath("/admin/community");
    revalidatePath("/exams/[slug]/community", "page");
    revalidatePath("/exams");
    return { ok: true, message };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    return { ok: false, message: err instanceof ApiError ? err.message : "That did not work. Try again." };
  }
}

export const hidePost = async (id: string, hidden: boolean, reason: string) => moderate((t) => adminHidePost(t, id, hidden, reason));
export const deletePost = async (id: string) => moderate((t) => adminDeletePost(t, id));
export const hideReply = async (id: string, hidden: boolean, reason: string) => moderate((t) => adminHideReply(t, id, hidden, reason));
export const deleteReply = async (id: string) => moderate((t) => adminDeleteReply(t, id));
export const restrictCommunity = async (id: string, restricted: boolean) => moderate((t) => adminRestrictCommunity(t, id, restricted));
export const deleteCommunity = async (id: string) => moderate((t) => adminDeleteCommunity(t, id));
export const setStanding = async (userId: string, change: { flagged?: boolean; blocked?: boolean; note?: string }) => moderate((t) => adminSetStanding(t, userId, change));
