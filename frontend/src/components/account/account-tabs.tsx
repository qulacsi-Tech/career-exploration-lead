"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account", label: "Profile" },
  { href: "/account/enquiries", label: "Enquiries" },
  { href: "/account/replies", label: "Replies" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/activity", label: "Activity" },
] as const;

/** The tab row under the account header. The Profile tab matches only its own path. */
export function AccountTabs({ enquiries, unreadReplies }: { enquiries: number; unreadReplies: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account sections" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((tab) => {
        const active = tab.href === "/account" ? pathname === "/account" : pathname.startsWith(tab.href);
        const badge =
          tab.label === "Enquiries" ? enquiries : tab.label === "Replies" ? unreadReplies : 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              active ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-brand"
            }`}
          >
            {tab.label}
            {badge > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  tab.label === "Replies" ? "bg-brand text-white" : "bg-bg-alt text-ink-soft"
                }`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
