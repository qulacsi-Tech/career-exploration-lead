"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bookmark,
  HelpCircle,
  Mail,
  MessageSquareReply,
  Send,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";

type Tab = { href: string; label: string; icon: LucideIcon };

/** The account's sections, in the order the tab bar shows them. A divider sits between groups. */
const GROUPS: Tab[][] = [
  [
    { href: "/account", label: "Profile", icon: UserRound },
    { href: "/account/saved", label: "Saved", icon: Bookmark },
    { href: "/account/activity", label: "Activity", icon: Activity },
  ],
  [
    { href: "/account/messages", label: "Messages", icon: Mail },
    { href: "/account/replies", label: "Replies", icon: MessageSquareReply },
    { href: "/account/notifications", label: "Notifications", icon: Bell },
  ],
  [
    { href: "/account/enquiries", label: "Enquiries", icon: Send },
    { href: "/account/questions", label: "Questions", icon: HelpCircle },
    { href: "/account/reviews", label: "Reviews", icon: Star },
  ],
];

export type AccountCounts = { enquiries: number; unreadReplies: number; questions?: number; reviews?: number; saved?: number; unreadMessages?: number };

/** The count beside a tab, and whether it means "new" (filled) or is a plain total. */
function badgeOf(label: string, c: AccountCounts): { n: number; urgent: boolean } {
  switch (label) {
    case "Messages":
      return { n: c.unreadMessages ?? 0, urgent: true };
    case "Replies":
      return { n: c.unreadReplies, urgent: true };
    case "Enquiries":
      return { n: c.enquiries, urgent: false };
    case "Questions":
      return { n: c.questions ?? 0, urgent: false };
    case "Reviews":
      return { n: c.reviews ?? 0, urgent: false };
    case "Saved":
      return { n: c.saved ?? 0, urgent: false };
    default:
      return { n: 0, urgent: false };
  }
}

/**
 * The account's tab bar: one row across the top of the panel, each tab with an icon and its count. When the row is
 * wider than the screen it scrolls sideways and keeps the open tab in view. The Profile tab matches only its own path.
 */
export function AccountTabs(counts: AccountCounts) {
  const pathname = usePathname();
  const rail = useRef<HTMLUListElement>(null);
  const isActive = (href: string) => (href === "/account" ? pathname === "/account" : pathname.startsWith(href));

  useEffect(() => {
    const el = rail.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (rail.current && el) rail.current.scrollTo({ left: el.offsetLeft - rail.current.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [pathname]);

  return (
    <nav aria-label="Account sections" className="border-b border-line">
      <ul ref={rail} className="flex items-stretch overflow-x-auto px-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
        {GROUPS.map((group, gi) => (
          <li key={gi} className="flex shrink-0 items-stretch">
            {gi > 0 && <span aria-hidden="true" className="mx-1.5 my-3 w-px bg-line" />}
            <ul className="flex items-stretch">
              {group.map((tab) => {
                const active = isActive(tab.href);
                const { n, urgent } = badgeOf(tab.label, counts);
                const Icon = tab.icon;
                return (
                  <li key={tab.href} className="shrink-0">
                    <Link
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex h-full items-center gap-2 whitespace-nowrap px-3 py-3.5 text-sm transition ${
                        active ? "font-bold text-brand-ink" : "font-medium text-ink-soft hover:text-ink"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-brand" : ""}`} aria-hidden="true" />
                      {tab.label}
                      {n > 0 && (
                        <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${urgent ? "bg-brand text-white" : "bg-bg-alt text-ink-soft"}`}>
                          {n}
                        </span>
                      )}
                      {active && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-brand" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
