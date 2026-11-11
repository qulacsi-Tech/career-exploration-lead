"use server";

import { revalidatePath } from "next/cache";
import { deleteMyMessage, markMyMessageRead } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";

/** Marks one of the student's messages read. Quietly does nothing when nobody is signed in. */
export async function markMessageRead(id: string): Promise<void> {
  const token = await getUserToken();
  if (!token) return;
  await markMyMessageRead(token, id).catch(() => undefined);
  revalidatePath("/account", "layout"); // the unread badge on the Messages tab
}

/** Removes a message from the student's inbox. */
export async function removeMessage(id: string): Promise<{ ok: boolean }> {
  const token = await getUserToken();
  if (!token) return { ok: false };
  try {
    await deleteMyMessage(token, id);
    revalidatePath("/account", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
