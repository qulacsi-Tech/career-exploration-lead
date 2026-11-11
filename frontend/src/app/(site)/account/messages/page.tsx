import type { Metadata } from "next";
import { getMyMessages } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";
import { MessageInbox } from "@/components/account/message-inbox";

export const metadata: Metadata = {
  title: "Messages — TopCollegePath",
  robots: { index: false, follow: false },
};

/** Messages from the TopCollegePath team: newsletters to every subscriber and notes sent to this student. */
export default async function MessagesPage() {
  const token = await getUserToken();
  const inbox = token ? await getMyMessages(token).catch(() => null) : { items: [], unread: 0 };

  if (inbox === null) {
    return <p className="text-sm text-red-700">We could not load your messages just now. Please refresh in a moment.</p>;
  }
  if (inbox.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="font-display text-lg font-bold text-ink">No messages yet</p>
        <p className="mt-1 text-sm text-ink-soft">Updates from the TopCollegePath team land here. Subscribe in the site footer to get exam dates and deadlines.</p>
      </div>
    );
  }
  return <MessageInbox messages={inbox.items} />;
}
