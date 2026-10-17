import type { Metadata } from "next";
import Link from "next/link";
import { Eye, LogIn, MessageSquare, MousePointerClick, Send, UserPlus, type LucideIcon } from "lucide-react";
import { getMyActivity, type MyActivity } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";
import { formatFull } from "@/lib/lead-labels";

export const metadata: Metadata = {
  title: "Activity — TopCollegePath",
  robots: { index: false, follow: false },
};

const ICON: Record<MyActivity["kind"], LucideIcon> = {
  account_created: UserPlus,
  login: LogIn,
  enquiry_sent: Send,
  reply_received: MessageSquare,
  page_view: Eye,
  click: MousePointerClick,
};

/** A timeline of what the student has done on the site, newest first. */
export default async function ActivityPage() {
  const token = await getUserToken();
  const items = token ? await getMyActivity(token).catch(() => null) : [];

  if (items === null) {
    return <p className="text-sm text-red-700">We could not load your activity just now. Please refresh in a moment.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-line pl-6">
      {items.map((item, index) => {
        const Icon = ICON[item.kind];
        return (
          <li key={`${item.kind}-${item.at}-${index}`} className="relative">
            <span className="absolute -left-[2.15rem] flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-brand">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm font-semibold text-ink">
              {item.href ? (
                <Link href={item.href} className="hover:text-brand hover:underline">
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </p>
            {item.detail && <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{item.detail}</p>}
            <p className="mt-0.5 text-xs text-ink-faint">{formatFull(item.at)}</p>
          </li>
        );
      })}
    </ol>
  );
}
