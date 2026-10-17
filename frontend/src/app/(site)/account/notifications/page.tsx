import type { Metadata } from "next";
import { NotificationCenter } from "@/components/notifications/notification-center";

export const metadata: Metadata = {
  title: "Notifications — TopCollegePath",
  robots: { index: false, follow: false },
};

/** Replies to enquiries and other news for the student, kept live. The layout has already required a session. */
export default function AccountNotificationsPage() {
  return <NotificationCenter />;
}
