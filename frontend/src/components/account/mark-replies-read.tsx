"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markRepliesSeen } from "@/lib/auth-actions";

/**
 * Marks replies as read once the Replies tab is open, then refreshes so the tab
 * badge clears. The page keeps showing which ones were new for this visit.
 */
export function MarkRepliesRead({ unread }: { unread: number }) {
  const router = useRouter();

  useEffect(() => {
    if (unread === 0) return;
    markRepliesSeen()
      .then(() => router.refresh())
      .catch(() => undefined);
    // Once per visit: the refresh re-renders this with unread at 0.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
