"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ApiError } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";
import {
  deleteCommunityPost,
  deleteCommunityReply,
  deleteJoin,
  getCommunityPosts,
  postCommunityPost,
  postCommunityReply,
  postJoin,
  putReaction,
  uploadCommunityImage,
  type CommunityPostsPage,
  type CommunityReply,
  type PostKind,
  type Reaction,
} from "@/lib/community-api";

/**
 * What a student does in an exam's community. Each call carries the student session from its httpOnly cookie, so
 * the token never reaches the browser. A missing or expired session comes back as `needsSignIn`, so the page can
 * send the person to sign in rather than fail quietly. The API decides everything else (blocked, not a member).
 */
export type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string; needsSignIn?: boolean };

const SIGN_IN = { ok: false as const, needsSignIn: true, message: "Please sign in to continue." };

async function run<T extends object>(call: (token: string) => Promise<T>, fallback: string): Promise<Result<T>> {
  const token = await getUserToken();
  if (!token) return SIGN_IN;
  try {
    return { ok: true, ...(await call(token)) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return SIGN_IN;
    return { ok: false, message: err instanceof ApiError ? err.message : fallback };
  }
}

const refresh = () => {
  // The post and member counts are on the exam pages (the Community tab) and the exams listing.
  updateTag("communities");
  revalidatePath("/exams/[slug]/community", "page");
  revalidatePath("/exams/[slug]", "page");
  revalidatePath("/exams");
};

/** More posts. Signed out, the API gives only the first few and says `locked`. */
export async function loadCommunityPosts(communityId: string, offset: number, kind: PostKind | null): Promise<Result<{ page: CommunityPostsPage }>> {
  const token = await getUserToken();
  try {
    return { ok: true, page: await getCommunityPosts(communityId, token, { offset, kind }) };
  } catch (err) {
    return { ok: false, message: err instanceof ApiError ? err.message : "Could not load posts. Please try again." };
  }
}

export async function joinCommunity(communityId: string, join: boolean) {
  const result = await run((t) => (join ? postJoin(communityId, t) : deleteJoin(communityId, t)), "Could not save that. Please try again.");
  if (result.ok) refresh();
  return result;
}

export async function createPost(communityId: string, input: { kind: PostKind; title: string; body: string; image: string }) {
  const result = await run((t) => postCommunityPost(communityId, input, t), "Could not post that. Please try again.");
  if (result.ok) refresh();
  return result;
}

export async function removeOwnPost(postId: string) {
  const result = await run((t) => deleteCommunityPost(postId, t), "Could not delete the post. Please try again.");
  if (result.ok) refresh();
  return result;
}

export async function replyToPost(postId: string, body: string): Promise<Result<{ reply: CommunityReply }>> {
  return run(async (t) => ({ reply: await postCommunityReply(postId, body, t) }), "Could not send your reply. Please try again.");
}

export async function removeOwnReply(replyId: string) {
  return run((t) => deleteCommunityReply(replyId, t), "Could not delete the reply. Please try again.");
}

export async function reactToPost(postId: string, reaction: Reaction | null) {
  return run((t) => putReaction(postId, reaction, t), "Could not save your reaction. Please try again.");
}

/** A picture for a post. The API checks it is a real image of a sensible size. */
export async function uploadPostImage(form: FormData): Promise<Result<{ url: string }>> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a picture first." };
  if (file.size > 4 * 1024 * 1024) return { ok: false, message: "The picture is larger than 4 MB. Choose a smaller one." };
  return run((t) => uploadCommunityImage(file, t), "Could not upload the picture. Please try again.");
}
