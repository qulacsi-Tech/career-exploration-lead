"use client";

import { NotificationList } from "@/components/notifications/notification-list";
import { useNotifications } from "@/lib/use-notifications";

/** The full notifications page, for the admin panel and for students. Shows the latest 50, kept live. */
export function NotificationCenter({ live: keepSocket }: { live: boolean }) {
  const live = useNotifications({ enabled: true, live: keepSocket, withList: true, limit: 50 });

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {live.items === null ? (
        <p className="px-4 py-10 text-center text-sm text-ink-soft">{live.failed ? "Could not load notifications." : "Loading…"}</p>
      ) : (
        <NotificationList items={live.items} count={live.count} actions={live} />
      )}
    </div>
  );
}
