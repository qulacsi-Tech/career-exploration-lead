"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationCount, NotificationItem } from "@/lib/api";
import {
  acknowledgeAll,
  acknowledgeOne,
  clearAll,
  clearOne,
  fetchNotificationState,
  getSocketTicket,
  markAllNotificationsRead,
} from "@/lib/notification-actions";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const SOCKET_URL = `${API.replace(/^http/, "ws")}/ws`;

/** Only when the socket is down: how often to look, and only while the tab is on screen. */
const POLL_WHEN_OFFLINE_MS = 120_000;
/** A tab hidden this long drops its socket, and reconnects when it is shown again. */
const HIDDEN_CLOSE_MS = 5 * 60_000;
/** Coming back to a tab refreshes it, but not more often than this. */
const MIN_GAP_MS = 30_000;

/** Whether a notification is still asking the person to acknowledge it. */
export const isWaiting = (n: NotificationItem) => n.requiresAck && !n.acknowledgedAt;

/**
 * A person's notifications, read only when there is a reason to.
 *
 * Nothing is polled while the socket is up. The server announces a change (see services/notify.py)
 * and the page reads once, so the traffic is proportional to what actually happens. The reasons to
 * read are: the page loading, a message over the socket, the list being opened, and the tab coming
 * back into view after a while.
 *
 * - `live` opens the socket. Staff get it, because a request or a message should reach them at once.
 *   A student does not: replies to an enquiry are rare and can wait for the next page or tab visit,
 *   and most visitors are students, so this is what keeps the number of open connections small.
 * - A tab hidden for five minutes lets its socket go and picks it up again when shown.
 * - If the socket cannot connect, it retries with a growing delay and looks every two minutes while
 *   the tab is visible.
 *
 * `withList` loads the notifications themselves, not just the counts. Pass it while the list is on screen.
 */
export function useNotifications({
  enabled,
  live,
  withList,
  limit = 20,
}: {
  enabled: boolean;
  live: boolean;
  withList: boolean;
  limit?: number;
}) {
  const [count, setCount] = useState<NotificationCount>({ unread: 0, pendingAck: 0 });
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const wantList = useRef(withList);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoad = useRef(0);

  const load = useCallback(async () => {
    lastLoad.current = Date.now();
    const result = await fetchNotificationState(wantList.current, limit);
    if (result.ok) {
      setCount(result.data.count);
      if (result.data.items) setItems(result.data.items);
    }
    setFailed(!result.ok);
  }, [limit]);

  // Several events in a burst become one read.
  const refresh = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      void load();
    }, 150);
  }, [load]);

  // The first read, and again when the list is opened. The ref is set first so `load` sees the new value.
  useEffect(() => {
    wantList.current = withList;
    if (enabled) void load();
  }, [enabled, withList, load]);

  // Coming back to a tab after a while.
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoad.current > MIN_GAP_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, refresh]);

  // The socket, for staff.
  useEffect(() => {
    if (!enabled || !live) return;
    let stopped = false;
    let socket: WebSocket | null = null;
    let open = false;
    let retry = 0;
    let reconnect: ReturnType<typeof setTimeout> | null = null;
    let hiddenFor: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (stopped || socket || document.visibilityState === "hidden") return;
      const ticket = await getSocketTicket();
      if (stopped || socket) return;
      if (!ticket) {
        // Signed out, or the server is not answering. Look again later.
        reconnect = setTimeout(connect, Math.min(60_000, 3000 * 2 ** retry++));
        return;
      }
      const s = new WebSocket(`${SOCKET_URL}?ticket=${encodeURIComponent(ticket)}`);
      socket = s;
      s.onopen = () => {
        open = true;
        retry = 0;
        refresh(); // anything that happened while it was down
      };
      s.onmessage = refresh;
      s.onclose = () => {
        open = false;
        if (socket === s) socket = null;
        if (!stopped && document.visibilityState === "visible") reconnect = setTimeout(connect, Math.min(60_000, 1000 * 2 ** retry++));
      };
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenFor = setTimeout(() => socket?.close(), HIDDEN_CLOSE_MS);
      } else {
        if (hiddenFor) clearTimeout(hiddenFor);
        void connect();
      }
    };

    void connect();
    document.addEventListener("visibilitychange", onVisibility);
    // Only worth doing while there is no socket to tell us, and only while someone can see the page.
    const poll = setInterval(() => {
      if (!open && document.visibilityState === "visible") refresh();
    }, POLL_WHEN_OFFLINE_MS);

    return () => {
      stopped = true;
      if (reconnect) clearTimeout(reconnect);
      if (hiddenFor) clearTimeout(hiddenFor);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      socket?.close();
    };
  }, [enabled, live, refresh]);

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
