"use server";

import {
  acknowledgeAllNotifications,
  acknowledgeNotification,
  clearAllNotifications,
  clearNotification,
  createSocketTicket,
  getNotificationCount,
  getNotifications,
  markNotificationsRead,
  type NotificationCount,
  type NotificationItem,
} from "@/lib/api";
import { getAdminToken } from "@/lib/admin-session";
import { getUserToken } from "@/lib/user-session";

/**
 * The browser never holds a login token, so every notification call goes through here, where the
 * httpOnly cookie can be read. A person has the student cookie, the admin cookie, or both (staff
 * have both); either proves who they are, and the API only ever answers about that person.
 */

async function token(): Promise<string | null> {
  return (await getUserToken()) ?? (await getAdminToken());
}

type Result<T> = { ok: true; data: T } | { ok: false };

async function run<T>(call: (token: string) => Promise<T>): Promise<Result<T>> {
  const t = await token();
  if (!t) return { ok: false };
  try {
    return { ok: true, data: await call(t) };
  } catch {
    return { ok: false };
  }
}

// Each is an `async function`: a Server Actions file may export nothing else.

/**
 * The counts and, when the list is on screen, the notifications themselves, in one round trip. The
 * browser used to ask for each separately; a Server Action is a request to the Next server and then
 * another to the API, so halving them halves the work on both.
 */
export async function fetchNotificationState(
  withList: boolean,
  limit = 20,
): Promise<Result<{ count: NotificationCount; items: NotificationItem[] | null }>> {
  return run(async (t) => {
    const [count, items] = await Promise.all([getNotificationCount(t), withList ? getNotifications(t, limit) : Promise.resolve(null)]);
    return { count, items };
  });
}

export async function markAllNotificationsRead(): Promise<Result<{ ok: true }>> {
  return run(markNotificationsRead);
}

export async function acknowledgeOne(id: string): Promise<Result<{ ok: true }>> {
  return run((t) => acknowledgeNotification(t, id));
}

export async function acknowledgeAll(): Promise<Result<{ ok: true }>> {
  return run(acknowledgeAllNotifications);
}

export async function clearOne(id: string): Promise<Result<{ ok: true }>> {
  return run((t) => clearNotification(t, id));
}

export async function clearAll(): Promise<Result<{ ok: true }>> {
  return run(clearAllNotifications);
}

/** A one-minute ticket for opening the live-update socket. Null when nobody is signed in. */
export async function getSocketTicket(): Promise<string | null> {
  const result = await run(createSocketTicket);
  return result.ok ? result.data.ticket : null;
}
