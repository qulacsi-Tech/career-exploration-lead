"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { NotificationList } from "@/components/notifications/notification-list";
import { useNotifications } from "@/lib/use-notifications";

/**
 * The bell: a count, and a dropdown of the latest notifications.
 *
 * Opening it marks everything as seen, but anything that still asks for an acknowledgement keeps
 * the count up (and the badge red) until it is acknowledged. `viewAllHref` is the full page for
 * this audience: the admin panel's or the student's. `live` keeps a socket open for instant updates;
 * pass it for staff only (see use-notifications.ts for why).
 */
export function NotificationBell({ viewAllHref, live: keepSocket, tone = "light" }: { viewAllHref: string; live: boolean; tone?: "light" | "plain" }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const live = useNotifications({ enabled: true, live: keepSocket, withList: open });

  const badge = Math.max(live.count.unread, live.count.pendingAck);

  // Seen once the list is on screen.
  const { markRead } = live;
  useEffect(() => {
    if (open && live.items && live.count.unread > 0) void markRead();
  }, [open, live.items, live.count.unread, markRead]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={panel} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={badge > 0 ? `Notifications, ${badge} need your attention` : "Notifications"}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition hover:border-brand hover:text-brand ${
          tone === "light" ? "border-line bg-surface text-ink-soft" : "border-line text-ink-soft"
        }`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {badge > 0 && (
          <span
            className={`absolute -right-1 -top-1 min-w-[1.1rem] rounded-full px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white ${
              live.count.pendingAck > 0 ? "bg-red-600" : "bg-brand"
            }`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-display text-sm font-bold text-ink">Notifications</h2>
            <Link href={viewAllHref} onClick={() => setOpen(false)} className="text-xs font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="max-h-[26rem] overflow-y-auto">
            {live.items === null ? (
              <p className="px-4 py-8 text-center text-sm text-ink-soft">{live.failed ? "Could not load notifications." : "Loading…"}</p>
            ) : (
              <NotificationList items={live.items} count={live.count} actions={live} onNavigate={() => setOpen(false)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
