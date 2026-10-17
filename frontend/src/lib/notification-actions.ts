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

export const fetchNotifications = (limit = 20): Promise<Result<NotificationItem[]>> => run((t) => getNotifications(t, limit));
export const fetchNotificationCount = (): Promise<Result<NotificationCount>> => run(getNotificationCount);
export const markAllNotificationsRead = () => run(markNotificationsRead);
export const acknowledgeOne = (id: string) => run((t) => acknowledgeNotification(t, id));
export const acknowledgeAll = () => run(acknowledgeAllNotifications);
export const clearOne = (id: string) => run((t) => clearNotification(t, id));
export const clearAll = () => run(clearAllNotifications);

/** A one-minute ticket for opening the live-update socket. Null when nobody is signed in. */
export async function getSocketTicket(): Promise<string | null> {
  const result = await run(createSocketTicket);
  return result.ok ? result.data.ticket : null;
}
