"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationCount, NotificationItem } from "@/lib/api";
import {
  acknowledgeAll,
  acknowledgeOne,
  clearAll,
  clearOne,
  fetchNotificationCount,
  fetchNotifications,
  getSocketTicket,
  markAllNotificationsRead,
} from "@/lib/notification-actions";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const SOCKET_URL = `${API.replace(/^http/, "ws")}/ws`;
/** If the socket cannot connect at all, the count is still refreshed this often. */
const POLL_MS = 60_000;

/** Whether a notification is still asking the person to acknowledge it. */
export const isWaiting = (n: NotificationItem) => n.requiresAck && !n.acknowledgedAt;

/**
 * A person's notifications, kept current.
 *
 * A WebSocket tells the page when something changed; the page then re-reads the real data, so the
 * socket carries no content and a missed message only delays an update. If the socket cannot be
 * opened (blocked network, server restarting) it retries with a growing delay and a slow poll
 * keeps the count right in the meantime.
 *
 * `withList` loads the notifications themselves, not just the counts. Pass it while the list is
 * on screen.
 */
export function useNotifications({ enabled, withList, limit = 20 }: { enabled: boolean; withList: boolean; limit?: number }) {
  const [count, setCount] = useState<NotificationCount>({ unread: 0, pendingAck: 0 });
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const wantList = useRef(withList);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [counts, list] = await Promise.all([fetchNotificationCount(), wantList.current ? fetchNotifications(limit) : Promise.resolve(null)]);
    if (counts.ok) setCount(counts.data);
    if (list?.ok) setItems(list.data);
    setFailed(!counts.ok || (list ? !list.ok : false));
  }, [limit]);

  // Several events in a burst become one read.
  const refresh = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      void load();
    }, 150);
  }, [load]);

  // The first read, and again whenever the list is opened. The ref is set first so `load` sees the new value.
  useEffect(() => {
    wantList.current = withList;
    if (enabled) void load();
  }, [enabled, withList, load]);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let socket: WebSocket | null = null;
    let retry = 0;
    let reconnect: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      const ticket = await getSocketTicket();
      if (stopped) return;
      if (!ticket) {
        // Signed out, or the server is not answering. Look again later.
        reconnect = setTimeout(connect, Math.min(30_000, 2000 * 2 ** retry++));
        return;
      }
      socket = new WebSocket(`${SOCKET_URL}?ticket=${encodeURIComponent(ticket)}`);
      socket.onopen = () => {
        retry = 0;
        refresh();
      };
      socket.onmessage = refresh;
      socket.onclose = () => {
        socket = null;
        if (!stopped) reconnect = setTimeout(connect, Math.min(30_000, 1000 * 2 ** retry++));
      };
    };
    void connect();

    const poll = setInterval(refresh, POLL_MS);
    // Coming back to a tab that sat in the background: catch up straight away.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      if (reconnect) clearTimeout(reconnect);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      socket?.close();
    };
  }, [enabled, refresh]);

  return {
    count,
    items,
    failed,
    refresh,
    markRead: async () => {
      await markAllNotificationsRead();
      refresh();
    },
    acknowledge: async (id: string) => {
      await acknowledgeOne(id);
      refresh();
    },
    acknowledgeEverything: async () => {
      await acknowledgeAll();
      refresh();
    },
    clear: async (id: string) => {
      await clearOne(id);
      refresh();
    },
    clearEverything: async () => {
      await clearAll();
      refresh();
    },
  };
}
